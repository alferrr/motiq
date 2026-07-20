import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId, getSession } from "@/lib/session";
import { z } from "zod";
import { createInvoiceForJob } from "@/lib/invoices";
import { sendEmail } from "@/lib/email";
import { jobUpdatedEmail } from "@/lib/emailTemplates";

const UpdateSchema = z.object({
  mechanicId: z.coerce.number().optional(),
  status: z
    .enum(["Pending", "In Progress", "Completed", "Released"])
    .optional(),
  diagnosis: z.string().optional(),
  laborHours: z.coerce.number().min(0).optional(),
  reportedIssue: z.string().optional(),
  serviceIds: z.array(z.number()).optional(),
  parts: z
    .array(z.object({ partId: z.number(), quantity: z.number().min(1) }))
    .optional(),
});

const STATUS_ORDER = ["Pending", "In Progress", "Completed", "Released"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [[job]]: any = await pool.query(
      `SELECT
         rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue, rj.Diagnosis, rj.LaborHours, rj.CreatedAt,
         c.FullName   AS customerName, c.ContactNumber AS customerContact,
         v.Make, v.Model, v.Year, v.PlateNumber, v.Color,
         m.Mechanic_ID,
         u.FullName   AS mechanicName, u.User_ID
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User     u ON u.User_ID     = m.User_ID
       WHERE rj.Job_ID = ? AND c.Company_ID = ? LIMIT 1`,
      [id, companyId],
    );
    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const [services]: any = await pool.query(
      `SELECT sc.Service_ID, sc.ServiceName, sc.Category, sc.LaborRate
       FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       WHERE js.Job_ID = ? AND sc.Company_ID = ?`,
      [id, companyId],
    );

    const [parts]: any = await pool.query(
      `SELECT jp.Part_ID, jp.QuantityUsed, pi.PartName, pi.SKU, pi.UnitPrice
       FROM JobParts jp
       JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
       WHERE jp.Job_ID = ? AND pi.Company_ID = ?`,
      [id, companyId],
    );

    const totalLabor = services.reduce(
      (sum: number, s: any) => sum + Number(s.LaborRate),
      0,
    );
    const totalParts = parts.reduce(
      (sum: number, p: any) => sum + Number(p.UnitPrice) * p.QuantityUsed,
      0,
    );

    return NextResponse.json({ job, services, parts, totalLabor, totalParts });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const conn = await (pool as any).getConnection();
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = session.companyId;

    const body = UpdateSchema.parse(await request.json());

    // also doubles as an ownership check — Job_ID alone doesn't prove it
    // belongs to this company
    const [[existing]]: any = await conn.query(
      `SELECT rj.Status AS previousStatus, rj.Diagnosis AS previousDiagnosis,
              rj.Mechanic_ID AS previousMechanicId
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE rj.Job_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [id, companyId],
    );
    if (!existing) {
      conn.release();
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Mechanics may only update jobs assigned to them
    if (session.role === "Mechanic") {
      const [[mechanicSelf]]: any = await conn.query(
        "SELECT Mechanic_ID FROM Mechanic WHERE User_ID = ? LIMIT 1",
        [session.id],
      );
      if (
        !mechanicSelf ||
        mechanicSelf.Mechanic_ID !== existing.previousMechanicId
      ) {
        conn.release();
        return NextResponse.json(
          { error: "You can only update job orders assigned to you" },
          { status: 403 },
        );
      }
    }

    // status must move forward one step at a time (or stay the same)
    if (body.status !== undefined) {
      const fromIdx = STATUS_ORDER.indexOf(existing.previousStatus);
      const toIdx = STATUS_ORDER.indexOf(body.status);
      if (toIdx !== fromIdx && toIdx !== fromIdx + 1) {
        conn.release();
        return NextResponse.json(
          {
            error: `Cannot move a job from "${existing.previousStatus}" to "${body.status}"`,
          },
          { status: 400 },
        );
      }
    }

    // once a job is invoiced, its billable work items are frozen
    if (body.serviceIds !== undefined || body.parts !== undefined) {
      const [[invoiceRow]]: any = await conn.query(
        "SELECT Invoice_ID FROM Invoice WHERE Job_ID = ? LIMIT 1",
        [id],
      );
      if (invoiceRow) {
        conn.release();
        return NextResponse.json(
          {
            error:
              "This job has already been invoiced; services and parts are frozen and can no longer be edited.",
          },
          { status: 400 },
        );
      }
    }

    // verify the mechanic belongs to this company
    if (body.mechanicId !== undefined) {
      const [[mechanic]]: any = await conn.query(
        `SELECT m.Mechanic_ID FROM Mechanic m
         JOIN User u ON u.User_ID = m.User_ID
         WHERE m.Mechanic_ID = ? AND u.Company_ID = ?
         LIMIT 1`,
        [body.mechanicId, companyId],
      );
      if (!mechanic) {
        conn.release();
        return NextResponse.json(
          { error: "Mechanic not found" },
          { status: 404 },
        );
      }
    }

    // verify services belong to this company
    if (body.serviceIds !== undefined && body.serviceIds.length) {
      const uniqueServiceIds = [...new Set(body.serviceIds)];
      const [[{ cnt: serviceCnt }]]: any = await conn.query(
        `SELECT COUNT(*) AS cnt FROM ServiceCatalog WHERE Company_ID = ? AND Service_ID IN (?)`,
        [companyId, uniqueServiceIds],
      );
      if (Number(serviceCnt) !== uniqueServiceIds.length) {
        conn.release();
        return NextResponse.json(
          { error: "One or more services not found" },
          { status: 400 },
        );
      }
    }

    // verify parts belong to this company; keep a name map for the
    // insufficient-stock error message below
    const partNameById = new Map<number, string>();
    if (body.parts !== undefined && body.parts.length) {
      const uniquePartIds = [...new Set(body.parts.map((p) => p.partId))];
      const [partRows]: any = await conn.query(
        `SELECT Part_ID, PartName FROM PartsInventory WHERE Company_ID = ? AND Part_ID IN (?)`,
        [companyId, uniquePartIds],
      );
      if (partRows.length !== uniquePartIds.length) {
        conn.release();
        return NextResponse.json(
          { error: "One or more parts not found" },
          { status: 400 },
        );
      }
      for (const r of partRows) partNameById.set(r.Part_ID, r.PartName);
    }

    await conn.beginTransaction();

    // update core fields
    const fieldMap: Record<string, string> = {
      mechanicId: "Mechanic_ID",
      status: "Status",
      diagnosis: "Diagnosis",
      laborHours: "LaborHours",
      reportedIssue: "ReportedIssue",
    };
    const coreFields = Object.entries(body).filter(
      ([k, v]) => v !== undefined && !["serviceIds", "parts"].includes(k),
    );
    if (coreFields.length) {
      const setClauses = coreFields
        .map(([k]) => `${fieldMap[k]} = ?`)
        .join(", ");
      const values = coreFields.map(([, v]) => v);
      await conn.query(`UPDATE RepairJob SET ${setClauses} WHERE Job_ID = ?`, [
        ...values,
        id,
      ]);
    }

    // replace services
    let oldServiceIds: number[] = [];
    if (body.serviceIds !== undefined) {
      const [oldServices]: any = await conn.query(
        "SELECT Service_ID FROM JobService WHERE Job_ID = ?",
        [id],
      );
      oldServiceIds = oldServices.map((s: any) => s.Service_ID);

      await conn.query("DELETE FROM JobService WHERE Job_ID = ?", [id]);
      if (body.serviceIds.length) {
        const rows = body.serviceIds.map((sid) => [id, sid]);
        await conn.query(
          "INSERT INTO JobService (Job_ID, Service_ID) VALUES ?",
          [rows],
        );
      }
    }

    // replace parts + deduct inventory
    let oldParts: { Part_ID: number; QuantityUsed: number }[] = [];
    if (body.parts !== undefined) {
      // restore old quantities first
      const [oldPartsRows]: any = await conn.query(
        "SELECT Part_ID, QuantityUsed FROM JobParts WHERE Job_ID = ?",
        [id],
      );
      oldParts = oldPartsRows;
      for (const p of oldParts) {
        await conn.query(
          "UPDATE PartsInventory SET StockQuantity = StockQuantity + ? WHERE Part_ID = ?",
          [p.QuantityUsed, p.Part_ID],
        );
      }
      await conn.query("DELETE FROM JobParts WHERE Job_ID = ?", [id]);

      if (body.parts.length) {
        const rows = body.parts.map((p) => [id, p.partId, p.quantity]);
        await conn.query(
          "INSERT INTO JobParts (Job_ID, Part_ID, QuantityUsed) VALUES ?",
          [rows],
        );
        for (const p of body.parts) {
          const [updateResult]: any = await conn.query(
            "UPDATE PartsInventory SET StockQuantity = StockQuantity - ? WHERE Part_ID = ? AND StockQuantity >= ?",
            [p.quantity, p.partId, p.quantity],
          );
          if (updateResult.affectedRows === 0) {
            throw new Error(
              `INSUFFICIENT_STOCK:${partNameById.get(p.partId) ?? p.partId}`,
            );
          }
        }
      }
    }

    await conn.commit();

    // Notify the customer about this update. Runs after the commit, so a
    // failure here must not turn an already-successful job update into a 500.
    const isFirstCompletion =
      body.status === "Completed" && existing.previousStatus !== "Completed";
    try {
      if (isFirstCompletion) {
        // auto-generate the invoice the moment a job first becomes Completed —
        // createInvoiceForJob no-ops if one already exists, and emails the
        // customer an invoice with a Kasa "Pay Now" link when there's a
        // balance due. This *is* the notification for this transition, so we
        // skip the generic job-updated email below to avoid double-emailing.
        await createInvoiceForJob(companyId, Number(id), request.nextUrl.origin);
      } else {
        // the template always shows the job's current status as a fixed
        // field, so a status change is tracked separately here rather than
        // duplicated into `changes` (which lists everything else that moved)
        const statusChanged =
          body.status !== undefined && body.status !== existing.previousStatus;

        // only report a field as "changed" when its value actually differs
        // from what was already stored — the update form always resubmits
        // diagnosis/services/parts on every save, so presence-in-body alone
        // would fire an email on every no-op save
        const diagnosisChanged =
          body.diagnosis !== undefined &&
          body.diagnosis.trim() !== (existing.previousDiagnosis ?? "").trim();
        const mechanicChanged =
          body.mechanicId !== undefined &&
          body.mechanicId !== existing.previousMechanicId;
        const servicesChanged =
          body.serviceIds !== undefined &&
          setsDiffer(oldServiceIds, body.serviceIds);
        const partsChanged =
          body.parts !== undefined &&
          partsDiffer(oldParts, body.parts);

        const changes: { label: string; value: string }[] = [];
        if (diagnosisChanged && body.diagnosis?.trim())
          changes.push({ label: "Diagnosis", value: body.diagnosis });
        if (mechanicChanged)
          changes.push({ label: "Mechanic", value: "Reassigned" });
        if (servicesChanged || partsChanged)
          changes.push({ label: "Work Items", value: "Services/parts updated" });

        if (statusChanged || changes.length) {
          const [[recipient]]: any = await pool.query(
            `SELECT rj.Status AS currentStatus,
                    c.FullName AS customerName, c.Email AS customerEmail,
                    v.Make, v.Model,
                    u.FullName AS mechanicName,
                    co.Name AS companyName, co.ThemeColor,
                    co.Email AS companyEmail, co.ContactNumber AS companyContact, co.Address AS companyAddress
             FROM RepairJob rj
             JOIN Vehicle  v  ON v.Vehicle_ID  = rj.Vehicle_ID
             JOIN Customer c  ON c.Customer_ID = v.Customer_ID
             JOIN Company  co ON co.Company_ID = c.Company_ID
             JOIN Mechanic m  ON m.Mechanic_ID = rj.Mechanic_ID
             JOIN User     u  ON u.User_ID     = m.User_ID
             WHERE rj.Job_ID = ? AND c.Company_ID = ?
             LIMIT 1`,
            [id, companyId],
          );
          if (recipient?.customerEmail) {
            const mechanicChange = changes.find((c) => c.label === "Mechanic");
            if (mechanicChange) mechanicChange.value = recipient.mechanicName;

            const { subject, html } = jobUpdatedEmail({
              companyName: recipient.companyName,
              themeColor: recipient.ThemeColor,
              companyEmail: recipient.companyEmail,
              companyContact: recipient.companyContact,
              companyAddress: recipient.companyAddress,
              customerName: recipient.customerName,
              jobId: Number(id),
              vehicle: `${recipient.Make} ${recipient.Model}`,
              status: recipient.currentStatus,
              changes,
            });
            await sendEmail({ to: recipient.customerEmail, subject, html });
          }
        }
      }
    } catch (notifyErr) {
      console.error("Job update notification failed:", notifyErr);
    }

    return NextResponse.json({ message: "Job updated" });
  } catch (err) {
    await conn.rollback();
    if (err instanceof z.ZodError)
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 },
      );
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:"))
      return NextResponse.json(
        { error: `Insufficient stock for ${err.message.split(":")[1]}` },
        { status: 400 },
      );
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}

function setsDiffer(oldIds: number[], newIds: number[]): boolean {
  if (oldIds.length !== newIds.length) return true;
  const oldSet = new Set(oldIds);
  return newIds.some((id) => !oldSet.has(id));
}

function partsDiffer(
  oldParts: { Part_ID: number; QuantityUsed: number }[],
  newParts: { partId: number; quantity: number }[],
): boolean {
  if (oldParts.length !== newParts.length) return true;
  const oldMap = new Map(oldParts.map((p) => [p.Part_ID, p.QuantityUsed]));
  return newParts.some((p) => oldMap.get(p.partId) !== p.quantity);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "Mechanic")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = session.companyId;

    await pool.query(
      `DELETE rj FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE rj.Job_ID = ? AND c.Company_ID = ?`,
      [id, companyId],
    );
    return NextResponse.json({ message: "Job deleted" });
  } catch (err: any) {
    if (err?.code === "ER_ROW_IS_REFERENCED_2" || err?.errno === 1451)
      return NextResponse.json(
        {
          error:
            "This job order has a paid invoice on record and can't be deleted.",
        },
        { status: 400 },
      );
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
