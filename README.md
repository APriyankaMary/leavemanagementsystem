# 🔔 Leave Status Notifications System

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Zero Dependency](https://img.shields.io/badge/dependencies-0%20external-orange.svg)](#features)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/)

An enterprise-ready, **zero-external-dependency** full-stack notification solution that automatically informs employees and managers about the **current status of leave requests** throughout their entire lifecycle.

Supports **In-App Real-Time Alerts (Server-Sent Events + Web Audio)**, **Simulated HTML Email Dispatch**, and **ServiceNow REST API Table Payloads** (`sys_user_notification` / HRSD Case Management).

---

## 📸 Overview & Live Features

| Stage | Trigger | Notification Message (Example) | Channels Delivered |
| :--- | :--- | :--- | :--- |
| **1. Leave Applied** | Employee submits leave request | *"Your leave request for 15–17 September has been submitted and is pending manager approval."* | 🔔 In-App Toast + ✉️ Email + 🌐 ServiceNow |
| **2. Pending Reminder** | Auto reminder / manual nudge | *"Your leave request for 15–17 September is still waiting for manager approval."* | 🔔 In-App Toast + ✉️ Email + 🌐 ServiceNow |
| **3. Leave Approved** | Manager approves request | *"Your leave request for 15–17 September has been approved by your manager."* | 🔔 In-App Toast + ✉️ Email + 🌐 ServiceNow |
| **4. Leave Rejected** | Manager rejects with reason | *"Your leave request for 15–17 September was rejected: Critical project release sprint."* | 🔔 In-App Toast + ✉️ Email + 🌐 ServiceNow |
| **5. Leave Cancelled** | Employee cancels leave | *"Your leave request for 15–17 September has been cancelled and leave balance restored."* | 🔔 In-App Toast + ✉️ Email + 🌐 ServiceNow |

---

## 🏗️ System Architecture

```
                      ┌────────────────────────────────────────┐
                      │          Browser Client (UI)           │
                      │  • Employee Portal  • Manager Hub      │
                      │  • Email Inbox      • ServiceNow Log   │
                      └───────┬───────────────────────▲────────┘
                              │ REST (Fetch)          │ SSE (EventSource)
                              │                       │ Real-Time Push
                      ┌───────▼───────────────────────┴────────┐
                      │       Node.js HTTP Server              │
                      │       (server.js - Zero Dep)           │
                      └───────┬────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
   ┌─────────────────┐ ┌─────────────┐ ┌───────────────────┐
   │ In-App Drawer & │ │  Responsive │ │  ServiceNow REST  │
   │  SSE Broadcast  │ │  HTML Email │ │   Table API Log   │
   │  (Audio Chime)  │ │  Templates  │ │ (sys_user_notif)  │
   └─────────────────┘ └─────────────┘ └───────────────────┘
```

---

## ⚡ Quick Start (Ready to Run in 30 Seconds)

This application is built with **pure Node.js standard libraries** (`node:http`, `node:fs`, `node:path`, `node:crypto`). You do **not** need to run `npm install` or deal with package lock issues!

### 1. Start the Server
```bash
node server.js
```

### 2. Open Your Browser
Navigate to:
```
http://localhost:3000
```

---

## 🎮 How to Test the 5 Status Notifications

1. **Test "Leave Applied":**
   - In the top bar, ensure Active Role is **👨‍💻 Alex Johnson (Employee)**.
   - Click **"+ Apply for Leave"**.
   - Pick dates (e.g., September 15–17), select *Annual Leave*, and click **"Submit Leave Application"**.
   - 🔔 Observe the **instant audio chime**, **toast alert**, **bell badge update (+1)**, and **new email** in the *Email Simulator Inbox* tab.

2. **Test "Pending Reminder":**
   - Switch Active Role to **👩‍💼 Sarah Connor (Manager)**.
   - In the table row for the pending leave, click the **"🔔 Remind"** button.
   - 🔔 Observe the *Pending Approval Reminder* alert sent to the employee.

3. **Test "Leave Approved":**
   - As **👩‍💼 Manager**, click **"Approve"** on a pending leave.
   - Add an optional remark and click **"Approve Request"**.
   - 🔔 Status turns **green (Approved)**, instant approval toast sounds, and a celebratory HTML email arrives.

4. **Test "Leave Rejected":**
   - As **👩‍💼 Manager**, click **"Reject"** on another pending request.
   - Provide a mandatory reason (e.g., *"Sprint deadline overlap"*).
   - 🔔 Status turns **red (Rejected)** with audit notes captured in the system.

5. **Test "Leave Cancelled":**
   - Switch back to **👨‍💻 Alex Johnson (Employee)**.
   - Click **"Cancel Leave"** on any of your approved or pending leaves.
   - 🔔 Request changes to **slate (Cancelled)** and cancellation receipt notifications are logged.

---

## 📁 Repository Structure

```
leave-status-notifications/
├── .gitignore                      # Git ignore rules (node_modules, logs, etc.)
├── package.json                    # Project definition & npm scripts
├── README.md                       # Complete documentation & GitHub instructions
├── server.js                       # Production HTTP server with SSE stream & static hosting
├── src/
│   ├── data/
│   │   └── store.js                # In-memory store with seeded employees, manager & leaves
│   ├── services/
│   │   ├── emailService.js         # Responsive HTML email templates with executive styling
│   │   ├── notificationService.js  # Multi-channel dispatcher (SSE, Email, ServiceNow)
│   │   └── serviceNowService.js    # ServiceNow Table API REST payload generator
│   └── routes/
│       ├── leaveRoutes.js          # REST endpoints for Apply, Approve, Reject, Cancel, Remind
│       └── notificationRoutes.js   # Notification query, read-status, and SSE stream
└── public/
    ├── index.html                  # Responsive enterprise UI with Tab navigation & Modals
    ├── css/
    │   └── styles.css              # Modern corporate design system with dark header & animations
    └── js/
        ├── api.js                  # Frontend REST API client
        ├── notifications.js        # Web Audio chime generator & dynamic toast container
        └── app.js                  # State management, SSE event listener, and UI controller
```

---

## 📡 REST API Reference

### Leave Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/leaves` | List all leave requests (supports `?employeeId=EMP001`) |
| `GET` | `/api/leaves/:id` | Get details of a single leave request |
| `POST` | `/api/leaves` | Submit a new leave request (Status: `PENDING_APPROVAL`) |
| `PATCH` | `/api/leaves/:id/approve` | Manager approves leave (Status: `APPROVED`) |
| `PATCH` | `/api/leaves/:id/reject` | Manager rejects leave with reason (Status: `REJECTED`) |
| `PATCH` | `/api/leaves/:id/cancel` | Employee cancels leave (Status: `CANCELLED`) |
| `POST` | `/api/leaves/:id/remind` | Send pending approval reminder nudge |

### Notification & Integration Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notifications` | Fetch notification history (supports `?recipientId=...`) |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read |
| `GET` | `/api/notifications/stream` | **Server-Sent Events (SSE)** real-time push stream |
| `GET` | `/api/emails` | Fetch simulated HTML email inbox |
| `GET` | `/api/servicenow/logs` | Fetch ServiceNow Table API audit payloads |

---

## 🚀 How to Push this Project to GitHub

Follow these steps to publish this repository to your GitHub account:

### Step 1: Initialize Git
Open your terminal inside the project folder:
```bash
git init
git add .
git commit -m "feat: complete leave status notification system with real-time SSE, email, and ServiceNow"
```

### Step 2: Create a New Repository on GitHub
1. Go to [https://github.com/new](https://github.com/new).
2. Repository name: `leave-status-notifications`
3. Leave "Initialize this repository with a README" **unchecked** (we already have a complete README).
4. Click **Create repository**.

### Step 3: Link and Push
Run the following commands (replace `<your-username>` with your GitHub username):
```bash
git branch -M main
git remote add origin https://github.com/<your-username>/leave-status-notifications.git
git push -u origin main
```

---

## 🔧 Production Customization

### Connecting Real SMTP (Nodemailer / SendGrid / AWS SES)
In `src/services/emailService.js`, replace the simulator in `sendEmailNotification()` with your preferred SMTP client:
```javascript
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({ /* your SMTP config */ });

await transporter.sendMail({
  from: '"HR Notifications" <hr@company.com>',
  to: recipientEmail,
  subject: subject,
  html: html
});
```

### Connecting Real ServiceNow Instance
In `src/services/serviceNowService.js`, point the POST request to your ServiceNow instance:
```javascript
const response = await fetch("https://<instance>.service-now.com/api/now/table/sys_user_notification", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64")
  },
  body: JSON.stringify(snPayload)
});
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
