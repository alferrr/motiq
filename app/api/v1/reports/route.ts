import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "6m"; // 7d | 30d | 6m | 1y
    const monthsBack = range === "1y" ? 12 : range === "6m" ? 6 : 1;
    const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : null;

    // shared range boundary — every query below (not just the revenue chart)
    // should respect the selected range
    const rangeStart = new Date();
    if (daysBack) rangeStart.setDate(rangeStart.getDate() - daysBack);
    else rangeStart.setMonth(rangeStart.getMonth() - monthsBack);
    const rangeStartStr = rangeStart.toISOString().slice(0, 10);

    let revenueRows: any[];
    if (daysBack) {
      [revenueRows] = (await pool.query(
        `SELECT DATE_FORMAT(p.PaymentDate, '%b %d') AS label, SUM(p.AmountPaid) AS revenue
         FROM Payment p
         JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
         JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
         JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
         JOIN Customer c ON c.Customer_ID = v.Customer_ID
         WHERE c.Company_ID = ? AND p.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(p.PaymentDate), DATE_FORMAT(p.PaymentDate, '%b %d')
         ORDER BY DATE(p.PaymentDate) ASC`,
        [companyId, daysBack],
      )) as any;
    } else {
      [revenueRows] = (await pool.query(
        `SELECT DATE_FORMAT(p.PaymentDate, '%b') AS label, SUM(p.AmountPaid) AS revenue
         FROM Payment p
         JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
         JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
         JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
         JOIN Customer c ON c.Customer_ID = v.Customer_ID
         WHERE c.Company_ID = ? AND p.PaymentDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
         GROUP BY YEAR(p.PaymentDate), MONTH(p.PaymentDate), DATE_FORMAT(p.PaymentDate, '%b')
         ORDER BY YEAR(p.PaymentDate) ASC, MONTH(p.PaymentDate) ASC`,
        [companyId, monthsBack],
      )) as any;
    }

    const [statusRows]: any = await pool.query(
      `SELECT rj.Status AS status, COUNT(*) AS count
       FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.JobDate >= ?
       GROUP BY rj.Status`,
      [companyId, rangeStartStr],
    );

    const [categoryRows]: any = await pool.query(
      `SELECT COALESCE(sc.Category, 'Uncategorized') AS category, SUM(sc.LaborRate) AS revenue, COUNT(*) AS count
       FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       JOIN RepairJob rj ON rj.Job_ID = js.Job_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.JobDate >= ?
       GROUP BY category
       ORDER BY revenue DESC
       LIMIT 6`,
      [companyId, rangeStartStr],
    );

    const [mechanicRows]: any = await pool.query(
      `SELECT u.FullName AS name, COUNT(*) AS jobCount,
              SUM(rj.LaborHours) AS totalHours
       FROM RepairJob rj
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User u ON u.User_ID = m.User_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status IN ('Completed', 'Released') AND rj.JobDate >= ?
       GROUP BY u.User_ID, u.FullName
       ORDER BY jobCount DESC
       LIMIT 5`,
      [companyId, rangeStartStr],
    );

    // ── summary stats ──────────────────────────────────────────────────────
    const [[{ totalRevenue }]]: any = await pool.query(
      `SELECT COALESCE(SUM(p.AmountPaid), 0) AS totalRevenue
       FROM Payment p
       JOIN Invoice i ON i.Invoice_ID = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND p.PaymentDate >= ?`,
      [companyId, rangeStartStr],
    );

    const [[{ totalJobs }]]: any = await pool.query(
      `SELECT COUNT(*) AS totalJobs FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.JobDate >= ?`,
      [companyId, rangeStartStr],
    );

    const [[{ avgJobValue }]]: any = await pool.query(
      `SELECT COALESCE(AVG(i.TotalAmount), 0) AS avgJobValue
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID = i.Job_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND i.DateIssued >= ?`,
      [companyId, rangeStartStr],
    );

    const [[{ totalCustomers }]]: any = await pool.query(
      `SELECT COUNT(*) AS totalCustomers FROM Customer WHERE Company_ID = ?`,
      [companyId],
    );

    return NextResponse.json({
      revenueOverTime: revenueRows,
      repairsByStatus: statusRows,
      revenueByCategory: categoryRows,
      topMechanics: mechanicRows,
      summary: { totalRevenue, totalJobs, avgJobValue, totalCustomers },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
