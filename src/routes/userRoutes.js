async function userRoutes(fastify, option) {
  const db = fastify.mongo.db;
  const users = db.collection('users');

  // Đăng ký tài khoản
  fastify.post('/register', async (request, reply) => {
    const { name, email, password } = request.body;
    const role = 'student';
    const exists = await users.findOne({ email });
    if (exists) {
      return reply.code(400).send({ error: 'Email đã tồn tại' });
    }
    // Lưu 
    await users.insertOne({ name, email, password, role });
    reply.send({ success: true });
  });

  // Đăng nhập
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    const user = await users.findOne({ email });
    if (!user || user.password !== password) {
      return reply.code(401).send({ error: 'Email hoặc mật khẩu không đúng' });
    }
    // Tạo token JWT 
    const token = fastify.jwt.sign({ id: user._id, email: user.email, role: user.role });

    // Trả về thông tin user
    reply.send({
  token,
  user: {
    name: user.name,
    email: user.email,
    role: user.role
  }
});

  });

  // Lấy thông tin user hiện tại
  fastify.get('/me', { preValidation: [fastify.authenticate] }, async (request, reply) => {
    const user = await users.findOne({ _id: new fastify.mongo.ObjectId(request.user.id) }, { projection: { password: 0 } });
    if (!user) return reply.code(404).send({ error: 'Không tìm thấy người dùng' });
    reply.send(user);
  });


  // Lấy danh sách người dùng (dành cho admin)
  fastify.get('/', { preValidation: [fastify.isAdmin] }, async (request, reply) => {
    const allUsers = await users.find().toArray();
    reply.send(allUsers);
  });
}

module.exports = userRoutes;
