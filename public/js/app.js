/**
 * Main Application Logic
 * Enterprise Leave Status Notifications Portal
 */

let state = {
  currentRole: "employee", // "employee" or "manager"
  leaves: [],
  notifications: [],
  emails: [],
  serviceNowLogs: [],
  activeFilter: "ALL",
  searchQuery: "",
  selectedEmailId: null
};

// DOM Elements
const personaSelect = document.getElementById("personaSelect");
const portalRoleTitle = document.getElementById("portalRoleTitle");
const portalRoleSubtitle = document.getElementById("portalRoleSubtitle");
const openApplyModalBtn = document.getElementById("openApplyModalBtn");
const leavesTableBody = document.getElementById("leavesTableBody");
const emptyLeavesState = document.getElementById("emptyLeavesState");
const leaveSearchInput = document.getElementById("leaveSearchInput");
const unreadCountBadge = document.getElementById("unreadCountBadge");
const drawerUnreadCount = document.getElementById("drawerUnreadCount");
const notificationBellBtn = document.getElementById("notificationBellBtn");
const notificationDrawer = document.getElementById("notificationDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const drawerNotificationsList = document.getElementById("drawerNotificationsList");
const markAllReadBtn = document.getElementById("markAllReadBtn");

// Modals
const applyModal = document.getElementById("applyModal");
const closeApplyModalBtn = document.getElementById("closeApplyModalBtn");
const cancelApplyModalBtn = document.getElementById("cancelApplyModalBtn");
const applyLeaveForm = document.getElementById("applyLeaveForm");
const startDateInput = document.getElementById("startDateInput");
const endDateInput = document.getElementById("endDateInput");
const calculatedDaysText = document.getElementById("calculatedDaysText");

const managerActionModal = document.getElementById("managerActionModal");
const closeManagerModalBtn = document.getElementById("closeManagerModalBtn");
const cancelManagerModalBtn = document.getElementById("cancelManagerModalBtn");
const managerActionForm = document.getElementById("managerActionForm");
const managerModalTitle = document.getElementById("managerModalTitle");
const managerModalDesc = document.getElementById("managerModalDesc");
const managerNoteLabel = document.getElementById("managerNoteLabel");
const managerNoteInput = document.getElementById("managerNoteInput");
const actionLeaveId = document.getElementById("actionLeaveId");
const actionType = document.getElementById("actionType");

// Email Simulator
const emailSidebarList = document.getElementById("emailSidebarList");
const emailViewerPane = document.getElementById("emailViewerPane");
const refreshEmailsBtn = document.getElementById("refreshEmailsBtn");

// ServiceNow
const serviceNowLogContainer = document.getElementById("serviceNowLogContainer");

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  setupDateDefaults();
  setupEventListeners();
  setupSSE();
  await loadInitialData();
});

function setupDateDefaults() {
  const today = new Date().toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0];
  startDateInput.value = today;
  startDateInput.min = today;
  endDateInput.value = nextWeek;
  endDateInput.min = today;
  updateCalculatedDays();
}

function updateCalculatedDays() {
  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);
  if (!isNaN(start) && !isNaN(end) && end >= start) {
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    calculatedDaysText.textContent = `${diff} day(s)`;
  } else {
    calculatedDaysText.textContent = "Invalid range";
  }
}

async function loadInitialData() {
  try {
    const [leavesRes, ntfRes, emailsRes, snRes] = await Promise.all([
      API.getLeaves(),
      API.getNotifications(),
      API.getEmails(),
      API.getServiceNowLogs()
    ]);

    if (leavesRes.success) state.leaves = leavesRes.data;
    if (ntfRes.success) state.notifications = ntfRes.data;
    if (emailsRes.success) {
      state.emails = emailsRes.data;
      if (state.emails.length > 0) {
        state.selectedEmailId = state.emails[0].id;
      }
    }
    if (snRes.success) state.serviceNowLogs = snRes.data;

    renderAll();
  } catch (err) {
    console.error("Failed to load initial data:", err);
  }
}

// Setup Real-Time Server-Sent Events (SSE)
function setupSSE() {
  const statusEl = document.getElementById("connectionStatus");
  const statusText = document.getElementById("connectionStatusText");

  try {
    const evtSource = new EventSource("/api/notifications/stream");

    evtSource.addEventListener("connected", () => {
      statusEl.className = "status-pill status-connected";
      statusText.textContent = "Live Sync Active";
    });

    evtSource.addEventListener("leave_notification", (event) => {
      const data = JSON.parse(event.data);
      handleLiveNotification(data);
    });

    evtSource.onerror = () => {
      statusEl.className = "status-pill status-disconnected";
      statusText.textContent = "Reconnecting...";
    };
  } catch (err) {
    console.warn("SSE connection error:", err);
  }
}

function handleLiveNotification({ notification, email, serviceNow, leave }) {
  // Update leave record in state
  if (leave) {
    const idx = state.leaves.findIndex((l) => l.id === leave.id);
    if (idx !== -1) {
      state.leaves[idx] = leave;
    } else {
      state.leaves.unshift(leave);
    }
  }

  // Add notification to state
  if (notification) {
    state.notifications.unshift(notification);
    NotificationManager.showToast({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: notification.timestamp
    });
  }

  // Add email to state
  if (email) {
    state.emails.unshift(email);
    state.selectedEmailId = email.id;
  }

  // Add ServiceNow log
  if (serviceNow) {
    state.serviceNowLogs.unshift(serviceNow);
  }

  renderAll();
}

function setupEventListeners() {
  // Persona switcher
  personaSelect.addEventListener("change", (e) => {
    state.currentRole = e.target.value;
    updateRoleView();
    renderLeavesTable();
  });

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activeFilter = chip.dataset.filter;
      renderLeavesTable();
    });
  });

  // Search input
  leaveSearchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderLeavesTable();
  });

  // Date changes
  startDateInput.addEventListener("change", () => {
    if (endDateInput.value < startDateInput.value) {
      endDateInput.value = startDateInput.value;
    }
    endDateInput.min = startDateInput.value;
    updateCalculatedDays();
  });
  endDateInput.addEventListener("change", updateCalculatedDays);

  // Apply Modal Controls
  openApplyModalBtn.addEventListener("click", () => {
    NotificationManager.initAudio();
    applyModal.classList.add("open");
  });
  closeApplyModalBtn.addEventListener("click", () => applyModal.classList.remove("open"));
  cancelApplyModalBtn.addEventListener("click", () => applyModal.classList.remove("open"));

  // Apply Leave Form Submit
  applyLeaveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      leaveType: document.getElementById("leaveTypeSelect").value,
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      reason: document.getElementById("leaveReasonInput").value
    };

    const submitBtn = document.getElementById("submitApplyBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const res = await API.applyLeave(payload);
      if (res.success) {
        applyModal.classList.remove("open");
        applyLeaveForm.reset();
        setupDateDefaults();
      } else {
        alert(res.error || "Failed to submit leave request.");
      }
    } catch (err) {
      alert("Error contacting server.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Leave Application";
    }
  });

  // Notification Drawer
  notificationBellBtn.addEventListener("click", () => {
    NotificationManager.initAudio();
    notificationDrawer.classList.add("open");
    drawerBackdrop.classList.add("open");
  });

  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  markAllReadBtn.addEventListener("click", async () => {
    await API.markAllAsRead();
    state.notifications.forEach((n) => (n.isRead = true));
    renderNotificationsDrawer();
    updateKPIs();
  });

  // Manager Action Modal
  closeManagerModalBtn.addEventListener("click", () => managerActionModal.classList.remove("open"));
  cancelManagerModalBtn.addEventListener("click", () => managerActionModal.classList.remove("open"));

  managerActionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const leaveId = actionLeaveId.value;
    const type = actionType.value;
    const note = managerNoteInput.value;

    const submitBtn = document.getElementById("submitManagerActionBtn");
    submitBtn.disabled = true;

    try {
      let res;
      if (type === "APPROVE") {
        res = await API.approveLeave(leaveId, note);
      } else if (type === "REJECT") {
        res = await API.rejectLeave(leaveId, note);
      }
      if (res.success) {
        managerActionModal.classList.remove("open");
        managerNoteInput.value = "";
      } else {
        alert(res.error || "Action failed.");
      }
    } catch (err) {
      alert("Error contacting server.");
    } finally {
      submitBtn.disabled = false;
    }
  });

  if (refreshEmailsBtn) {
    refreshEmailsBtn.addEventListener("click", async () => {
      const res = await API.getEmails();
      if (res.success) {
        state.emails = res.data;
        renderEmailInbox();
      }
    });
  }
}

function closeDrawer() {
  notificationDrawer.classList.remove("open");
  drawerBackdrop.classList.remove("open");
}

function updateRoleView() {
  if (state.currentRole === "employee") {
    portalRoleTitle.textContent = "Employee Self-Service Portal";
    portalRoleSubtitle.textContent = "Submit leave requests and receive automated real-time status updates.";
    openApplyModalBtn.style.display = "inline-flex";
  } else {
    portalRoleTitle.textContent = "Manager Approvals Workspace";
    portalRoleSubtitle.textContent = "Review pending team leave requests, approve or reject, and trigger status reminders.";
    openApplyModalBtn.style.display = "none";
  }
}

function renderAll() {
  updateKPIs();
  renderLeavesTable();
  renderNotificationsDrawer();
  renderEmailInbox();
  renderServiceNowConsole();
}

function updateKPIs() {
  const totalLeaves = state.leaves.length;
  const pendingLeaves = state.leaves.filter((l) => l.status === "PENDING_APPROVAL").length;
  const approvedLeaves = state.leaves.filter((l) => l.status === "APPROVED").length;
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  document.getElementById("kpiTotalLeaves").textContent = totalLeaves;
  document.getElementById("kpiPendingLeaves").textContent = pendingLeaves;
  document.getElementById("kpiApprovedLeaves").textContent = approvedLeaves;
  document.getElementById("kpiTotalNotifications").textContent = state.notifications.length;

  unreadCountBadge.textContent = unreadCount;
  unreadCountBadge.style.display = unreadCount > 0 ? "flex" : "none";
  drawerUnreadCount.textContent = `${unreadCount} unread`;

  // Update filter counters
  document.getElementById("countAll").textContent = totalLeaves;
  document.getElementById("countPending").textContent = pendingLeaves;
  document.getElementById("countApproved").textContent = approvedLeaves;
  document.getElementById("countRejected").textContent = state.leaves.filter((l) => l.status === "REJECTED").length;
  document.getElementById("countCancelled").textContent = state.leaves.filter((l) => l.status === "CANCELLED").length;
  document.getElementById("emailTabCount").textContent = state.emails.length;
}

function renderLeavesTable() {
  const filtered = state.leaves.filter((leave) => {
    const matchesFilter = state.activeFilter === "ALL" || leave.status === state.activeFilter;
    const q = state.searchQuery;
    const matchesSearch =
      !q ||
      leave.id.toLowerCase().includes(q) ||
      leave.leaveType.toLowerCase().includes(q) ||
      leave.reason.toLowerCase().includes(q) ||
      leave.startDate.includes(q) ||
      leave.endDate.includes(q);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    leavesTableBody.innerHTML = "";
    emptyLeavesState.classList.remove("hidden");
    return;
  }

  emptyLeavesState.classList.add("hidden");

  const statusLabels = {
    PENDING_APPROVAL: { label: "Pending Approval", icon: "⏳" },
    APPROVED: { label: "Approved", icon: "✅" },
    REJECTED: { label: "Rejected", icon: "❌" },
    CANCELLED: { label: "Cancelled", icon: "⚪" }
  };

  leavesTableBody.innerHTML = filtered
    .map((leave) => {
      const statusMeta = statusLabels[leave.status] || { label: leave.status, icon: "•" };

      // Action buttons logic depending on persona and status
      let actionsHtml = "";

      if (state.currentRole === "employee") {
        if (leave.status === "PENDING_APPROVAL" || leave.status === "APPROVED") {
          actionsHtml += `
            <button class="btn btn-sm btn-danger" onclick="handleCancelLeave('${leave.id}')">
              Cancel Leave
            </button>
          `;
        } else {
          actionsHtml += `<span class="text-muted" style="font-size: 12px;">No actions</span>`;
        }
      } else {
        // Manager role
        if (leave.status === "PENDING_APPROVAL") {
          actionsHtml += `
            <button class="btn btn-sm btn-success" onclick="openManagerModal('${leave.id}', 'APPROVE')">
              Approve
            </button>
            <button class="btn btn-sm btn-danger" onclick="openManagerModal('${leave.id}', 'REJECT')">
              Reject
            </button>
            <button class="btn btn-sm btn-secondary" onclick="handlePendingRemind('${leave.id}')" title="Send pending reminder">
              🔔 Remind
            </button>
          `;
        } else {
          actionsHtml += `<span class="text-muted" style="font-size: 12px;">Completed</span>`;
        }
      }

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--primary);">${leave.id}</strong>
          </td>
          <td>
            <div style="font-weight: 600;">${leave.leaveType}</div>
          </td>
          <td>
            <div style="font-weight: 500;">${leave.startDate} → ${leave.endDate}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${leave.days} day(s)</div>
          </td>
          <td>
            <div>${leave.employeeName}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Manager: ${leave.managerName}</div>
          </td>
          <td style="max-width: 220px; font-size: 12px; color: var(--text-secondary);">
            ${leave.reason}
          </td>
          <td>
            <span class="status-badge status-${leave.status}">
              ${statusMeta.icon} ${statusMeta.label}
            </span>
          </td>
          <td class="text-right">
            <div class="actions-cell">
              ${actionsHtml}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Action handlers attached to window
window.handleCancelLeave = async function (leaveId) {
  const reason = prompt("Please provide a reason for cancelling this leave request:", "Change in personal plans.");
  if (reason === null) return; // User pressed Cancel

  try {
    const res = await API.cancelLeave(leaveId, reason);
    if (!res.success) {
      alert(res.error || "Failed to cancel leave.");
    }
  } catch (err) {
    alert("Error communicating with server.");
  }
};

window.handlePendingRemind = async function (leaveId) {
  try {
    const res = await API.sendPendingReminder(leaveId);
    if (!res.success) {
      alert(res.error || "Failed to send reminder.");
    }
  } catch (err) {
    alert("Error communicating with server.");
  }
};

window.openManagerModal = function (leaveId, action) {
  NotificationManager.initAudio();
  const leave = state.leaves.find((l) => l.id === leaveId);
  if (!leave) return;

  actionLeaveId.value = leaveId;
  actionType.value = action;

  if (action === "APPROVE") {
    managerModalTitle.textContent = "Approve Leave Request";
    managerModalDesc.textContent = `Approve ${leave.employeeName}'s request for ${leave.startDate} to ${leave.endDate} (${leave.days} days).`;
    managerNoteLabel.textContent = "Approval Remarks (Optional):";
    managerNoteInput.placeholder = "e.g. Approved. Coverage arranged.";
    managerNoteInput.required = false;
    document.getElementById("submitManagerActionBtn").className = "btn btn-success";
    document.getElementById("submitManagerActionBtn").textContent = "Approve Request";
  } else {
    managerModalTitle.textContent = "Reject Leave Request";
    managerModalDesc.textContent = `Reject ${leave.employeeName}'s request for ${leave.startDate} to ${leave.endDate}.`;
    managerNoteLabel.textContent = "Rejection Reason (Required):";
    managerNoteInput.placeholder = "e.g. Critical release sprint scheduled during requested dates.";
    managerNoteInput.required = true;
    document.getElementById("submitManagerActionBtn").className = "btn btn-danger";
    document.getElementById("submitManagerActionBtn").textContent = "Reject Request";
  }

  managerActionModal.classList.add("open");
};

// Render Notification Drawer
function renderNotificationsDrawer() {
  if (state.notifications.length === 0) {
    drawerNotificationsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔕</div>
        <h3>No Notifications</h3>
        <p>You're all caught up!</p>
      </div>
    `;
    return;
  }

  drawerNotificationsList.innerHTML = state.notifications
    .map((ntf) => {
      const timeAgo = formatTimeAgo(ntf.timestamp);
      return `
        <div class="notification-card ${!ntf.isRead ? "unread" : ""}" onclick="handleMarkSingleRead('${ntf.id}')">
          <div class="ntf-header">
            <span class="ntf-title">${ntf.title}</span>
          </div>
          <div class="ntf-body">${ntf.message}</div>
          <div class="ntf-footer">
            <span>Ref: <code>${ntf.leaveId}</code></span>
            <span>${timeAgo}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

window.handleMarkSingleRead = async function (ntfId) {
  const item = state.notifications.find((n) => n.id === ntfId);
  if (item && !item.isRead) {
    await API.markAsRead(ntfId);
    item.isRead = true;
    renderNotificationsDrawer();
    updateKPIs();
  }
};

// Render Email Inbox Simulator
function renderEmailInbox() {
  if (state.emails.length === 0) {
    emailSidebarList.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted);">
        No simulated emails yet.
      </div>
    `;
    emailViewerPane.innerHTML = `
      <div class="email-viewer-empty">
        <span class="icon-large">📧</span>
        <h3>No Emails Dispatched</h3>
      </div>
    `;
    return;
  }

  // Render Sidebar
  emailSidebarList.innerHTML = state.emails
    .map((eml) => {
      const isActive = eml.id === state.selectedEmailId;
      const sentTime = new Date(eml.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="email-item ${isActive ? "active" : ""}" onclick="selectEmail('${eml.id}')">
          <div class="email-item-header">
            <span>${eml.from.split("@")[0]}</span>
            <span>${sentTime}</span>
          </div>
          <div class="email-item-subject">${eml.subject}</div>
          <div class="email-item-preview">To: ${eml.to} • Ref: ${eml.leaveId}</div>
        </div>
      `;
    })
    .join("");

  // Render Selected Email Viewer
  const selected = state.emails.find((e) => e.id === state.selectedEmailId) || state.emails[0];
  if (selected) {
    emailViewerPane.innerHTML = `
      <div class="email-header-meta">
        <div class="meta-row">
          <span class="meta-label">Subject:</span>
          <span class="meta-val"><strong>${selected.subject}</strong></span>
        </div>
        <div class="meta-row">
          <span class="meta-label">From:</span>
          <span class="meta-val">${selected.from}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">To:</span>
          <span class="meta-val">${selected.to}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Date:</span>
          <span class="meta-val">${new Date(selected.sentAt).toLocaleString()}</span>
        </div>
      </div>
      <div class="email-body-content" style="border: 1px solid var(--slate-border); border-radius: 8px; overflow: hidden;">
        <iframe srcdoc="${escapeHtmlAttr(selected.htmlBody)}" style="width: 100%; min-height: 480px; border: none;"></iframe>
      </div>
    `;
  }
}

window.selectEmail = function (id) {
  state.selectedEmailId = id;
  renderEmailInbox();
};

// Render ServiceNow Console
function renderServiceNowConsole() {
  if (state.serviceNowLogs.length === 0) {
    serviceNowLogContainer.innerHTML = `<div style="color: #64748b; padding: 16px;">No ServiceNow events captured yet.</div>`;
    return;
  }

  serviceNowLogContainer.innerHTML = state.serviceNowLogs
    .map((log) => {
      const payloadString = JSON.stringify(log.payload || log, null, 2);
      return `
        <div class="sn-log-item">
          <div class="sn-log-top">
            <span class="sn-log-event">${log.event || "sn_hr_leave.event"}</span>
            <span class="sn-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <pre class="sn-json"><code>${escapeHtml(payloadString)}</code></pre>
        </div>
      `;
    })
    .join("");
}

// Helpers
function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlAttr(str) {
  return str ? str.replace(/"/g, "&quot;") : "";
}
