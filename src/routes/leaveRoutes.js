/**
 * Leave Management Routes Handler
 */

const { getLeaves, getLeaveById, addLeave, updateLeave, users } = require("../data/store");
const { notifyLeaveStatusChange } = require("../services/notificationService");

function calculateDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isNaN(diffDays) || diffDays < 1 ? 1 : diffDays;
}

function handleLeaveRoutes(req, res, url, body) {
  // GET /api/leaves
  if (req.method === "GET" && url.pathname === "/api/leaves") {
    const employeeId = url.searchParams.get("employeeId");
    let list = getLeaves();
    if (employeeId) {
      list = list.filter((l) => l.employeeId === employeeId);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: list }));
  }

  // GET /api/leaves/:id
  const singleMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)$/);
  if (req.method === "GET" && singleMatch) {
    const leave = getLeaveById(singleMatch[1]);
    if (!leave) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Leave request not found" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: leave }));
  }

  // POST /api/leaves - Apply for leave
  if (req.method === "POST" && url.pathname === "/api/leaves") {
    const { leaveType, startDate, endDate, reason } = body || {};

    if (!leaveType || !startDate || !endDate) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ success: false, error: "leaveType, startDate, and endDate are required" })
      );
    }

    const days = calculateDays(startDate, endDate);
    const leaveId = `LV-${new Date().getFullYear()}-${String(getLeaves().length + 1).padStart(3, "0")}`;

    const newLeave = {
      id: leaveId,
      employeeId: users.employee.id,
      employeeName: users.employee.name,
      employeeEmail: users.employee.email,
      managerId: users.manager.id,
      managerName: users.manager.name,
      leaveType,
      startDate,
      endDate,
      days,
      reason: reason || "Personal reasons",
      status: "PENDING_APPROVAL",
      appliedAt: new Date().toISOString(),
      history: [
        {
          status: "PENDING_APPROVAL",
          timestamp: new Date().toISOString(),
          actor: `${users.employee.name} (Employee)`,
          note: `Submitted application for ${days} day(s).`
        }
      ]
    };

    addLeave(newLeave);

    // Trigger Leave Applied Notification
    const dispatched = notifyLeaveStatusChange({
      type: "LEAVE_APPLIED",
      leave: newLeave,
      actor: users.employee.name
    });

    res.writeHead(201, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: newLeave, dispatched }));
  }

  // PATCH /api/leaves/:id/approve - Manager approves
  const approveMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)\/approve$/);
  if (req.method === "PATCH" && approveMatch) {
    const leaveId = approveMatch[1];
    const leave = getLeaveById(leaveId);

    if (!leave) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Leave request not found" }));
    }

    if (leave.status !== "PENDING_APPROVAL") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ success: false, error: `Cannot approve request with status '${leave.status}'` })
      );
    }

    const note = body?.note || "Approved without conditions.";
    const updatedHistory = [
      ...leave.history,
      {
        status: "APPROVED",
        timestamp: new Date().toISOString(),
        actor: `${users.manager.name} (Manager)`,
        note
      }
    ];

    const updated = updateLeave(leaveId, {
      status: "APPROVED",
      history: updatedHistory
    });

    const dispatched = notifyLeaveStatusChange({
      type: "LEAVE_APPROVED",
      leave: updated,
      actor: users.manager.name,
      note
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: updated, dispatched }));
  }

  // PATCH /api/leaves/:id/reject - Manager rejects
  const rejectMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)\/reject$/);
  if (req.method === "PATCH" && rejectMatch) {
    const leaveId = rejectMatch[1];
    const leave = getLeaveById(leaveId);

    if (!leave) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Leave request not found" }));
    }

    if (leave.status !== "PENDING_APPROVAL") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ success: false, error: `Cannot reject request with status '${leave.status}'` })
      );
    }

    const reason = body?.reason || "Operational requirements during requested dates.";
    const updatedHistory = [
      ...leave.history,
      {
        status: "REJECTED",
        timestamp: new Date().toISOString(),
        actor: `${users.manager.name} (Manager)`,
        note: reason
      }
    ];

    const updated = updateLeave(leaveId, {
      status: "REJECTED",
      history: updatedHistory
    });

    const dispatched = notifyLeaveStatusChange({
      type: "LEAVE_REJECTED",
      leave: updated,
      actor: users.manager.name,
      note: reason
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: updated, dispatched }));
  }

  // PATCH /api/leaves/:id/cancel - Employee cancels
  const cancelMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)\/cancel$/);
  if (req.method === "PATCH" && cancelMatch) {
    const leaveId = cancelMatch[1];
    const leave = getLeaveById(leaveId);

    if (!leave) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Leave request not found" }));
    }

    if (leave.status === "CANCELLED" || leave.status === "REJECTED") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ success: false, error: `Cannot cancel leave in '${leave.status}' state` })
      );
    }

    const reason = body?.reason || "Cancelled by employee.";
    const updatedHistory = [
      ...leave.history,
      {
        status: "CANCELLED",
        timestamp: new Date().toISOString(),
        actor: `${users.employee.name} (Employee)`,
        note: reason
      }
    ];

    const updated = updateLeave(leaveId, {
      status: "CANCELLED",
      history: updatedHistory
    });

    const dispatched = notifyLeaveStatusChange({
      type: "LEAVE_CANCELLED",
      leave: updated,
      actor: users.employee.name,
      note: reason
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: updated, dispatched }));
  }

  // POST /api/leaves/:id/remind - Pending notification reminder
  const remindMatch = url.pathname.match(/^\/api\/leaves\/([^/]+)\/remind$/);
  if (req.method === "POST" && remindMatch) {
    const leaveId = remindMatch[1];
    const leave = getLeaveById(leaveId);

    if (!leave) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Leave request not found" }));
    }

    if (leave.status !== "PENDING_APPROVAL") {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ success: false, error: `Can only send pending reminders for requests in PENDING_APPROVAL status.` })
      );
    }

    const dispatched = notifyLeaveStatusChange({
      type: "PENDING_REMINDER",
      leave,
      actor: "HR System Reminder Daemon"
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: leave, dispatched }));
  }

  return false; // not handled by leave routes
}

module.exports = {
  handleLeaveRoutes
};
