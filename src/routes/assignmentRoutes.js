async function assignmentRoutes(fastify, options) {
  const controller = await require('../controllers/assignmentController')(fastify);

  // Teacher routes
  fastify.post('/', { preValidation: [fastify.isTeacher] }, controller.createAssignment);
  fastify.put('/:id', { preValidation: [fastify.isTeacher] }, controller.updateAssignment);
  fastify.delete('/:id', { preValidation: [fastify.isTeacher] }, controller.deleteAssignment);
  fastify.get('/teacher/my-assignments', { preValidation: [fastify.isTeacher] }, controller.getTeacherAssignments);
  fastify.get('/:id/submissions', { preValidation: [fastify.isTeacher] }, controller.getAssignmentSubmissions);
  fastify.post('/:id/grade', { preValidation: [fastify.isTeacher] }, controller.gradeSubmission);

  // Student routes
  fastify.get('/course/:courseId', { preValidation: [fastify.authenticate] }, controller.getCourseAssignments);
  fastify.get('/:id', { preValidation: [fastify.authenticate] }, controller.getAssignmentById);
  fastify.post('/:id/submit', { preValidation: [fastify.authenticate] }, controller.submitAssignment);
  fastify.get('/:id/my-submission', { preValidation: [fastify.authenticate] }, controller.getMySubmission);

  // Admin routes
  fastify.get('/', { preValidation: [fastify.isAdmin] }, controller.getAllAssignments);
}

module.exports = assignmentRoutes;
