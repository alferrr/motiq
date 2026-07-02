type CompanyInfo = {
  companyName: string;
  themeColor: string;
  companyEmail?: string | null;
  companyContact?: string | null;
  companyAddress?: string | null;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  const initial = opts.companyName.charAt(0).toUpperCase();
  const year = new Date().getFullYear();

  const logoMark = `
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
      <tr>
        <td width="48" height="48" style="background-color:${opts.themeColor};border-radius:12px;text-align:center;vertical-align:middle;">
          <span style="display:inline-block;color:#ffffff;font-size:20px;font-weight:700;line-height:48px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${initial}</span>
        </td>
      </tr>
    </table>`;

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
      <span style="word-break:break-all;color:#666666;">${opts.cta.url}</span>
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
    opts.companyEmail ? `<span style="display:block;margin:0 0 4px;">${opts.companyEmail}</span>` : "",
    opts.companyContact ? `<span style="display:block;margin:0 0 4px;">${opts.companyContact}</span>` : "",
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

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#e9eaee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#e9eaee;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;">
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
                <p style="margin:4px 0 0;font-size:11px;color:#cccccc;">Sent via Motiq</p>
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
        (opts.reportedIssue ? row("Reported Issue", escapeHtml(opts.reportedIssue)) : ""),
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
      detailsRows: row("Job Order", `#${opts.jobId}`) + row("Vehicle", escapeHtml(opts.vehicle)),
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
  },
) {
  return {
    subject: `Invoice #${opts.invoiceId} — ${formatPeso(opts.totalAmount)} Due`,
    html: shell({
      ...opts,
      heading: "Invoice Generated",
      subheading: `Invoice from ${opts.companyName}`,
      greetingName: opts.customerName,
      bodyText: `An invoice has been generated for your recent service. ${opts.companyName} will share a payment link with you shortly.`,
      detailsRows:
        row("Invoice", `#${opts.invoiceId}`) +
        row("Vehicle", escapeHtml(opts.vehicle)) +
        row("Date Issued", formatDate(opts.dateIssued)) +
        row("Amount Due", formatPeso(opts.totalAmount)),
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
      bodyText: "We've received your payment. This receipt is for your records.",
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
