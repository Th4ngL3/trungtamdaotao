const teacherControllerFactory = require("../controllers/teacherController");

async function teacherRoutes(fastify, options) {
  const controller = teacherControllerFactory(fastify);

  // Add a public route to get teacher by ID
  fastify.get("/:id", controller.getTeacherById);

  fastify.get(
    "/courses",
    { preValidation: [controller.isTeacher] },
    controller.getMyCourses
  );
  fastify.get(
    "/courses/:id/students",
    { preValidation: [controller.isTeacher] },
    controller.getStudentsList
  );
  fastify.post(
    "/courses",
    { preValidation: [controller.isTeacher] },
    controller.createCourse
  );
  fastify.patch(
    "/courses/:id/approve",
    { preValidation: [controller.isTeacher] },
    controller.approveStudent
  );
  fastify.put(
    "/courses/:id",
    { preValidation: [controller.isTeacher] },
    controller.updateCourse
  );
  fastify.get(
    "/courses/:id",
    { preValidation: [controller.isTeacher] },
    controller.getCourseById
  );
}

module.exports = teacherRoutes;
