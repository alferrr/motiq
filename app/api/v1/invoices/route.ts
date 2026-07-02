import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";
import { createInvoiceForJob } from "@/lib/invoices";

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

    const result = await createInvoiceForJob(
      companyId,
      body.jobId,
      request.nextUrl.origin,
    );
    if (!result.ok) {
      if (result.reason === "not_found_or_invoiced")
        return NextResponse.json(
          { error: "Job not found or already invoiced" },
          { status: 404 },
        );
      return NextResponse.json(
        { error: "Job must be completed before it can be invoiced" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { invoiceId: result.invoiceId },
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
