async function userRoutes(fastify, option) {
  const controller = await require('../controllers/userController')(fastify);

  // Authentication routes
  fastify.post('/register', controller.register);
  fastify.post('/login', controller.login);

  // Profile routes
  fastify.get('/me', { preValidation: [fastify.authenticate] }, controller.getMe);
  fastify.put('/profile', { preValidation: [fastify.authenticate] }, controller.updateProfile);
  fastify.put('/password', { preValidation: [fastify.authenticate] }, controller.changePassword);

  // Admin routes
  fastify.get('/', { preValidation: [fastify.isAdmin] }, controller.getAllUsers);
  fastify.get('/search', { preValidation: [fastify.isAdmin] }, controller.searchUsers);
  fastify.put('/:id/role', { preValidation: [fastify.isAdmin] }, controller.updateUserRole);
  fastify.delete('/:id', { preValidation: [fastify.isAdmin] }, controller.deleteUser);
}

module.exports = userRoutes;
