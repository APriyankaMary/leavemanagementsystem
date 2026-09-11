/**
 * Email Notification Service
 * Generates responsive, executive-styled HTML email templates for leave lifecycle events
 */

const { addEmail } = require("../data/store");

const STATUS_THEMES = {
  LEAVE_APPLIED: {
    color: "#2563eb",
    bgColor: "#eff6ff",
    badge: "Application Received",
    icon: "📝"
  },
  LEAVE_APPROVED: {
    color: "#16a34a",
    bgColor: "#f0fdf4",
    badge: "Approved",
    icon: "✅"
  },
  LEAVE_REJECTED: {
    color: "#dc2626",
    bgColor: "#fef2f2",
    badge: "Rejected",
    icon: "❌"
  },
  LEAVE_CANCELLED: {
    color: "#64748b",
    bgColor: "#f8fafc",
    badge: "Cancelled",
    icon: "⚪"
  },
  PENDING_REMINDER: {
    color: "#d97706",
    bgColor: "#fffbeb",
    badge: "Pending Review",
    icon: "⏳"
  }
};

function generateEmailTemplate({ type, recipientName, leave, customNote }) {
  const theme = STATUS_THEMES[type] || STATUS_THEMES.LEAVE_APPLIED;
  const leavePeriod = `${leave.startDate} to ${leave.endDate} (${leave.days} day${leave.days > 1 ? "s" : ""})`;

  let messageBody = "";
  let subject = "";

  switch (type) {
    case "LEAVE_APPLIED":
      subject = `[Leave Applied] Confirmation: Leave Request Submitted for ${leavePeriod}`;
      messageBody = `
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Your leave request for <strong>${leavePeriod}</strong> has been successfully submitted and logged into the HR Portal.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          It is currently awaiting review by your manager, <strong>${leave.managerName}</strong>. You will receive an automated notification as soon as your request is reviewed.
        </p>
      `;
      break;

    case "LEAVE_APPROVED":
      subject = `[Leave Approved] Your Leave Request for ${leavePeriod} Has Been Approved`;
      messageBody = `
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 16px; font-weight: 600; line-height: 1.6; color: #16a34a;">
          🎉 Good news! Your leave request for ${leavePeriod} has been approved by your manager, ${leave.managerName}.
        </p>
        ${
          customNote
            ? `<div style="background-color: #f1f5f9; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #334155;">
                 <strong>Manager Note:</strong> "${customNote}"
               </div>`
            : ""
        }
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Your workplace calendar has been automatically marked as Out-Of-Office for these dates.
        </p>
      `;
      break;

    case "LEAVE_REJECTED":
      subject = `[Leave Rejected] Update on Leave Request for ${leavePeriod}`;
      messageBody = `
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #dc2626;">
          Your leave request for <strong>${leavePeriod}</strong> was not approved by ${leave.managerName}.
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; border-radius: 4px; color: #991b1b;">
          <strong>Reason Provided:</strong> ${customNote || "Business/coverage constraints during this requested period."}
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Please consult directly with your manager if you wish to discuss alternative dates.
        </p>
      `;
      break;

    case "LEAVE_CANCELLED":
      subject = `[Leave Cancelled] Leave Request for ${leavePeriod} Cancelled`;
      messageBody = `
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Your leave request for <strong>${leavePeriod}</strong> has been cancelled.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Your leave balance has been adjusted accordingly, and Out-of-Office calendar holds have been removed.
        </p>
      `;
      break;

    case "PENDING_REMINDER":
      subject = `[Pending Review] Reminder: Leave Request for ${leavePeriod} Awaiting Action`;
      messageBody = `
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hello <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #d97706;">
          Your leave request for <strong>${leavePeriod}</strong> is currently pending manager approval.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          A status reminder notification has been flagged for ${leave.managerName}.
        </p>
      `;
      break;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="padding: 24px 32px; background: #0f172a; border-bottom: 3px solid ${theme.color};">
        <table width="100%">
          <tr>
            <td>
              <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">ACME HR Portal</span>
              <span style="display: block; font-size: 12px; color: #94a3b8; margin-top: 4px;">Automated Employee Leave Notifications</span>
            </td>
            <td align="right">
              <span style="display: inline-block; background-color: ${theme.color}; color: #ffffff; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
                ${theme.icon} ${theme.badge}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        ${messageBody}

        <!-- Details Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; background-color: ${theme.bgColor}; border: 1px solid ${theme.color}33; border-radius: 6px; padding: 16px;">
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #64748b; width: 35%;"><strong>Request Reference:</strong></td>
            <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-family: monospace; font-weight: 600;">${leave.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #64748b;"><strong>Leave Category:</strong></td>
            <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 500;">${leave.leaveType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #64748b;"><strong>Requested Dates:</strong></td>
            <td style="padding: 8px 12px; font-size: 13px; color: #0f172a; font-weight: 600;">${leavePeriod}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #64748b;"><strong>Reason Stated:</strong></td>
            <td style="padding: 8px 12px; font-size: 13px; color: #0f172a;">${leave.reason || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-size: 13px; color: #64748b;"><strong>Reviewing Manager:</strong></td>
            <td style="padding: 8px 12px; font-size: 13px; color: #0f172a;">${leave.managerName}</td>
          </tr>
        </table>

        <!-- Action CTA -->
        <div style="margin-top: 28px; text-align: center;">
          <a href="#" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 6px;">
            Open HR Portal
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        This is an automated operational notification sent by ACME Human Resources Information System (HRIS).
        <br>
        © ${new Date().getFullYear()} ACME Corporation. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

function sendEmailNotification({ type, recipientName, recipientEmail, leave, customNote }) {
  const { subject, html } = generateEmailTemplate({
    type,
    recipientName,
    leave,
    customNote
  });

  const emailRecord = {
    id: `EML-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    to: recipientEmail,
    from: "hr-notifications@acmecorp.com",
    subject,
    statusType: type,
    leaveId: leave.id,
    sentAt: new Date().toISOString(),
    htmlBody: html
  };

  addEmail(emailRecord);
  return emailRecord;
}

// Ensure seed email is populated with rich template
try {
  const { getLeaves, getEmailInbox } = require("../data/store");
  const leaves = getLeaves();
  const emails = getEmailInbox();
  if (leaves.length > 0 && emails.length > 0 && !emails[0].htmlBody) {
    const tpl = generateEmailTemplate({
      type: "LEAVE_APPLIED",
      recipientName: leaves[0].employeeName,
      leave: leaves[0]
    });
    emails[0].htmlBody = tpl.html;
  }
} catch (e) {
  // safe fallback
}

module.exports = {
  sendEmailNotification,
  generateEmailTemplate
};
