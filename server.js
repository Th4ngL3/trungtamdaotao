require('dotenv').config();  //load bien moi truong tu env
const path = require('node:path');
const fastify = require('fastify')({ logger: true });

fastify.get('/', (req,rep) =>{
    rep.send('hi')
})

fastify.register(require('@fastify/multipart'));
fastify.register(require('@fastify/formbody'));
// Cho phép truy cập từ frontend (CORS)
fastify.register(require('@fastify/cors'));
// Serve file tĩnh từ thư mục public
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});
// Kết nối MongoDB
fastify.register(require('fastify-mongodb'), {
  forceClose: true,
  url: process.env.MONGO_URL,
});

//Phân quyền
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'supersecretkey',
});

// Middleware xác thực token
fastify.decorate("authenticate", async function(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
});

fastify.get('/protected', { preValidation: [fastify.authenticate] }, async (request, reply) => {
  reply.send({ data: 'Bạn đã xác thực thành công!' });
});

// Middleware kiểm tra quyền admin
fastify.decorate("isAdmin", async function(request, reply) {
  await request.jwtVerify();
  if (request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Bạn không có quyền admin' });
  }
});

// Middleware kiểm tra quyền teacher
fastify.decorate("isTeacher", async function(request, reply) {
  await request.jwtVerify();
  if (request.user.role !== 'teacher') {
    return reply.code(403).send({ error: 'Bạn không phải giảng viên' });
  }
});

fastify.get('/admin/data', { preValidation: [fastify.isAdmin] }, async (req, rep) => {
  rep.send({ message: 'Chỉ admin mới thấy được route này' });
});

// Import và đăng ký các route
fastify.register(require('./src/routes/userRoutes'), { prefix: '/users'}); 
fastify.register(require('./src/routes/studentRoutes'), { prefix: '/students'}); 
fastify.register(require('./src/routes/teacherRoutes'), { prefix: '/teachers' });
fastify.register(require('./src/routes/adminRoutes'), { prefix: '/admin' });

// Chạy server
fastify.listen({ port: 3003 }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})