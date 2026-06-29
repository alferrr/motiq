// app/api/v1/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // total customers
    const [[{ totalCustomers }]]: any = await pool.query(
      "SELECT COUNT(*) AS totalCustomers FROM Customer",
    );

    // registered vehicles
    const [[{ totalVehicles }]]: any = await pool.query(
      "SELECT COUNT(*) AS totalVehicles FROM Vehicle",
    );

    // active repairs (Pending + In Progress)
    const [[{ activeRepairs }]]: any = await pool.query(
      "SELECT COUNT(*) AS activeRepairs FROM RepairJob WHERE Status IN ('Pending', 'In Progress')",
    );

    // today's appointments
    const [[{ todayAppointments }]]: any = await pool.query(
      "SELECT COUNT(*) AS todayAppointments FROM Appointment WHERE AppointmentDate = CURDATE() AND Status = 'Scheduled'",
    );

    // monthly revenue (current month, paid invoices)
    const [[{ monthlyRevenue }]]: any = await pool.query(
      `SELECT COALESCE(SUM(p.AmountPaid), 0) AS monthlyRevenue
       FROM Payment p
       WHERE MONTH(p.PaymentDate) = MONTH(CURDATE())
         AND YEAR(p.PaymentDate) = YEAR(CURDATE())`,
    );

    // low stock items
    const [[{ lowStockCount }]]: any = await pool.query(
      "SELECT COUNT(*) AS lowStockCount FROM PartsInventory WHERE StockQuantity <= MinimumStock",
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
       ORDER BY rj.CreatedAt DESC
       LIMIT 5`,
    );

    // monthly revenue chart (last 6 months)
    const [salesChart]: any = await pool.query(
      `SELECT
          DATE_FORMAT(p.PaymentDate, '%b') AS month,
          SUM(p.AmountPaid)               AS revenue
       FROM Payment p
       WHERE p.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY YEAR(p.PaymentDate), MONTH(p.PaymentDate), DATE_FORMAT(p.PaymentDate, '%b')
       ORDER BY YEAR(p.PaymentDate) ASC, MONTH(p.PaymentDate) ASC`,
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
       WHERE a.AppointmentDate = CURDATE()
         AND a.Status = 'Scheduled'
       ORDER BY a.AppointmentTime ASC`,
    );

    // low stock list
    const [lowStock]: any = await pool.query(
      `SELECT PartName, SKU, StockQuantity AS qty, MinimumStock AS min
       FROM PartsInventory
       WHERE StockQuantity <= MinimumStock
       ORDER BY StockQuantity ASC
       LIMIT 10`,
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
