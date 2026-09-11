/**
 * In-Memory Data Store with Seed Data
 * Manages Leave Requests, Users, and Notification History
 */

const users = {
  employee: {
    id: "EMP001",
    name: "Alex Johnson",
    role: "Senior Software Engineer",
    email: "alex.johnson@acmecorp.com",
    department: "Frontend Engineering",
    managerId: "MGR001",
    managerName: "Sarah Connor",
    avatar: "AJ"
  },
  manager: {
    id: "MGR001",
    name: "Sarah Connor",
    role: "Engineering Director",
    email: "sarah.connor@acmecorp.com",
    department: "Product Engineering",
    avatar: "SC"
  }
};

let leaveRequests = [
  {
    id: "LV-2026-001",
    employeeId: "EMP001",
    employeeName: "Alex Johnson",
    employeeEmail: "alex.johnson@acmecorp.com",
    managerId: "MGR001",
    managerName: "Sarah Connor",
    leaveType: "Annual Leave",
    startDate: "2026-09-15",
    endDate: "2026-09-17",
    days: 3,
    reason: "Attending annual family gathering and personal rest.",
    status: "PENDING_APPROVAL", // PENDING_APPROVAL | APPROVED | REJECTED | CANCELLED
    appliedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(), // 4 hrs ago
    history: [
      {
        status: "PENDING_APPROVAL",
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        actor: "Alex Johnson (Employee)",
        note: "Submitted request for 3 days."
      }
    ]
  },
  {
    id: "LV-2026-002",
    employeeId: "EMP001",
    employeeName: "Alex Johnson",
    employeeEmail: "alex.johnson@acmecorp.com",
    managerId: "MGR001",
    managerName: "Sarah Connor",
    leaveType: "Sick Leave",
    startDate: "2026-08-10",
    endDate: "2026-08-11",
    days: 2,
    reason: "Seasonal flu and doctor appointment.",
    status: "APPROVED",
    appliedAt: new Date(Date.now() - 86400 * 1000 * 30).toISOString(),
    history: [
      {
        status: "PENDING_APPROVAL",
        timestamp: new Date(Date.now() - 86400 * 1000 * 30).toISOString(),
        actor: "Alex Johnson (Employee)",
        note: "Submitted request for 2 days."
      },
      {
        status: "APPROVED",
        timestamp: new Date(Date.now() - 86400 * 1000 * 29).toISOString(),
        actor: "Sarah Connor (Manager)",
        note: "Approved. Take care and get well soon!"
      }
    ]
  }
];

let notifications = [
  {
    id: "NTF-101",
    leaveId: "LV-2026-001",
    recipientId: "EMP001",
    recipientEmail: "alex.johnson@acmecorp.com",
    type: "LEAVE_APPLIED",
    title: "Leave Request Submitted",
    message: "Your leave request for 15–17 September (Annual Leave, 3 days) was submitted and is pending approval from Sarah Connor.",
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    isRead: false,
    channels: ["IN_APP", "EMAIL", "SERVICENOW"],
    meta: {
      leaveType: "Annual Leave",
      dates: "15–17 September 2026",
      status: "PENDING_APPROVAL"
    }
  },
  {
    id: "NTF-100",
    leaveId: "LV-2026-002",
    recipientId: "EMP001",
    recipientEmail: "alex.johnson@acmecorp.com",
    type: "LEAVE_APPROVED",
    title: "Leave Request Approved",
    message: "Your leave request for 10–11 August has been approved by your manager Sarah Connor.",
    timestamp: new Date(Date.now() - 86400 * 1000 * 29).toISOString(),
    isRead: true,
    channels: ["IN_APP", "EMAIL", "SERVICENOW"],
    meta: {
      leaveType: "Sick Leave",
      dates: "10–11 August 2026",
      status: "APPROVED"
    }
  }
];

// In-memory simulated email inbox storage (to let users visually inspect sent emails)
let emailInbox = [
  {
    id: "EML-101",
    to: "alex.johnson@acmecorp.com",
    from: "hr-notifications@acmecorp.com",
    subject: "Confirmation: Leave Request Submitted (15–17 Sep)",
    sentAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    statusType: "LEAVE_APPLIED",
    leaveId: "LV-2026-001",
    htmlBody: "" // will be populated via template
  }
];

// In-memory ServiceNow audit log
let serviceNowAuditLogs = [
  {
    id: "SN-LOG-101",
    sys_id: "a3f890b247103110e52b690cd36d4391",
    table: "sys_user_notification",
    event: "hr_leave.applied",
    leaveId: "LV-2026-001",
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    status: "Processed (HTTP 201 Created)"
  }
];

module.exports = {
  users,
  getLeaves: () => leaveRequests,
  getLeaveById: (id) => leaveRequests.find((l) => l.id === id),
  addLeave: (leave) => {
    leaveRequests.unshift(leave);
    return leave;
  },
  updateLeave: (id, updates) => {
    const idx = leaveRequests.findIndex((l) => l.id === id);
    if (idx !== -1) {
      leaveRequests[idx] = { ...leaveRequests[idx], ...updates };
      return leaveRequests[idx];
    }
    return null;
  },
  getNotifications: (recipientId) => {
    if (recipientId) {
      return notifications.filter((n) => n.recipientId === recipientId || n.recipientId === "ALL");
    }
    return notifications;
  },
  addNotification: (notification) => {
    notifications.unshift(notification);
    return notification;
  },
  markNotificationAsRead: (id) => {
    const item = notifications.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      return item;
    }
    return null;
  },
  markAllNotificationsAsRead: (recipientId) => {
    notifications.forEach((n) => {
      if (!recipientId || n.recipientId === recipientId || n.recipientId === "ALL") {
        n.isRead = true;
      }
    });
    return true;
  },
  getEmailInbox: () => emailInbox,
  addEmail: (email) => {
    emailInbox.unshift(email);
    return email;
  },
  getServiceNowAuditLogs: () => serviceNowAuditLogs,
  addServiceNowLog: (log) => {
    serviceNowAuditLogs.unshift(log);
    return log;
  }
};
