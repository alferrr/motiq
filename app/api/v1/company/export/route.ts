import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { toCsv } from "@/lib/csv";
import JSZip from "jszip";

// Full company data export ("take your data and leave") — Admin-only.
// Every table the tenant owns, one CSV per table, zipped. Deliberately
// excludes Company.Kasa* (the encrypted payment-gateway credential) and
// User.Password (bcrypt hash) — everything else is a faithful column dump,
// scoped by Company_ID directly or via the same join chains used everywhere
// else in this codebase.
export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (auth.role !== "Admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const companyId = auth.companyId;

    const [company]: any = await pool.query(
      `SELECT Company_ID, Name, Address, ContactNumber, Email, GarageType,
              NumberOfBays, OpeningTime, ClosingTime, BusinessPermitNumber,
              DtiSecNumber, YearsInOperation, OwnerFullName, OwnerIdType,
              OwnerIdNumber, ThemeColor, CreatedAt
       FROM Company WHERE Company_ID = ?`,
      [companyId],
    );

    const [users]: any = await pool.query(
      `SELECT User_ID, FullName, Username, Email, Role, CreatedAt
       FROM User WHERE Company_ID = ?`,
      [companyId],
    );

    const [mechanics]: any = await pool.query(
      `SELECT m.Mechanic_ID, m.User_ID, m.Specialization, m.ContactNumber
       FROM Mechanic m JOIN User u ON u.User_ID = m.User_ID
       WHERE u.Company_ID = ?`,
      [companyId],
    );

    const [customers]: any = await pool.query(
      `SELECT Customer_ID, FullName, ContactNumber, Email, Address, CreatedAt
       FROM Customer WHERE Company_ID = ?`,
      [companyId],
    );

    const [vehicles]: any = await pool.query(
      `SELECT v.Vehicle_ID, v.Customer_ID, v.PlateNumber, v.Make, v.Model,
              v.Year, v.VIN, v.Color, v.Mileage, v.CreatedAt
       FROM Vehicle v JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const [services]: any = await pool.query(
      `SELECT Service_ID, ServiceName, Category, Description, LaborRate
       FROM ServiceCatalog WHERE Company_ID = ?`,
      [companyId],
    );

    const [parts]: any = await pool.query(
      `SELECT Part_ID, PartName, SKU, UnitPrice, StockQuantity, MinimumStock
       FROM PartsInventory WHERE Company_ID = ?`,
      [companyId],
    );

    const [appointments]: any = await pool.query(
      `SELECT Appointment_ID, Customer_ID, Vehicle_ID, AppointmentDate,
              AppointmentTime, Reason, Status, CreatedAt
       FROM Appointment WHERE Company_ID = ?`,
      [companyId],
    );

    const [jobs]: any = await pool.query(
      `SELECT rj.Job_ID, rj.Vehicle_ID, rj.Mechanic_ID, rj.Appointment_ID,
              rj.JobDate, rj.ReportedIssue, rj.Diagnosis, rj.Status,
              rj.LaborHours, rj.CreatedAt
       FROM RepairJob rj
       JOIN Vehicle  v ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer c ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const [jobServices]: any = await pool.query(
      `SELECT js.Job_ID, js.Service_ID
       FROM JobService js
       JOIN RepairJob rj ON rj.Job_ID     = js.Job_ID
       JOIN Vehicle   v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer  c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const [jobParts]: any = await pool.query(
      `SELECT jp.Job_ID, jp.Part_ID, jp.QuantityUsed
       FROM JobParts jp
       JOIN RepairJob rj ON rj.Job_ID     = jp.Job_ID
       JOIN Vehicle   v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer  c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const [invoices]: any = await pool.query(
      `SELECT i.Invoice_ID, i.Job_ID, i.DateIssued, i.TotalAmount, i.Status,
              i.PaymentReference
       FROM Invoice i
       JOIN RepairJob rj ON rj.Job_ID     = i.Job_ID
       JOIN Vehicle   v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer  c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const [payments]: any = await pool.query(
      `SELECT p.Payment_ID, p.Invoice_ID, p.PaymentMethod, p.AmountPaid,
              p.PaymentDate, p.ReferenceNumber, p.KasaPaymentId, p.Status,
              p.RefundedAmount
       FROM Payment p
       JOIN Invoice   i  ON i.Invoice_ID  = p.Invoice_ID
       JOIN RepairJob rj ON rj.Job_ID     = i.Job_ID
       JOIN Vehicle   v  ON v.Vehicle_ID  = rj.Vehicle_ID
       JOIN Customer  c  ON c.Customer_ID = v.Customer_ID
       WHERE c.Company_ID = ?`,
      [companyId],
    );

    const zip = new JSZip();
    zip.file("Company.csv", toCsv(company));
    zip.file("Users.csv", toCsv(users));
    zip.file("Mechanics.csv", toCsv(mechanics));
    zip.file("Customers.csv", toCsv(customers));
    zip.file("Vehicles.csv", toCsv(vehicles));
    zip.file("ServiceCatalog.csv", toCsv(services));
    zip.file("PartsInventory.csv", toCsv(parts));
    zip.file("Appointments.csv", toCsv(appointments));
    zip.file("JobOrders.csv", toCsv(jobs));
    zip.file("JobServices.csv", toCsv(jobServices));
    zip.file("JobParts.csv", toCsv(jobParts));
    zip.file("Invoices.csv", toCsv(invoices));
    zip.file("Payments.csv", toCsv(payments));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const companyName: string = company[0]?.Name ?? "motiq";
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `motiq-export-${slug}-${date}.zip`;

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
