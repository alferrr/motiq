function shell(opts: {
  companyName: string;
  themeColor: string;
  heading: string;
  bodyHtml: string;
}) {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eaeaea;">
            <tr>
              <td style="background-color:${opts.themeColor};padding:24px 28px;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">${opts.companyName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 16px;font-size:18px;color:#111111;">${opts.heading}</h1>
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #eee;">
                <p style="margin:0;font-size:11px;color:#999999;">Sent by ${opts.companyName} via Motiq.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#888888;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111111;font-weight:500;text-align:right;">${value}</td>
  </tr>`;
}

function detailsTable(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin:16px 0;">${rows}</table>`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function appointmentConfirmationEmail(opts: {
  companyName: string;
  themeColor: string;
  customerName: string;
  vehicle: string;
  date: string;
  time: string;
  reason?: string | null;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.customerName}, your appointment has been scheduled.
    </p>
    ${detailsTable(
      row("Vehicle", opts.vehicle) +
        row("Date", formatDate(opts.date)) +
        row("Time", opts.time) +
        (opts.reason ? row("Reason", opts.reason) : ""),
    )}
    <p style="margin:0;font-size:13px;color:#888888;">
      Please arrive a few minutes early. If you need to reschedule, contact ${opts.companyName}.
    </p>`;
  return {
    subject: `Appointment Confirmed — ${opts.companyName}`,
    html: shell({ ...opts, heading: "Appointment Confirmed", bodyHtml }),
  };
}

export function jobOrderCreatedEmail(opts: {
  companyName: string;
  themeColor: string;
  customerName: string;
  jobId: number;
  vehicle: string;
  jobDate: string;
  reportedIssue?: string | null;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.customerName}, we've opened a job order for your vehicle.
    </p>
    ${detailsTable(
      row("Job Order", `#${opts.jobId}`) +
        row("Vehicle", opts.vehicle) +
        row("Date", formatDate(opts.jobDate)) +
        (opts.reportedIssue ? row("Reported Issue", opts.reportedIssue) : ""),
    )}
    <p style="margin:0;font-size:13px;color:#888888;">
      We'll notify you once your vehicle is ready for pickup.
    </p>`;
  return {
    subject: `Job Order #${opts.jobId} Created — ${opts.companyName}`,
    html: shell({ ...opts, heading: "Job Order Created", bodyHtml }),
  };
}

export function jobReadyEmail(opts: {
  companyName: string;
  themeColor: string;
  customerName: string;
  jobId: number;
  vehicle: string;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.customerName}, great news — your vehicle is ready for pickup.
    </p>
    ${detailsTable(row("Job Order", `#${opts.jobId}`) + row("Vehicle", opts.vehicle))}
    <p style="margin:0;font-size:13px;color:#888888;">
      Please contact ${opts.companyName} to arrange pickup.
    </p>`;
  return {
    subject: `Your Vehicle Is Ready — ${opts.companyName}`,
    html: shell({ ...opts, heading: "Vehicle Ready for Pickup", bodyHtml }),
  };
}

export function invoiceGeneratedEmail(opts: {
  companyName: string;
  themeColor: string;
  customerName: string;
  invoiceId: number;
  vehicle: string;
  totalAmount: number;
  dateIssued: string;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.customerName}, an invoice has been generated for your recent service.
    </p>
    ${detailsTable(
      row("Invoice", `#${opts.invoiceId}`) +
        row("Vehicle", opts.vehicle) +
        row("Date Issued", formatDate(opts.dateIssued)) +
        row("Amount Due", formatPeso(opts.totalAmount)),
    )}
    <p style="margin:0;font-size:13px;color:#888888;">
      ${opts.companyName} will share a payment link with you shortly.
    </p>`;
  return {
    subject: `Invoice #${opts.invoiceId} — ${formatPeso(opts.totalAmount)} Due`,
    html: shell({ ...opts, heading: "Invoice Generated", bodyHtml }),
  };
}

export function paymentReceiptEmail(opts: {
  companyName: string;
  themeColor: string;
  customerName: string;
  invoiceId: number;
  amountPaid: number;
  method: string;
  balance: number;
  invoiceStatus: string;
}) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.customerName}, we've received your payment. Thank you!
    </p>
    ${detailsTable(
      row("Invoice", `#${opts.invoiceId}`) +
        row("Amount Paid", formatPeso(opts.amountPaid)) +
        row("Method", opts.method) +
        row(
          "Remaining Balance",
          opts.balance > 0 ? formatPeso(opts.balance) : "₱0.00 (Paid in full)",
        ),
    )}
    <p style="margin:0;font-size:13px;color:#888888;">
      This receipt is for your records.
    </p>`;
  return {
    subject: `Payment Received — Invoice #${opts.invoiceId}`,
    html: shell({ ...opts, heading: "Payment Receipt", bodyHtml }),
  };
}

export function passwordResetEmail(opts: {
  companyName: string;
  themeColor: string;
  userName: string;
  resetUrl: string;
}) {
  const bodyHtml = `
    <p style="margin:0 0 20px;font-size:14px;color:#333333;line-height:1.5;">
      Hi ${opts.userName}, we received a request to reset your Motiq password for ${opts.companyName}. This link expires in 30 minutes.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:10px;background-color:${opts.themeColor};">
          <a href="${opts.resetUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Reset Password</a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#999999;">
      If you didn't request this, you can safely ignore this email.
    </p>`;
  return {
    subject: `Reset Your Password — ${opts.companyName}`,
    html: shell({ ...opts, heading: "Reset Your Password", bodyHtml }),
  };
}
