const adminControllerFactory = require("../controllers/adminController");

async function adminRoutes(fastify, options) {
  const controller = adminControllerFactory(fastify);

  fastify.get(
    "/users",
    { preValidation: [controller.verifyAdmin] },
    controller.getAllUsers
  );
  fastify.get(
    "/courses",
    { preValidation: [controller.verifyAdmin] },
    controller.getAllCourses
  );
  fastify.put(
    "/users/:id/role",
    { preValidation: [controller.verifyAdmin] },
    controller.updateUserRole
  );
  fastify.delete(
    "/users/:id",
    { preValidation: [controller.verifyAdmin] },
    controller.deleteUser
  );
}

module.exports = adminRoutes;
