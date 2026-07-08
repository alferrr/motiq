import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId, getSession } from "@/lib/session";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { jobOrderCreatedEmail } from "@/lib/emailTemplates";

const JobSchema = z.object({
  vehicleId: z.coerce.number({ error: "Vehicle is required" }),
  mechanicId: z.coerce.number({ error: "Mechanic is required" }),
  appointmentId: z.coerce.number().optional(),
  jobDate: z.string().min(1, "Job date is required"),
  reportedIssue: z.string().optional(),
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

    const statusClause = status ? `AND rj.Status = '${status}'` : "";

    const [rows]: any = await pool.query(
      `SELECT
         rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue, rj.Diagnosis, rj.LaborHours,
         c.FullName  AS customerName,
         v.Make, v.Model, v.Year, v.PlateNumber,
         u.FullName  AS mechanicName
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User     u ON u.User_ID     = m.User_ID
       WHERE c.Company_ID = ?
         ${statusClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR v.Make LIKE ? OR rj.ReportedIssue LIKE ?)
       ORDER BY rj.CreatedAt DESC
       LIMIT ? OFFSET ?`,
      [companyId, like, like, like, like, limit, offset],
    );

    const [[{ total }]]: any = await pool.query(
      `SELECT COUNT(*) AS total
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         ${statusClause}
         AND (c.FullName LIKE ? OR v.PlateNumber LIKE ? OR v.Make LIKE ? OR rj.ReportedIssue LIKE ?)`,
      [companyId, like, like, like, like],
    );

    // vehicles dropdown
    const [vehicles]: any = await pool.query(
      `SELECT v.Vehicle_ID, v.Make, v.Model, v.PlateNumber, c.FullName AS ownerName
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
       ORDER BY c.FullName ASC`,
      [companyId],
    );

    // mechanics dropdown
    const [mechanics]: any = await pool.query(
      `SELECT m.Mechanic_ID, u.FullName, m.Specialization
       FROM Mechanic m
       JOIN User u ON u.User_ID = m.User_ID
       WHERE u.Company_ID = ?
       ORDER BY u.FullName ASC`,
      [companyId],
    );

    return NextResponse.json({
      jobs: rows,
      total,
      page,
      limit,
      vehicles,
      mechanics,
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
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "Mechanic")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = session.companyId;

    const body = JobSchema.parse(await request.json());

    // verify the vehicle belongs to this company — also doubles as the
    // data fetch for the job-order-created email below
    const [[recipient]]: any = await pool.query(
      `SELECT c.FullName AS customerName, c.Email AS customerEmail,
              v.Make, v.Model,
              co.Name AS companyName, co.ThemeColor,
              co.Email AS companyEmail, co.ContactNumber AS companyContact, co.Address AS companyAddress
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       JOIN Company co ON co.Company_ID = c.Company_ID
       WHERE v.Vehicle_ID = ? AND c.Company_ID = ?
       LIMIT 1`,
      [body.vehicleId, companyId],
    );
    if (!recipient)
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    // verify the mechanic belongs to this company
    const [[mechanic]]: any = await pool.query(
      `SELECT m.Mechanic_ID FROM Mechanic m
       JOIN User u ON u.User_ID = m.User_ID
       WHERE m.Mechanic_ID = ? AND u.Company_ID = ?
       LIMIT 1`,
      [body.mechanicId, companyId],
    );
    if (!mechanic)
      return NextResponse.json({ error: "Mechanic not found" }, { status: 404 });

    // if linked to an appointment, verify it belongs to this company too
    if (body.appointmentId !== undefined) {
      const [[appointment]]: any = await pool.query(
        `SELECT Appointment_ID FROM Appointment WHERE Appointment_ID = ? AND Company_ID = ? LIMIT 1`,
        [body.appointmentId, companyId],
      );
      if (!appointment)
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 },
        );
    }

    const [result]: any = await pool.query(
      `INSERT INTO RepairJob (Vehicle_ID, Mechanic_ID, Appointment_ID, JobDate, ReportedIssue, Status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [
        body.vehicleId,
        body.mechanicId,
        body.appointmentId ?? null,
        body.jobDate,
        body.reportedIssue ?? null,
      ],
    );

    if (recipient.customerEmail) {
      const { subject, html } = jobOrderCreatedEmail({
        companyName: recipient.companyName,
        themeColor: recipient.ThemeColor,
        companyEmail: recipient.companyEmail,
        companyContact: recipient.companyContact,
        companyAddress: recipient.companyAddress,
        customerName: recipient.customerName,
        jobId: result.insertId,
        vehicle: `${recipient.Make} ${recipient.Model}`,
        jobDate: body.jobDate,
        reportedIssue: body.reportedIssue,
      });
      await sendEmail({ to: recipient.customerEmail, subject, html });
    }

    return NextResponse.json({ jobId: result.insertId }, { status: 201 });
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
