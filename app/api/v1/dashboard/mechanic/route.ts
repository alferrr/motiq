import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.id;

    // get mechanic record for this user
    const [[mechanic]]: any = await pool.query(
      "SELECT Mechanic_ID FROM Mechanic WHERE User_ID = ? LIMIT 1",
      [userId],
    );
    if (!mechanic)
      return NextResponse.json(
        { error: "Mechanic record not found" },
        { status: 404 },
      );

    const mechanicId = mechanic.Mechanic_ID;

    // counts
    const [[{ pendingCount }]]: any = await pool.query(
      "SELECT COUNT(*) AS pendingCount FROM RepairJob WHERE Mechanic_ID = ? AND Status = 'Pending'",
      [mechanicId],
    );
    const [[{ inProgressCount }]]: any = await pool.query(
      "SELECT COUNT(*) AS inProgressCount FROM RepairJob WHERE Mechanic_ID = ? AND Status = 'In Progress'",
      [mechanicId],
    );
    const [[{ completedCount }]]: any = await pool.query(
      "SELECT COUNT(*) AS completedCount FROM RepairJob WHERE Mechanic_ID = ? AND Status = 'Completed'",
      [mechanicId],
    );
    const [[{ totalCount }]]: any = await pool.query(
      "SELECT COUNT(*) AS totalCount FROM RepairJob WHERE Mechanic_ID = ?",
      [mechanicId],
    );

    // assigned jobs (pending + in progress)
    const [assignedJobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate, rj.ReportedIssue, rj.Diagnosis, rj.LaborHours,
              c.FullName AS customer,
              v.Make, v.Model, v.Year, v.PlateNumber
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE rj.Mechanic_ID = ? AND rj.Status IN ('Pending', 'In Progress')
       ORDER BY
         CASE rj.Status WHEN 'In Progress' THEN 0 WHEN 'Pending' THEN 1 END ASC,
         rj.JobDate ASC`,
      [mechanicId],
    );

    // recently completed jobs
    const [completedJobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Status, rj.JobDate,
              c.FullName AS customer,
              v.Make, v.Model, v.PlateNumber
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE rj.Mechanic_ID = ? AND rj.Status IN ('Completed', 'Released')
       ORDER BY rj.JobDate DESC
       LIMIT 5`,
      [mechanicId],
    );

    return NextResponse.json({
      counts: { pendingCount, inProgressCount, completedCount, totalCount },
      assignedJobs,
      completedJobs,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
