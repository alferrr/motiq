import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId, getSession } from "@/lib/session";
import { z } from "zod";

const StatusSchema = z.object({
  status: z.enum(["Scheduled", "Completed", "Cancelled"]),
});

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // e.g. "2026-06"

    let dateClause = "";
    let dateParams: string[] = [];
    if (month) {
      dateClause = "AND DATE_FORMAT(a.AppointmentDate, '%Y-%m') = ?";
      dateParams = [month];
    }

    const [rows]: any = await pool.query(
      `SELECT
         a.Appointment_ID,
         DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') AS AppointmentDate,
         a.AppointmentTime,
         a.Reason, a.Status,
         c.Customer_ID, c.FullName AS customerName, c.ContactNumber,
         v.Vehicle_ID, v.Make, v.Model, v.PlateNumber
       FROM Appointment a
       JOIN Customer c ON c.Customer_ID = a.Customer_ID
       JOIN Vehicle  v ON v.Vehicle_ID  = a.Vehicle_ID
       WHERE a.Company_ID = ?
         ${dateClause}
       ORDER BY a.AppointmentDate ASC, a.AppointmentTime ASC`,
      [companyId, ...dateParams],
    );

    // customers + vehicles for form dropdowns
    const [customers]: any = await pool.query(
      `SELECT Customer_ID, FullName FROM Customer WHERE Company_ID = ? ORDER BY FullName ASC`,
      [companyId],
    );

    const [vehicles]: any = await pool.query(
      `SELECT v.Vehicle_ID, v.Make, v.Model, v.PlateNumber, c.FullName AS ownerName
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
       ORDER BY c.FullName ASC`,
      [companyId],
    );

    return NextResponse.json({ appointments: rows, customers, vehicles });
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
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "Mechanic")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = session.companyId;

    const body = StatusSchema.parse(await request.json());

    const [result]: any = await pool.query(
      `UPDATE Appointment SET Status = ? WHERE Appointment_ID = ? AND Company_ID = ?`,
      [body.status, id, companyId],
    );
    if (result.affectedRows === 0)
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Appointment updated" });
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

    const [result]: any = await pool.query(
      `DELETE FROM Appointment WHERE Appointment_ID = ? AND Company_ID = ?`,
      [id, companyId],
    );
    if (result.affectedRows === 0)
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );

    return NextResponse.json({ message: "Appointment deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
