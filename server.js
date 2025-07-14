require("dotenv").config(); //load bien moi truong tu env
const path = require("node:path");
const fastify = require("fastify")({ logger: true });
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const clients = new Map();

// Route mặc định sẽ serve index.html từ thư mục public

// Cấu hình multipart với các tùy chọn rõ ràng
fastify.register(require("@fastify/multipart"), {
  limits: {
    fieldNameSize: 100, // Giới hạn độ dài tên các field
    fieldSize: 1000000, // Giới hạn độ dài cho giá trị của filed
    fields: 10, // giới hạn số lượng trường form
    fileSize: 10000000, // Kích thươc file tối đa 10MB
    files: 1, // Chỉ đc uploads 1 file trong 1 req
    headerPairs: 2000, 
  },
  attachFieldsToBody: false, // đặt false để dùng trực tiếp request.file()
});

fastify.register(require("@fastify/formbody"));
fastify.register(require("@fastify/cors"));// Cho phép truy cập từ frontend (CORS)
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
  url: process.env.MONGO_URL,
});

//Phân quyền
fastify.register(require("@fastify/jwt"), {
  secret: process.env.JWT_SECRET,
});

// Middleware xác thực token
fastify.decorate("authenticate", async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

fastify.get("/protected",{ preValidation: [fastify.authenticate] },async (request, reply) => {
    reply.send({ data: "Bạn đã xác thực thành công!" });
});

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
    return reply.code(403).send({ error: "Bạn không có quyền thực hiện hành động này" });
  }
}); 

fastify.get("/admin/data",{ preValidation: [fastify.isAdmin] },async (req, rep) => {
    rep.send({ message: "Chỉ admin mới thấy được route này" });
});

// Import và đăng ký các route
fastify.register(require("./src/routes/userRoutes"), { prefix: "/users" });
fastify.register(require("./src/routes/studentRoutes"), { prefix: "/students", });
fastify.register(require("./src/routes/teacherRoutes"), { prefix: "/teachers", });
fastify.register(require("./src/routes/adminRoutes"), { prefix: "/admin" });
fastify.register(require("./src/routes/courseRoutes"), { prefix: "/courses" });
fastify.register(require("./src/routes/assignmentRoutes"), { prefix: "/assignments", });
fastify.register(require("./src/routes/notificationRoutes"), { prefix: "/notifications", });
fastify.register(require("./src/routes/fileRoutes"), { prefix: "/files" });

// Chạy server 
const startServer = async () => {
  try {
    await fastify.listen({ port: 3003 });

    // Thiết lập máy chủ WebSocket để khởi động tính năng gửi nhận thông báo 
    const wss = new WebSocket.Server({
      server: fastify.server,
    });

    //Xử lý khi client kết nối với websocket
    wss.on("connection", async function connection(ws, req) {
      try {
        // Xử lý token xác thực từ client
        const url = new URL(req.url, "http://localhost");
        const token = url.searchParams.get("token");

        if (!token) {
          ws.close(1008, "Token required");
          return;
        }

        // Xác minh token
        const jwtSecret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, jwtSecret);

        if (!decoded || !decoded._id) {
          ws.close(1008, "Invalid token");
          return;
        }

        const userId = decoded._id;
        clients.set(userId, ws); // Gán userId làm key , ws làm value

        ws.send(
          JSON.stringify({
            type: "connection",
            message: "Connected to notification service",
          })
        );

        // Ngắt kết nối
        ws.on("close", function close() {
          clients.delete(userId);
        });
      } catch (error) {
        ws.close(1011, "Server error");
      }
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

startServer();

// Chức năng phát thông báo đến người dùng có liên quan
fastify.decorate("broadcastNotification",async function (notification, targetUserIds = null) {
    try {
      const recipients = targetUserIds || Array.from(clients.keys());

      //Lọc từng user để lấy ws tương ứng
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
      console.error("Lỗi phát thông báo:", error);
    }
  }
);

// Thông báo về việc cập nhật thông báo 
fastify.decorate("notifyNotificationUpdate",async function (notificationId, targetUserIds = null) {
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

// Thông báo về việc Xóa thông báo 
fastify.decorate("notifyNotificationDelete",async function (notificationId, targetUserIds = null) {
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