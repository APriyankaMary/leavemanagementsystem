/**
 * API Client Module
 * Communicates with the backend REST endpoints
 */

const API = {
  // Leaves
  async getLeaves(employeeId = null) {
    const url = employeeId ? `/api/leaves?employeeId=${employeeId}` : "/api/leaves";
    const res = await fetch(url);
    return res.json();
  },

  async applyLeave(payload) {
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async approveLeave(leaveId, note) {
    const res = await fetch(`/api/leaves/${leaveId}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note })
    });
    return res.json();
  },

  async rejectLeave(leaveId, reason) {
    const res = await fetch(`/api/leaves/${leaveId}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async cancelLeave(leaveId, reason) {
    const res = await fetch(`/api/leaves/${leaveId}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  async sendPendingReminder(leaveId) {
    const res = await fetch(`/api/leaves/${leaveId}/remind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    return res.json();
  },

  // Notifications
  async getNotifications(recipientId = null) {
    const url = recipientId ? `/api/notifications?recipientId=${recipientId}` : "/api/notifications";
    const res = await fetch(url);
    return res.json();
  },

  async markAsRead(notificationId) {
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PATCH"
    });
    return res.json();
  },

  async markAllAsRead(recipientId = null) {
    const res = await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId })
    });
    return res.json();
  },

  // Emails
  async getEmails() {
    const res = await fetch("/api/emails");
    return res.json();
  },

  // ServiceNow Logs
  async getServiceNowLogs() {
    const res = await fetch("/api/servicenow/logs");
    return res.json();
  }
};
