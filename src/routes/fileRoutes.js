const { isAdminOrTeacher } = require("../controllers/userController");

async function fileRoutes(fastify, options) {
  const controller = await require("../controllers/fileController")(fastify);

  // Upload routes
  fastify.post(
    "/upload",
    { preValidation: [fastify.authenticate] },
    controller.uploadFile
  );
  fastify.post(
    "/upload/student-list",
    { preValidation: [fastify.authenticate] },
    controller.uploadStudentList
  );
  fastify.post(
    "/upload/course-material",
    { preValidation: [fastify.isTeacher] },
    controller.uploadCourseMaterial
  );
  fastify.post(
    "/upload/assignment-submission",
    { preValidation: [fastify.authenticate] },
    controller.uploadAssignmentSubmission
  );

  // Download routes
  fastify.get(
    "/:id/download",
    { preValidation: [fastify.authenticate] },
    controller.downloadFile
  );
  fastify.get(
    "/:id",
    { preValidation: [fastify.authenticate] },
    controller.getFileInfo
  );

  // List routes
  fastify.get(
    "/course/:courseId",
    { preValidation: [fastify.authenticate] },
    controller.getCourseFiles
  );
  fastify.get(
    "/assignment/:assignmentId",
    { preValidation: [fastify.authenticate] },
    controller.getAssignmentFiles
  );
  fastify.get(
    "/student-lists",
    { preValidation: [isAdminOrTeacher] },
    controller.getStudentListFiles
  );
  fastify.get(
    "/my-files",
    { preValidation: [fastify.authenticate] },
    controller.getMyFiles
  );

  // Management routes
  fastify.put(
    "/:id",
    { preValidation: [fastify.authenticate] },
    controller.updateFile
  );
  fastify.delete(
    "/:id",
    { preValidation: [fastify.authenticate] },
    controller.deleteFile
  );
  fastify.get(
    "/search",
    { preValidation: [fastify.authenticate] },
    controller.searchFiles
  );

  // Admin routes
  fastify.get(
    "/",
    { preValidation: [fastify.isAdmin] },
    controller.getAllFiles
  );
  fastify.get(
    "/stats",
    { preValidation: [fastify.isAdmin] },
    controller.getFileStats
  );

  // Course materials
  fastify.get(
    "/course/:courseId/materials",
    { preValidation: [fastify.authenticate] },
    controller.getCourseMaterials
  );
}

module.exports = fileRoutes;
