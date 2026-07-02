import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { invoiceGeneratedEmail } from "@/lib/emailTemplates";

const CreateInvoiceSchema = z.object({
  jobId: z.coerce.number({ error: "Job is required" }),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 10;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;

    const statusClause = status ? `AND i.Status = ?` : "";
    const statusParam = status ? [status] : [];

    const [rows]: any = await pool.query(
      `SELECT
         i.Invoice_ID, i.DateIssued, i.TotalAmount, i.Status,
         rj.Job_ID, rj.Status AS jobStatus,
         c.FullName AS customerName,
         v.Make, v.Model, v.PlateNumber,
         COALESCE(SUM(CASE WHEN p.Status IN ('succeeded','partially_refunded')
                            THEN p.AmountPaid - p.RefundedAmount ELSE 0 END), 0) AS paidNet
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       LEFT JOIN Payment p ON p.Invoice_ID = i.Invoice_ID
       WHERE c.Company_ID = ?
         ${statusClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR v.Make LIKE ?)
       GROUP BY i.Invoice_ID
       ORDER BY i.DateIssued DESC, i.Invoice_ID DESC
       LIMIT ? OFFSET ?`,
      [companyId, ...statusParam, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         ${statusClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR v.Make LIKE ?)`,
      [companyId, ...statusParam, like, like, like],
    );

    // jobs eligible for invoicing: completed/released, no invoice yet
    const [eligibleJobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate, c.FullName AS customerName,
              v.Make, v.Model, v.PlateNumber
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       LEFT JOIN Invoice i ON i.Job_ID = rj.Job_ID
       WHERE c.Company_ID = ?
         AND rj.Status IN ('Completed', 'Released')
         AND i.Invoice_ID IS NULL
       ORDER BY rj.JobDate DESC`,
      [companyId],
    );

    return NextResponse.json({
      invoices: rows,
      total,
      page,
      limit,
      eligibleJobs,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = CreateInvoiceSchema.parse(await request.json());

    const [[job]]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status,
              c.FullName AS customerName, c.Email AS customerEmail,
              v.Make, v.Model,
              co.Name AS companyName, co.ThemeColor
       FROM RepairJob rj
       JOIN Vehicle  v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       JOIN Company  co ON co.Company_ID = c.Company_ID
       LEFT JOIN Invoice i ON i.Job_ID = rj.Job_ID
       WHERE rj.Job_ID = ? AND c.Company_ID = ? AND i.Invoice_ID IS NULL
       LIMIT 1`,
      [body.jobId, companyId],
    );
    if (!job)
      return NextResponse.json(
        { error: "Job not found or already invoiced" },
        { status: 404 },
      );
    if (!["Completed", "Released"].includes(job.Status))
      return NextResponse.json(
        { error: "Job must be completed before it can be invoiced" },
        { status: 400 },
      );

    const [[{ totalLabor }]]: any = await pool.query(
      `SELECT COALESCE(SUM(sc.LaborRate), 0) AS totalLabor
       FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       WHERE js.Job_ID = ?`,
      [body.jobId],
    );
    const [[{ totalParts }]]: any = await pool.query(
      `SELECT COALESCE(SUM(pi.UnitPrice * jp.QuantityUsed), 0) AS totalParts
       FROM JobParts jp
       JOIN PartsInventory pi ON pi.Part_ID = jp.Part_ID
       WHERE jp.Job_ID = ?`,
      [body.jobId],
    );
    const totalAmount = Number(totalLabor) + Number(totalParts);

    const [result]: any = await pool.query(
      `INSERT INTO Invoice (Job_ID, DateIssued, TotalAmount, Status)
       VALUES (?, CURDATE(), ?, 'Unpaid')`,
      [body.jobId, totalAmount],
    );

    if (job.customerEmail) {
      const { subject, html } = invoiceGeneratedEmail({
        companyName: job.companyName,
        themeColor: job.ThemeColor,
        customerName: job.customerName,
        invoiceId: result.insertId,
        vehicle: `${job.Make} ${job.Model}`,
        totalAmount,
        dateIssued: new Date().toISOString().slice(0, 10),
      });
      await sendEmail({ to: job.customerEmail, subject, html });
    }

    return NextResponse.json(
      { invoiceId: result.insertId },
      { status: 201 },
    );
  } catch (err) {
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
  }
}
