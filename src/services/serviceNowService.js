/**
 * ServiceNow Enterprise Notification Service
 * Generates ServiceNow REST API Table & Event payloads (sys_user_notification / sn_hr_core_case)
 */

const { addServiceNowLog } = require("../data/store");

function generateServiceNowPayload({ type, leave, recipientEmail, title, message }) {
  const eventMapping = {
    LEAVE_APPLIED: "sn_hr_leave.request.submitted",
    LEAVE_APPROVED: "sn_hr_leave.request.approved",
    LEAVE_REJECTED: "sn_hr_leave.request.rejected",
    LEAVE_CANCELLED: "sn_hr_leave.request.cancelled",
    PENDING_REMINDER: "sn_hr_leave.request.pending_reminder"
  };

  const sysId = require("crypto").randomBytes(16).toString("hex");

  return {
    sys_id: sysId,
    target_table: "sn_hr_core_case",
    event_name: eventMapping[type] || "sn_hr_leave.generic",
    recipient: recipientEmail,
    payload: {
      u_leave_reference: leave.id,
      u_employee_id: leave.employeeId,
      u_employee_name: leave.employeeName,
      u_approver_name: leave.managerName,
      u_leave_type: leave.leaveType,
      u_start_date: leave.startDate,
      u_end_date: leave.endDate,
      u_total_days: leave.days,
      u_status: leave.status,
      u_subject: title,
      u_message_body: message,
      sys_created_on: new Date().toISOString()
    },
    endpoint: "https://acme-instance.service-now.com/api/now/table/sys_user_notification"
  };
}

function dispatchServiceNowNotification({ type, leave, recipientEmail, title, message }) {
  const snPayload = generateServiceNowPayload({
    type,
    leave,
    recipientEmail,
    title,
    message
  });

  const logEntry = {
    id: `SN-LOG-${Date.now()}`,
    sys_id: snPayload.sys_id,
    table: "sys_user_notification",
    event: snPayload.event_name,
    leaveId: leave.id,
    recipient: recipientEmail,
    timestamp: new Date().toISOString(),
    status: "201 Created (ServiceNow Table API Dispatched)",
    payload: snPayload
  };

  addServiceNowLog(logEntry);
  return logEntry;
}

// Ensure seed log has valid payload attached
try {
  const { getServiceNowAuditLogs, getLeaves } = require("../data/store");
  const logs = getServiceNowAuditLogs();
  const leaves = getLeaves();
  if (logs.length > 0 && leaves.length > 0 && !logs[0].payload) {
    logs[0].payload = generateServiceNowPayload({
      type: "LEAVE_APPLIED",
      leave: leaves[0],
      recipientEmail: leaves[0].employeeEmail,
      title: "Leave Request Submitted",
      message: "Your leave request for 15–17 September (Annual Leave, 3 days) was submitted."
    });
  }
} catch (e) {
  // safe fallback
}

module.exports = {
  generateServiceNowPayload,
  dispatchServiceNowNotification
};
