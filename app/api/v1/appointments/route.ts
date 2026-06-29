import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { z } from "zod";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

const AppointmentSchema = z.object({
  customerId: z.coerce.number({ error: "Customer is required" }),
  vehicleId: z.coerce.number({ error: "Vehicle is required" }),
  appointmentDate: z.string().min(1, "Date is required"),
  appointmentTime: z.string().min(1, "Time is required"),
  reason: z.string().optional(),
});

// GET /api/v1/appointments?month=2026-06
export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
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
         TIME_FORMAT(a.AppointmentTime, '%H:%i')   AS AppointmentTime,
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

// POST /api/v1/appointments
export async function POST(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = AppointmentSchema.parse(await request.json());

    // conflict check — same vehicle, same date+time
    const [[conflict]]: any = await pool.query(
      `SELECT Appointment_ID FROM Appointment
       WHERE Company_ID = ? AND AppointmentDate = ? AND AppointmentTime = ? AND Status = 'Scheduled'
       LIMIT 1`,
      [companyId, body.appointmentDate, body.appointmentTime],
    );
    if (conflict)
      return NextResponse.json(
        { error: "A slot is already booked at this date and time." },
        { status: 409 },
      );

    const [result]: any = await pool.query(
      `INSERT INTO Appointment (Company_ID, Customer_ID, Vehicle_ID, AppointmentDate, AppointmentTime, Reason, Status)
       VALUES (?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [
        companyId,
        body.customerId,
        body.vehicleId,
        body.appointmentDate,
        body.appointmentTime,
        body.reason ?? null,
      ],
    );

    return NextResponse.json(
      { appointmentId: result.insertId },
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
