const { isAdminOrTeacher } = require("../controllers/userController");

async function fileRoutes(fastify, options) {
  const controller = await require("../controllers/fileController")(fastify);

  fastify.post("/upload",{ preValidation: [fastify.authenticate] },controller.uploadFile);
  fastify.post("/upload/student-list",{ preValidation: [fastify.authenticate] },controller.uploadStudentList);
  fastify.post("/upload/course-material",{ preValidation: [fastify.isTeacher] },controller.uploadCourseMaterial);

  fastify.get("/:id/download",{ preValidation: [fastify.authenticate] },controller.downloadFile);
  fastify.get("/student-lists",{ preValidation: [isAdminOrTeacher] },controller.getStudentListFiles);
  fastify.delete("/:id",{ preValidation: [fastify.authenticate] },controller.deleteFile);
  fastify.get("/course/:courseId/materials",{ preValidation: [fastify.authenticate] },controller.getCourseMaterials);
}

module.exports = fileRoutes;
