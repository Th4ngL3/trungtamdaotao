async function adminRoutes(fastify, options) {
  const db = fastify.mongo.db;
  const users = db.collection('users');
  const courses = db.collection('courses');
  const { ObjectId } = fastify.mongo;

  // Middleware kiểm tra quyền admin
  async function verifyAdmin(request, reply) {
    await fastify.authenticate(request, reply);
    if (!request.user || request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ admin mới được phép truy cập' });
    }
  }

  // Danh sách tất cả người dùng
  fastify.get('/users', { preValidation: [verifyAdmin] }, async (req, reply) => {
    const allUsers = await users.find().toArray();
    reply.send(allUsers);
  });

  // Danh sách tất cả khóa học
  fastify.get('/courses', { preValidation: [verifyAdmin] }, async (req, reply) => {
    const allCourses = await courses.find().toArray();
    reply.send(allCourses);
  });

  // Cập nhật vai trò người dùng
  fastify.put('/users/:id/role', { preValidation: [verifyAdmin] }, async (req, reply) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'teacher', 'student'].includes(role)) {
      return reply.code(400).send({ error: 'Vai trò không hợp lệ' });
    }

    try {
      const result = await users.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      reply.send({ success: result.modifiedCount === 1 });
    } catch (err) {
      reply.code(400).send({ error: 'ID không hợp lệ' });
    }
  });

  // Xóa người dùng
  fastify.delete('/users/:id', { preValidation: [verifyAdmin] }, async (req, reply) => {
    const { id } = req.params;

    try {
      const result = await users.deleteOne({ _id: new ObjectId(id) });
      reply.send({ success: result.deletedCount === 1 });
    } catch (err) {
      reply.code(400).send({ error: 'ID không hợp lệ' });
    }
  });
}

module.exports = adminRoutes;
