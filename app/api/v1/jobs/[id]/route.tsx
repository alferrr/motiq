import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";
import { createInvoiceForJob } from "@/lib/invoices";

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
       WHERE js.Job_ID = ?`,
      [id],
    );

    const [parts]: any = await pool.query(
      `SELECT jp.Part_ID, jp.QuantityUsed, pi.PartName, pi.SKU, pi.UnitPrice
       FROM JobParts jp
       JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
       WHERE jp.Job_ID = ?`,
      [id],
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
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = UpdateSchema.parse(await request.json());

    // also doubles as an ownership check — Job_ID alone doesn't prove it
    // belongs to this company
    const [[existing]]: any = await conn.query(
      `SELECT rj.Status AS previousStatus
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
    if (body.serviceIds !== undefined) {
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
    if (body.parts !== undefined) {
      // restore old quantities first
      const [oldParts]: any = await conn.query(
        "SELECT Part_ID, QuantityUsed FROM JobParts WHERE Job_ID = ?",
        [id],
      );
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
          await conn.query(
            "UPDATE PartsInventory SET StockQuantity = StockQuantity - ? WHERE Part_ID = ?",
            [p.quantity, p.partId],
          );
        }
      }
    }

    await conn.commit();

    // auto-generate the invoice the moment a job first becomes Completed —
    // createInvoiceForJob no-ops if one already exists, and emails the
    // customer an invoice with a Kasa "Pay Now" link when there's a balance due.
    // Runs after the commit, so a failure here must not turn an already-
    // successful job update into a 500.
    if (body.status === "Completed" && existing.previousStatus !== "Completed") {
      try {
        await createInvoiceForJob(companyId, Number(id), request.nextUrl.origin);
      } catch (invoiceErr) {
        console.error("Auto-invoice generation failed:", invoiceErr);
      }
    }

    return NextResponse.json({ message: "Job updated" });
  } catch (err) {
    await conn.rollback();
    if (err instanceof z.ZodError)
      return NextResponse.json(
        { error: err.issues[0].message },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await pool.query(
      `DELETE rj FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE rj.Job_ID = ? AND c.Company_ID = ?`,
      [id, companyId],
    );
    return NextResponse.json({ message: "Job deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
