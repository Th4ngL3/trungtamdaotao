async function notificationRoutes(fastify, options) {
  const controller = await require("../controllers/notificationController")(fastify);

  // Get routes
  fastify.get("/",{ preValidation: [fastify.authenticate] },controller.getMyNotifications);
  fastify.get("/my-notifications",{ preValidation: [fastify.authenticate] },controller.getMyNotifications);
  fastify.get("/all",{ preValidation: [fastify.isAdmin] },controller.getAllNotifications);
  fastify.get("/unread",{ preValidation: [fastify.authenticate] },controller.getUnreadNotifications);
  fastify.get("/course/:courseId",{ preValidation: [fastify.authenticate] },controller.getCourseNotifications);
  fastify.get("/:id",{ preValidation: [controller.verifyNotificationAccess] },controller.getNotificationById);

  // Create routes
  fastify.post("/",{ preValidation: [fastify.isAdminOrTeacher] },controller.createNotification);

  // Create enrollment notification
  fastify.post("/enrollment",{ preValidation: [fastify.isTeacher] },controller.createEnrollmentNotification);

  // Update routes
  fastify.put("/:id",{ preValidation: [fastify.authenticate] },controller.updateNotification);

  // Mark as read routes
  fastify.post("/:id/read",{ preValidation: [fastify.authenticate] },controller.markAsRead);
  fastify.post("/mark-all-read",{ preValidation: [fastify.authenticate] },controller.markAllAsRead);

  // Delete route
  fastify.delete("/:id",{ preValidation: [fastify.authenticate] },controller.deleteNotification);
}

module.exports = notificationRoutes;
