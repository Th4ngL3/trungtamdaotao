require("dotenv").config(); //load bien moi truong tu env
const path = require("node:path");
const fastify = require("fastify")({ logger: true });
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

// Global WebSocket clients map
const clients = new Map();

// Check environment variables
console.log("MongoDB URL:", process.env.MONGO_URL || "Not defined");

// Route mặc định sẽ serve index.html từ thư mục public
// fastify.get('/', (req,rep) =>{
//     rep.send('hi')
// })

// Configure multipart with explicit options
fastify.register(require("@fastify/multipart"), {
  limits: {
    fieldNameSize: 100, // Max field name size in bytes
    fieldSize: 1000000, // Max field value size in bytes
    fields: 10, // Max number of non-file fields
    fileSize: 10000000, // 10MB limit for files
    files: 1, // For single file uploads
    headerPairs: 2000, // Max number of header key-value pairs
  },
  attachFieldsToBody: false, // Changed to false to allow using request.file()
});

fastify.register(require("@fastify/formbody"));
// Cho phép truy cập từ frontend (CORS)
fastify.register(require("@fastify/cors"));
// Serve file tĩnh từ thư mục public
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

// Serve uploaded files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "uploads"),
  prefix: "/uploads/",
  decorateReply: false,
});
// Kết nối MongoDB
fastify.register(require("@fastify/mongodb"), {
  forceClose: true,
  url: process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao",
});

//Phân quyền
fastify.register(require("@fastify/jwt"), {
  secret: process.env.JWT_SECRET || "supersecretkey",
});

// Middleware xác thực token
fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

fastify.get(
  "/protected",
  { preValidation: [fastify.authenticate] },
  async (request, reply) => {
    reply.send({ data: "Bạn đã xác thực thành công!" });
  }
);

// Middleware kiểm tra quyền admin
fastify.decorate("isAdmin", async function (request, reply) {
  await request.jwtVerify();
  if (request.user.role !== "admin") {
    return reply.code(403).send({ error: "Bạn không có quyền admin" });
  }
});

// Middleware kiểm tra quyền teacher
fastify.decorate("isTeacher", async function (request, reply) {
  await request.jwtVerify();
  if (request.user.role !== "teacher") {
    return reply.code(403).send({ error: "Bạn không phải giảng viên" });
  }
});

// Middleware kiểm tra quyền admin hoặc teacher
fastify.decorate("isAdminOrTeacher", async function (request, reply) {
  await request.jwtVerify();
  if (request.user.role !== "admin" && request.user.role !== "teacher") {
    return reply
      .code(403)
      .send({ error: "Bạn không có quyền thực hiện hành động này" });
  }
});

fastify.get(
  "/admin/data",
  { preValidation: [fastify.isAdmin] },
  async (req, rep) => {
    rep.send({ message: "Chỉ admin mới thấy được route này" });
  }
);

// Import và đăng ký các route
fastify.register(require("./src/routes/userRoutes"), { prefix: "/users" });
fastify.register(require("./src/routes/studentRoutes"), {
  prefix: "/students",
});
fastify.register(require("./src/routes/teacherRoutes"), {
  prefix: "/teachers",
});
fastify.register(require("./src/routes/adminRoutes"), { prefix: "/admin" });
fastify.register(require("./src/routes/courseRoutes"), { prefix: "/courses" });
fastify.register(require("./src/routes/assignmentRoutes"), {
  prefix: "/assignments",
});
fastify.register(require("./src/routes/notificationRoutes"), {
  prefix: "/notifications",
});
fastify.register(require("./src/routes/fileRoutes"), { prefix: "/files" });

// Chạy server
const startServer = async () => {
  try {
    await fastify.listen({ port: 3003 });

    // Set up WebSocket server after Fastify is successfully started
    const wss = new WebSocket.Server({
      server: fastify.server, // Use the underlying HTTP server from fastify
    });

    wss.on("connection", async function connection(ws, req) {
      try {
        // Parse URL to get query parameters
        const url = new URL(req.url, "http://localhost");
        const token = url.searchParams.get("token");

        if (!token) {
          ws.close(1008, "Token required");
          return;
        }

        // Verify token
        const jwtSecret = process.env.JWT_SECRET || "supersecretkey";
        const decoded = jwt.verify(token, jwtSecret);

        if (!decoded || !decoded._id) {
          ws.close(1008, "Invalid token");
          return;
        }

        const userId = decoded._id;

        // Store client connection with user ID
        clients.set(userId, ws);

        console.log(`WebSocket client connected: ${userId}`);

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: "connection",
            message: "Connected to notification service",
          })
        );

        // Handle client messages
        ws.on("message", function incoming(message) {
          console.log(`Received message from ${userId}: ${message}`);
          // Handle client messages if needed
        });

        // Handle client disconnect
        ws.on("close", function close() {
          console.log(`WebSocket client disconnected: ${userId}`);
          clients.delete(userId);
        });
      } catch (error) {
        console.error("WebSocket connection error:", error);
        ws.close(1011, "Server error");
      }
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();

// Function to broadcast notification to relevant users
fastify.decorate(
  "broadcastNotification",
  async function (notification, targetUserIds = null) {
    try {
      // If targetUserIds is provided, only send to those users
      // Otherwise, send to all connected clients
      const recipients = targetUserIds || Array.from(clients.keys());

      console.log(`Broadcasting notification to ${recipients.length} users`);

      recipients.forEach((userId) => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "notification",
              notification,
            })
          );
        }
      });
    } catch (error) {
      console.error("Error broadcasting notification:", error);
    }
  }
);

// Function to notify about notification updates
fastify.decorate(
  "notifyNotificationUpdate",
  async function (notificationId, targetUserIds = null) {
    try {
      const recipients = targetUserIds || Array.from(clients.keys());

      recipients.forEach((userId) => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "notification_update",
              notificationId,
            })
          );
        }
      });
    } catch (error) {
      console.error("Error notifying about notification update:", error);
    }
  }
);

// Function to notify about notification deletion
fastify.decorate(
  "notifyNotificationDelete",
  async function (notificationId, targetUserIds = null) {
    try {
      const recipients = targetUserIds || Array.from(clients.keys());

      recipients.forEach((userId) => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "notification_delete",
              notificationId,
            })
          );
        }
      });
    } catch (error) {
      console.error("Error notifying about notification deletion:", error);
    }
  }
);
