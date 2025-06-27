const studentControllerFactory = require('../controllers/studentController');

async function studentRoutes(fastify, options) {
  const studentController = studentControllerFactory(fastify);

  fastify.post('/', studentController.addStudent);
  fastify.get('/', studentController.getAllStudents);
  fastify.get('/courses', { preHandler: [fastify.authenticate] }, studentController.getAllCourses);
  fastify.get('/:id', studentController.getStudentById);
  fastify.put('/:id', studentController.updateStudent);
  fastify.delete('/:id', studentController.deleteStudent);
  fastify.post('/courses/:courseId/register', { preHandler: [fastify.authenticate] }, studentController.registerCourse);
  fastify.get('/my-courses', { preHandler: [fastify.authenticate] }, studentController.getMyCourses);

}

module.exports = studentRoutes;
