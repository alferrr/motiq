import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/session";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId(request);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications: {
      id: string;
      type: string;
      title: string;
      body: string;
      createdAt: string;
    }[] = [];

    // low stock parts
    const [lowStock]: any = await pool.query(
      `SELECT Part_ID, PartName, StockQuantity, MinimumStock
       FROM PartsInventory
       WHERE Company_ID = ? AND StockQuantity <= MinimumStock
       ORDER BY StockQuantity ASC
       LIMIT 5`,
      [companyId],
    );
    for (const p of lowStock) {
      notifications.push({
        id: `low_stock_${p.Part_ID}`,
        type: "low_stock",
        title: "Low Stock Alert",
        body: `${p.PartName} is running low — ${p.StockQuantity} left (min ${p.MinimumStock}).`,
        createdAt: "Now",
      });
    }

    // completed jobs not yet released (ready for pickup)
    const [ready]: any = await pool.query(
      `SELECT rj.Job_ID, c.FullName AS customer, v.Make, v.Model, rj.CreatedAt
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ? AND rj.Status = 'Completed'
       ORDER BY rj.CreatedAt DESC
       LIMIT 5`,
      [companyId],
    );
    for (const j of ready) {
      notifications.push({
        id: `ready_${j.Job_ID}`,
        type: "ready",
        title: "Vehicle Ready for Pickup",
        body: `${j.customer}'s ${j.Make} ${j.Model} is ready. Job #${j.Job_ID}.`,
        createdAt: timeAgo(new Date(j.CreatedAt)),
      });
    }

    // today's upcoming appointments
    const [appts]: any = await pool.query(
      `SELECT a.Appointment_ID, c.FullName AS customer,
              DATE_FORMAT(a.AppointmentDate, '%Y-%m-%d') AS date,
              TIME_FORMAT(a.AppointmentTime, '%h:%i %p') AS time
       FROM Appointment a
       JOIN Customer c ON c.Customer_ID = a.Customer_ID
       WHERE a.Company_ID = ? AND a.AppointmentDate = CURDATE() AND a.Status = 'Scheduled'
       ORDER BY a.AppointmentTime ASC
       LIMIT 5`,
      [companyId],
    );
    for (const a of appts) {
      notifications.push({
        id: `appt_${a.Appointment_ID}`,
        type: "appointment",
        title: "Appointment Today",
        body: `${a.customer} has an appointment at ${a.time}.`,
        createdAt: "Today",
      });
    }

    // recently completed jobs (last 24h)
    const [completed]: any = await pool.query(
      `SELECT rj.Job_ID, c.FullName AS customer, v.Make, v.Model, rj.CreatedAt
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?
         AND rj.Status = 'Completed'
         AND rj.CreatedAt >= NOW() - INTERVAL 24 HOUR
       ORDER BY rj.CreatedAt DESC
       LIMIT 3`,
      [companyId],
    );
    for (const j of completed) {
      if (!notifications.find((n) => n.id === `ready_${j.Job_ID}`)) {
        notifications.push({
          id: `completed_${j.Job_ID}`,
          type: "completed",
          title: "Repair Completed",
          body: `Job #${j.Job_ID} for ${j.customer}'s ${j.Make} ${j.Model} was completed.`,
          createdAt: timeAgo(new Date(j.CreatedAt)),
        });
      }
    }

    // sort: low stock first, then by time
    const order = ["low_stock", "appointment", "ready", "completed"];
    notifications.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
