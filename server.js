/**
 * Leave Status Notifications Server
 * Zero-dependency, Production-Grade Node.js HTTP Server with Real-time SSE & Static Asset Serving
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const { handleLeaveRoutes } = require("./src/routes/leaveRoutes");
const { handleNotificationRoutes } = require("./src/routes/notificationRoutes");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function serveStaticFile(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
  if (safePath === "/" || safePath === "\\") {
    safePath = "index.html";
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: stay within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    return res.end("403 Forbidden");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for single-page root
      if (pathname.startsWith("/api/")) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Endpoint not found" }));
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // Global CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Pre-flight OPTIONS request
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Collect request body for POST/PATCH/PUT
  let bodyData = "";
  req.on("data", (chunk) => {
    bodyData += chunk;
  });

  req.on("end", () => {
    let parsedBody = null;
    if (bodyData) {
      try {
        parsedBody = JSON.parse(bodyData);
      } catch (e) {
        // Form encoded or plain text
        parsedBody = bodyData;
      }
    }

    // Try routing to Notification / SSE / Email routes
    const notificationHandled = handleNotificationRoutes(req, res, parsedUrl, parsedBody);
    if (notificationHandled) return;

    // Try routing to Leave routes
    const leaveHandled = handleLeaveRoutes(req, res, parsedUrl, parsedBody);
    if (leaveHandled) return;

    // If API route not matched
    if (parsedUrl.pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "API route not found" }));
    }

    // Serve static files from public/
    serveStaticFile(req, res, parsedUrl.pathname);
  });
});

server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`🔔 Leave Status Notification System Server Running!`);
  console.log(`📍 Web Dashboard : http://localhost:${PORT}`);
  console.log(`📡 SSE Stream    : http://localhost:${PORT}/api/notifications/stream`);
  console.log(`🚀 Ready-to-run   : Zero external dependencies required`);
  console.log(`========================================================`);
});
