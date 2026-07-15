import nodemailer from 'nodemailer';
import config from '../config';

// ---------------------------------------------------------------------------
// Transporter
// ---------------------------------------------------------------------------

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

// ---------------------------------------------------------------------------
// HTML Template — JENEUS branding
// ---------------------------------------------------------------------------

function buildHtmlBody(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JENEUS HelpDesk</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">JENEUS HelpDesk</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;text-align:center">
              <p style="margin:0;color:#6b7280;font-size:12px">
                JENEUS HelpDesk &mdash; ITSM Platform<br/>
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email through the configured SMTP transporter.
 * Wraps the provided HTML in the JENEUS branded template.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  await transporter.sendMail({
    from: `"JENEUS HelpDesk" <${config.smtp.from}>`,
    to,
    subject,
    html: buildHtmlBody(html),
  });
}
