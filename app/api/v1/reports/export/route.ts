import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import JSZip from "jszip";

// Admin-only CSV export of the Reports page's current view — same five
// sections shown on screen (summary, revenue over time, repairs by status,
// revenue by category, top mechanics), for the selected time range. Mirrors
// app/api/v1/reports/route.ts's queries exactly so the export always matches
// what's on screen; not shared as a helper since it's only used in these two
// places (see project convention of extracting only at 3+ call sites).
export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = auth.companyId;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") ?? "6m";
    const monthsBack = range === "1y" ? 12 : range === "6m" ? 6 : 1;
    const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : null;

    const rangeStart = new Date();
    if (daysBack) rangeStart.setDate(rangeStart.getDate() - daysBack);
    else rangeStart.setMonth(rangeStart.getMonth() - monthsBack);
    const rangeStartStr = rangeStart.toISOString().slice(0, 10);

    let revenueRows: any[];
    if (daysBack) {
      [revenueRows] = (await pool.query(
        `SELECT DATE_FORMAT(p.PaymentDate, '%b %d') AS Label, SUM(p.AmountPaid) AS Revenue
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
        `SELECT DATE_FORMAT(p.PaymentDate, '%b') AS Label, SUM(p.AmountPaid) AS Revenue
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
      `SELECT rj.Status AS Status, COUNT(*) AS Count
       FROM RepairJob rj
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.JobDate >= ?
       GROUP BY rj.Status`,
      [companyId, rangeStartStr],
    );

    const [categoryRows]: any = await pool.query(
      `SELECT COALESCE(sc.Category, 'Uncategorized') AS Category, SUM(sc.LaborRate) AS Revenue, COUNT(*) AS Count
       FROM JobService js
       JOIN ServiceCatalog sc ON sc.Service_ID = js.Service_ID
       JOIN RepairJob rj ON rj.Job_ID = js.Job_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.JobDate >= ?
       GROUP BY Category
       ORDER BY Revenue DESC
       LIMIT 6`,
      [companyId, rangeStartStr],
    );

    const [mechanicRows]: any = await pool.query(
      `SELECT u.FullName AS Name, COUNT(*) AS JobCount,
              SUM(rj.LaborHours) AS TotalHours
       FROM RepairJob rj
       JOIN Mechanic m ON m.Mechanic_ID = rj.Mechanic_ID
       JOIN User u ON u.User_ID = m.User_ID
       JOIN Vehicle v ON v.Vehicle_ID = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status IN ('Completed', 'Released') AND rj.JobDate >= ?
       GROUP BY u.User_ID, u.FullName
       ORDER BY JobCount DESC
       LIMIT 5`,
      [companyId, rangeStartStr],
    );

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

    const [[company]]: any = await pool.query(
      `SELECT Name FROM Company WHERE Company_ID = ?`,
      [companyId],
    );

    const zip = new JSZip();
    zip.file(
      "Summary.csv",
      toCsv([
        {
          Range: range,
          TotalRevenue: totalRevenue,
          TotalJobs: totalJobs,
          AvgJobValue: avgJobValue,
          TotalCustomers: totalCustomers,
        },
      ]),
    );
    zip.file("RevenueOverTime.csv", toCsv(revenueRows));
    zip.file("RepairsByStatus.csv", toCsv(statusRows));
    zip.file("RevenueByCategory.csv", toCsv(categoryRows));
    zip.file("TopMechanics.csv", toCsv(mechanicRows));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const companyName: string = company?.Name ?? "motiq";
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `motiq-report-${slug}-${range}-${date}.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
