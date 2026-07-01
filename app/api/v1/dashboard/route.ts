// app/api/v1/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import jwt from "jsonwebtoken";

function getCompanyId(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.companyId as string;
}

export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // total customers
    const [[{ totalCustomers }]]: any = await pool.query(
      "SELECT COUNT(*) AS totalCustomers FROM Customer WHERE Company_ID = ?",
      [companyId],
    );

    // registered vehicles
    const [[{ totalVehicles }]]: any = await pool.query(
      `SELECT COUNT(*) AS totalVehicles
       FROM Vehicle v
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    // active repairs (Pending + In Progress)
    const [[{ activeRepairs }]]: any = await pool.query(
      `SELECT COUNT(*) AS activeRepairs
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status IN ('Pending', 'In Progress')`,
      [companyId],
    );

    // today's appointments
    const [[{ todayAppointments }]]: any = await pool.query(
      `SELECT COUNT(*) AS todayAppointments FROM Appointment
       WHERE Company_ID = ? AND AppointmentDate = CURDATE() AND Status = 'Scheduled'`,
      [companyId],
    );

    // monthly revenue (current month, paid invoices)
    const [[{ monthlyRevenue }]]: any = await pool.query(
      `SELECT COALESCE(SUM(p.AmountPaid), 0) AS monthlyRevenue
       FROM Payment p
       JOIN Invoice  i  ON i.Invoice_ID  = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID    = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         AND MONTH(p.PaymentDate) = MONTH(CURDATE())
         AND YEAR(p.PaymentDate) = YEAR(CURDATE())`,
      [companyId],
    );

    // low stock items
    const [[{ lowStockCount }]]: any = await pool.query(
      `SELECT COUNT(*) AS lowStockCount FROM PartsInventory
       WHERE Company_ID = ? AND StockQuantity <= MinimumStock`,
      [companyId],
    );

    // recent job orders (last 5)
    const [recentJobs]: any = await pool.query(
      `SELECT
          rj.Job_ID,
          rj.Status,
          rj.JobDate,
          rj.ReportedIssue,
          c.FullName   AS CustomerName,
          v.Make, v.Model, v.Year,
          u.FullName   AS MechanicName
       FROM RepairJob rj
       JOIN Vehicle   v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer  c  ON c.Customer_ID = v.Customer_ID
       JOIN Mechanic  m  ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User      u  ON u.User_ID     = m.User_ID
       WHERE c.Company_ID = ?
       ORDER BY rj.CreatedAt DESC
       LIMIT 5`,
      [companyId],
    );

    // monthly revenue chart (last 6 months)
    const [salesChart]: any = await pool.query(
      `SELECT
          DATE_FORMAT(p.PaymentDate, '%b') AS month,
          SUM(p.AmountPaid)               AS revenue
       FROM Payment p
       JOIN Invoice  i  ON i.Invoice_ID  = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID    = i.Job_ID
       JOIN Vehicle  v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         AND p.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY YEAR(p.PaymentDate), MONTH(p.PaymentDate), DATE_FORMAT(p.PaymentDate, '%b')
       ORDER BY YEAR(p.PaymentDate) ASC, MONTH(p.PaymentDate) ASC`,
      [companyId],
    );

    // today's appointments list
    const [appointments]: any = await pool.query(
      `SELECT
          a.AppointmentTime AS time,
          c.FullName        AS customer,
          v.Make, v.Model,
          a.Reason          AS reason
       FROM Appointment a
       JOIN Customer c ON c.Customer_ID = a.Customer_ID
       JOIN Vehicle  v ON v.Vehicle_ID  = a.Vehicle_ID
       WHERE a.Company_ID = ?
         AND a.AppointmentDate = CURDATE()
         AND a.Status = 'Scheduled'
       ORDER BY a.AppointmentTime ASC`,
      [companyId],
    );

    // low stock list
    const [lowStock]: any = await pool.query(
      `SELECT PartName, SKU, StockQuantity AS qty, MinimumStock AS min
       FROM PartsInventory
       WHERE Company_ID = ? AND StockQuantity <= MinimumStock
       ORDER BY StockQuantity ASC
       LIMIT 10`,
      [companyId],
    );

    return NextResponse.json({
      stats: {
        totalCustomers,
        totalVehicles,
        activeRepairs,
        todayAppointments,
        monthlyRevenue,
        lowStockCount,
      },
      recentJobs,
      salesChart,
      appointments,
      lowStock,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
