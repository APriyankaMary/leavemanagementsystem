/**
 * Central Notification Dispatcher Service
 * Coordinates In-App Notifications (SSE), Email Dispatch, and ServiceNow Integration
 */

const { addNotification } = require("../data/store");
const { sendEmailNotification } = require("./emailService");
const { dispatchServiceNowNotification } = require("./serviceNowService");

// SSE active connection subscribers
const activeSSEClients = new Set();

function registerSSEClient(res) {
  activeSSEClients.add(res);
}

function removeSSEClient(res) {
  activeSSEClients.delete(res);
}

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  activeSSEClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      activeSSEClients.delete(client);
    }
  });
}

/**
 * Dispatches notification across In-App, Email, and ServiceNow channels
 */
function notifyLeaveStatusChange({ type, leave, actor, note }) {
  let title = "";
  let message = "";
  const leavePeriod = `${leave.startDate} to ${leave.endDate}`;

  switch (type) {
    case "LEAVE_APPLIED":
      title = "Leave Request Submitted";
      message = `Your leave request for ${leavePeriod} (${leave.leaveType}) was submitted and is pending review by ${leave.managerName}.`;
      break;

    case "LEAVE_APPROVED":
      title = "Leave Request Approved";
      message = `Your leave request for ${leavePeriod} has been approved by your manager, ${leave.managerName}.`;
      break;

    case "LEAVE_REJECTED":
      title = "Leave Request Rejected";
      message = `Your leave request for ${leavePeriod} was rejected by ${leave.managerName}.${note ? ` Reason: ${note}` : ""}`;
      break;

    case "LEAVE_CANCELLED":
      title = "Leave Request Cancelled";
      message = `Your leave request for ${leavePeriod} has been cancelled by ${actor || "you"}.`;
      break;

    case "PENDING_REMINDER":
      title = "Pending Approval Reminder";
      message = `Your leave request for ${leavePeriod} is still waiting for manager approval from ${leave.managerName}.`;
      break;

    default:
      title = "Leave Status Update";
      message = `Your leave request for ${leavePeriod} is now ${leave.status}.`;
  }

  // 1. In-App Notification record
  const notificationRecord = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    leaveId: leave.id,
    recipientId: leave.employeeId,
    recipientEmail: leave.employeeEmail,
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    isRead: false,
    channels: ["IN_APP", "EMAIL", "SERVICENOW"],
    meta: {
      leaveType: leave.leaveType,
      dates: leavePeriod,
      status: leave.status,
      actor,
      note
    }
  };

  addNotification(notificationRecord);

  // 2. Email Notification Dispatch
  const emailRecord = sendEmailNotification({
    type,
    recipientName: leave.employeeName,
    recipientEmail: leave.employeeEmail,
    leave,
    customNote: note
  });

  // 3. ServiceNow Enterprise Notification Dispatch
  const snLog = dispatchServiceNowNotification({
    type,
    leave,
    recipientEmail: leave.employeeEmail,
    title,
    message
  });

  // 4. Real-time In-App Push over Server-Sent Events (SSE)
  broadcastSSE("leave_notification", {
    notification: notificationRecord,
    email: emailRecord,
    serviceNow: snLog,
    leave
  });

  return {
    notification: notificationRecord,
    email: emailRecord,
    serviceNow: snLog
  };
}

module.exports = {
  registerSSEClient,
  removeSSEClient,
  broadcastSSE,
  notifyLeaveStatusChange
};
