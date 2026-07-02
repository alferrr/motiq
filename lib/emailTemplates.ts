type CompanyInfo = {
  companyName: string;
  themeColor: string;
  companyEmail?: string | null;
  companyContact?: string | null;
  companyAddress?: string | null;
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function shell(
  opts: CompanyInfo & {
    heading: string;
    subheading: string;
    greetingName: string;
    bodyText: string;
    detailsRows?: string; // pre-built <tr> rows, or omit
    cta?: { label: string; url: string };
    notice?: { title: string; text: string };
  },
) {
  const year = new Date().getFullYear();

  const logoMark = `
    <p style="margin:0 0 20px;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:26px;font-weight:300;letter-spacing:-0.02em;color:${opts.themeColor};">MOTIQ</p>`;

  const ctaBlock = opts.cta
    ? `
    <table cellpadding="0" cellspacing="0" style="margin:8px auto 24px;">
      <tr>
        <td style="border-radius:10px;background-color:${opts.themeColor};">
          <a href="${opts.cta.url}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${opts.cta.label}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:12px;color:#999999;text-align:center;">
      Or copy and paste this link into your browser:<br />
      <a href="${opts.cta.url}" style="word-break:break-all;color:#111111;text-decoration:underline;">${opts.cta.url}</a>
    </p>`
    : "";

  const detailsBlock = opts.detailsRows
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">${opts.detailsRows}</table>
        </td>
      </tr>
    </table>`
    : "";

  const noticeBlock = opts.notice
    ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111111;">${opts.notice.title}</p>
          <p style="margin:0;font-size:12px;color:#777777;line-height:1.5;">${opts.notice.text}</p>
        </td>
      </tr>
    </table>`
    : "";

  const contactRows = [
    opts.companyEmail
      ? `<a href="mailto:${opts.companyEmail}" style="display:block;margin:0 0 4px;color:#111111;text-decoration:none;">${opts.companyEmail}</a>`
      : "",
    opts.companyContact
      ? `<a href="tel:${opts.companyContact.replace(/[^+\d]/g, "")}" style="display:block;margin:0 0 4px;color:#111111;text-decoration:none;">${opts.companyContact}</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const needHelpBlock = contactRows
    ? `
    <tr><td style="padding:0 40px;"><div style="border-top:1px solid #eee;"></div></td></tr>
    <tr>
      <td style="padding:24px 40px 32px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111111;">Need Help?</p>
        <p style="margin:0 0 8px;font-size:13px;color:#666666;">Contact ${opts.companyName} directly:</p>
        <div style="font-size:13px;color:#666666;line-height:1.6;">${contactRows}</div>
      </td>
    </tr>`
    : "";

  const fontStack =
    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background-color:#e9eaee;font-family:${fontStack};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9eaee;padding:40px 16px;font-family:${fontStack};">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;font-family:${fontStack};">
            <tr>
              <td style="padding:40px 40px 24px;text-align:center;">
                ${logoMark}
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111111;">${opts.heading}</h1>
                <p style="margin:0;font-size:14px;color:#888888;">${opts.subheading}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                <p style="margin:0 0 16px;font-size:14px;color:#333333;text-align:left;">Hello ${opts.greetingName},</p>
                <p style="margin:0 0 24px;font-size:14px;color:#333333;line-height:1.6;text-align:left;">${opts.bodyText}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;text-align:center;">
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;">
                ${detailsBlock}
                ${noticeBlock}
              </td>
            </tr>
            ${needHelpBlock}
            <tr>
              <td style="background-color:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                <p style="margin:0;font-size:11px;color:#999999;">© ${year} ${opts.companyName}. All rights reserved.</p>
                ${opts.companyAddress ? `<p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">${opts.companyAddress}</p>` : ""}
                <p style="margin:4px 0 0;font-size:11px;color:#cccccc;">Powered by Motiq</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function row(label: string, value: string, bold = false) {
  const border = bold ? "border-top:1px solid #e5e5e5;padding-top:10px;" : "";
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:${bold ? "#111111" : "#888888"};font-weight:${bold ? 700 : 400};${border}">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111111;font-weight:${bold ? 700 : 500};text-align:right;${border}">${value}</td>
  </tr>`;
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

export function appointmentConfirmationEmail(
  opts: CompanyInfo & {
    customerName: string;
    vehicle: string;
    date: string;
    time: string;
    reason?: string | null;
  },
) {
  return {
    subject: `Appointment Confirmed — ${opts.companyName}`,
    html: shell({
      ...opts,
      heading: "Appointment Confirmed",
      subheading: `Your appointment with ${opts.companyName} is booked`,
      greetingName: opts.customerName,
      bodyText:
        "Your appointment has been scheduled. Please arrive a few minutes early — see the details below.",
      detailsRows:
        row("Vehicle", escapeHtml(opts.vehicle)) +
        row("Date", formatDate(opts.date)) +
        row("Time", opts.time) +
        (opts.reason ? row("Reason", escapeHtml(opts.reason)) : ""),
    }),
  };
}

export function jobOrderCreatedEmail(
  opts: CompanyInfo & {
    customerName: string;
    jobId: number;
    vehicle: string;
    jobDate: string;
    reportedIssue?: string | null;
  },
) {
  return {
    subject: `Job Order #${opts.jobId} Created — ${opts.companyName}`,
    html: shell({
      ...opts,
      heading: "Job Order Created",
      subheading: "We've started work on your vehicle",
      greetingName: opts.customerName,
      bodyText:
        "We've opened a job order for your vehicle. We'll notify you once it's ready for pickup.",
      detailsRows:
        row("Job Order", `#${opts.jobId}`) +
        row("Vehicle", escapeHtml(opts.vehicle)) +
        row("Date", formatDate(opts.jobDate)) +
        (opts.reportedIssue
          ? row("Reported Issue", escapeHtml(opts.reportedIssue))
          : ""),
    }),
  };
}

export function jobReadyEmail(
  opts: CompanyInfo & {
    customerName: string;
    jobId: number;
    vehicle: string;
  },
) {
  return {
    subject: `Your Vehicle Is Ready — ${opts.companyName}`,
    html: shell({
      ...opts,
      heading: "Vehicle Ready for Pickup",
      subheading: `Great news from ${opts.companyName}`,
      greetingName: opts.customerName,
      bodyText:
        "Your vehicle is ready for pickup. Please contact us to arrange a convenient time.",
      detailsRows:
        row("Job Order", `#${opts.jobId}`) +
        row("Vehicle", escapeHtml(opts.vehicle)),
    }),
  };
}

export function jobUpdatedEmail(
  opts: CompanyInfo & {
    customerName: string;
    jobId: number;
    vehicle: string;
    status: string;
    changes: { label: string; value: string }[];
  },
) {
  return {
    subject: `Job Order #${opts.jobId} Updated — ${opts.companyName}`,
    html: shell({
      ...opts,
      heading: "Job Order Updated",
      subheading: `Update on your vehicle at ${opts.companyName}`,
      greetingName: opts.customerName,
      bodyText: `There's an update on job order #${opts.jobId} for your ${escapeHtml(opts.vehicle)}.`,
      detailsRows:
        row("Job Order", `#${opts.jobId}`) +
        row("Vehicle", escapeHtml(opts.vehicle)) +
        row("Status", escapeHtml(opts.status)) +
        opts.changes.map((c) => row(c.label, escapeHtml(c.value))).join(""),
    }),
  };
}

export function invoiceGeneratedEmail(
  opts: CompanyInfo & {
    customerName: string;
    invoiceId: number;
    vehicle: string;
    totalAmount: number;
    dateIssued: string;
    paymentUrl?: string | null;
    lineItems?: { label: string; amount: number }[];
  },
) {
  const breakdownRows = (opts.lineItems ?? [])
    .map((li) => row(escapeHtml(li.label), formatPeso(li.amount)))
    .join("");

  return {
    subject: `Invoice #${opts.invoiceId} — ${formatPeso(opts.totalAmount)} Due`,
    html: shell({
      ...opts,
      heading: "Invoice Generated",
      subheading: `Invoice from ${opts.companyName}`,
      greetingName: opts.customerName,
      bodyText:
        opts.paymentUrl && opts.totalAmount > 0
          ? "Your vehicle is now ready for pickup. An invoice has been generated for your recent service. You can pay online using the button below."
          : `Your vehicle is now ready for pickup. An invoice has been generated for your recent service. ${opts.companyName} will share a payment link with you shortly.`,
      detailsRows:
        row("Invoice", `#${opts.invoiceId}`) +
        row("Vehicle", escapeHtml(opts.vehicle)) +
        row("Date Issued", formatDate(opts.dateIssued)) +
        breakdownRows +
        row("Total Due", formatPeso(opts.totalAmount), true),
      cta:
        opts.paymentUrl && opts.totalAmount > 0
          ? { label: "Pay Now", url: opts.paymentUrl }
          : undefined,
    }),
  };
}

export function paymentReceiptEmail(
  opts: CompanyInfo & {
    customerName: string;
    invoiceId: number;
    amountPaid: number;
    method: string;
    balance: number;
    invoiceStatus: string;
  },
) {
  return {
    subject: `Payment Received — Invoice #${opts.invoiceId}`,
    html: shell({
      ...opts,
      heading: "Payment Receipt",
      subheading: "Thank you for your payment",
      greetingName: opts.customerName,
      bodyText:
        "We've received your payment. This receipt is for your records.",
      detailsRows:
        row("Invoice", `#${opts.invoiceId}`) +
        row("Amount Paid", formatPeso(opts.amountPaid)) +
        row("Method", escapeHtml(opts.method)) +
        row(
          "Remaining Balance",
          opts.balance > 0 ? formatPeso(opts.balance) : "₱0.00 (Paid in full)",
        ),
    }),
  };
}

export function passwordResetEmail(
  opts: CompanyInfo & {
    userName: string;
    resetUrl: string;
  },
) {
  return {
    subject: `Reset Your Password — ${opts.companyName}`,
    html: shell({
      ...opts,
      heading: "Reset Your Password",
      subheading: `Requested for your ${opts.companyName} account`,
      greetingName: opts.userName,
      bodyText:
        "We received a request to reset your Motiq password. Click the button below to choose a new one.",
      cta: { label: "Reset Password", url: opts.resetUrl },
      notice: {
        title: "Security Notice",
        text: "This link will expire in 30 minutes. If you didn't request this, you can safely ignore this email.",
      },
    }),
  };
}
