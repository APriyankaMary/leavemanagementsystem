/**
 * Notification, Email, ServiceNow & User Routes Handler
 */

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getEmailInbox,
  getServiceNowAuditLogs,
  users
} = require("../data/store");
const { registerSSEClient, removeSSEClient } = require("../services/notificationService");

function handleNotificationRoutes(req, res, url, body) {
  // GET /api/users
  if (req.method === "GET" && url.pathname === "/api/users") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: users }));
  }

  // GET /api/notifications
  if (req.method === "GET" && url.pathname === "/api/notifications") {
    const recipientId = url.searchParams.get("recipientId");
    const list = getNotifications(recipientId);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: list }));
  }

  // PATCH /api/notifications/:id/read
  const readMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (req.method === "PATCH" && readMatch) {
    const updated = markNotificationAsRead(readMatch[1]);
    if (!updated) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Notification not found" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: updated }));
  }

  // PATCH /api/notifications/read-all
  if (req.method === "PATCH" && url.pathname === "/api/notifications/read-all") {
    const recipientId = body?.recipientId;
    markAllNotificationsAsRead(recipientId);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, message: "All notifications marked as read" }));
  }

  // GET /api/emails
  if (req.method === "GET" && url.pathname === "/api/emails") {
    const emails = getEmailInbox();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: emails }));
  }

  // GET /api/servicenow/logs
  if (req.method === "GET" && url.pathname === "/api/servicenow/logs") {
    const logs = getServiceNowAuditLogs();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, data: logs }));
  }

  // GET /api/notifications/stream (Server-Sent Events)
  if (req.method === "GET" && url.pathname === "/api/notifications/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    // Send initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: "connected", time: new Date().toISOString() })}\n\n`);

    registerSSEClient(res);

    // Keep alive heartbeat ping every 25 seconds
    const interval = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch (err) {
        clearInterval(interval);
        removeSSEClient(res);
      }
    }, 25000);

    req.on("close", () => {
      clearInterval(interval);
      removeSSEClient(res);
    });

    return true;
  }

  return false;
}

module.exports = {
  handleNotificationRoutes
};
