import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = session.companyId;

    const today = new Date().toISOString().split("T")[0];

    // today's appointments
    const [appointments]: any = await pool.query(
      `SELECT a.Appointment_ID, a.AppointmentTime AS time, a.Reason AS reason, a.Status,
              c.FullName AS customer,
              v.Make, v.Model, v.PlateNumber
       FROM Appointment a
       JOIN Customer c ON c.Customer_ID = a.Customer_ID
       JOIN Vehicle  v ON v.Vehicle_ID  = a.Vehicle_ID
       WHERE a.Company_ID = ? AND a.AppointmentDate = ? AND a.Status = 'Scheduled'
       ORDER BY a.AppointmentTime ASC`,
      [companyId, today],
    );

    // pending job orders
    const [pendingJobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue,
              c.FullName AS customer,
              v.Make, v.Model, v.PlateNumber,
              u.FullName AS mechanic
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User     u ON u.User_ID     = m.User_ID
       WHERE v.Customer_ID IN (SELECT Customer_ID FROM Customer WHERE Company_ID = ?)
         AND rj.Status = 'Pending'
       ORDER BY rj.JobDate DESC
       LIMIT 10`,
      [companyId],
    );

    // vehicles ready for pickup (status = Completed)
    const [readyVehicles]: any = await pool.query(
      `SELECT rj.Job_ID, v.Make, v.Model, v.PlateNumber, c.FullName AS customer,
              rj.JobDate
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE v.Customer_ID IN (SELECT Customer_ID FROM Customer WHERE Company_ID = ?)
         AND rj.Status = 'Completed'
       ORDER BY rj.JobDate DESC
       LIMIT 10`,
      [companyId],
    );

    // recent customers
    const [recentCustomers]: any = await pool.query(
      `SELECT Customer_ID, FullName, ContactNumber, CreatedAt
       FROM Customer
       WHERE Company_ID = ?
       ORDER BY CreatedAt DESC
       LIMIT 8`,
      [companyId],
    );

    // today's payments
    const [todayPayments]: any = await pool.query(
      `SELECT p.Payment_ID, p.AmountPaid, p.PaymentMethod, p.PaymentDate,
              c.FullName AS customer,
              i.Invoice_ID
       FROM Payment  p
       JOIN Invoice  i ON i.Invoice_ID  = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID   = i.Job_ID
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND p.PaymentDate = ?
       ORDER BY p.Payment_ID DESC`,
      [companyId, today],
    );

    // summary counts
    const [[{ todayApptCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS todayApptCount FROM Appointment
       WHERE Company_ID = ? AND AppointmentDate = ? AND Status = 'Scheduled'`,
      [companyId, today],
    );
    const [[{ pendingCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS pendingCount FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status = 'Pending'`,
      [companyId],
    );
    const [[{ readyCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS readyCount FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status = 'Completed'`,
      [companyId],
    );
    const [[{ todayRevenue }]]: any = await pool.query(
      `SELECT COALESCE(SUM(p.AmountPaid), 0) AS todayRevenue
       FROM Payment p
       JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND p.PaymentDate = ?`,
      [companyId, today],
    );

    return NextResponse.json({
      counts: { todayApptCount, pendingCount, readyCount, todayRevenue },
      appointments,
      pendingJobs,
      readyVehicles,
      recentCustomers,
      todayPayments,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
