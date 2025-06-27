async function courseRoutes(fastify, options) {
  const controller = await require("../controllers/courseController")(fastify);

  // Public routes
  fastify.get("/", controller.getAllCourses);
  fastify.get("/:id", controller.getCourseById);

  // Teacher routes
  fastify.post(
    "/",
    { preValidation: [fastify.isTeacher] },
    controller.createCourse
  );
  fastify.put(
    "/:id",
    { preValidation: [fastify.isTeacher] },
    controller.updateCourse
  );
  fastify.delete(
    "/:id",
    { preValidation: [fastify.isTeacher] },
    controller.deleteCourse
  );
  fastify.get(
    "/teacher/my-courses",
    { preValidation: [fastify.isTeacher] },
    controller.getTeacherCourses
  );
  fastify.get(
    "/:id/students",
    { preValidation: [fastify.isTeacher] },
    controller.getCourseStudents
  );

  // Student routes
  fastify.get(
    "/student/my-courses",
    { preValidation: [fastify.authenticate] },
    controller.getStudentCourses
  );
  fastify.post(
    "/:id/enroll",
    { preValidation: [fastify.authenticate] },
    controller.enrollInCourse
  );
  fastify.delete(
    "/:id/unenroll",
    { preValidation: [fastify.authenticate] },
    controller.unenrollFromCourse
  );

  // Admin routes
  fastify.post(
    "/:courseId/students/:studentId",
    { preValidation: [fastify.isAdmin] },
    controller.addStudentToCourse
  );
  fastify.delete(
    "/:courseId/students/:studentId",
    { preValidation: [fastify.isAdmin] },
    controller.removeStudentFromCourse
  );
}

module.exports = courseRoutes;
