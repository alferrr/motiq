import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";
import { z } from "zod";
import { recomputeInvoiceStatus } from "@/lib/invoices";
import { sendEmail } from "@/lib/email";
import { paymentReceiptEmail } from "@/lib/emailTemplates";

const ManualPaymentSchema = z.object({
  method: z.enum(["Cash", "Card"]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  referenceNumber: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = ManualPaymentSchema.parse(await request.json());

    const [[invoice]]: any = await pool.query(
      `SELECT i.Invoice_ID,
              c.FullName AS customerName, c.Email AS customerEmail,
              co.Name AS companyName, co.ThemeColor
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       JOIN Company  co ON co.Company_ID = c.Company_ID
       WHERE i.Invoice_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [id, companyId],
    );
    if (!invoice)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await pool.query(
      `INSERT INTO Payment (Invoice_ID, PaymentMethod, AmountPaid, PaymentDate, ReferenceNumber, Status)
       VALUES (?, ?, ?, CURDATE(), ?, 'succeeded')`,
      [id, body.method, body.amount, body.referenceNumber ?? null],
    );

    const result = await recomputeInvoiceStatus(Number(id));

    if (invoice.customerEmail) {
      const { subject, html } = paymentReceiptEmail({
        companyName: invoice.companyName,
        themeColor: invoice.ThemeColor,
        customerName: invoice.customerName,
        invoiceId: Number(id),
        amountPaid: body.amount,
        method: body.method,
        balance: Math.max(0, result.totalAmount - result.paidNet),
        invoiceStatus: result.invoiceStatus,
      });
      await sendEmail({ to: invoice.customerEmail, subject, html });
    }

    return NextResponse.json({ message: "Payment recorded", ...result }, { status: 201 });
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
