async function studentRoutes(fastify, options) {
  const db = fastify.mongo.db;
  const students = db.collection('students');
  const courses = db.collection('courses');
  const users = db.collection('users');
  const { ObjectId } = fastify.mongo;

  // Thêm học viên mới
  fastify.post('/', async (request, reply) => {
    const { name, email, phone, birthdate } = request.body;
    if (!name || !email) {
      return reply.code(400).send({ error: 'Thiếu thông tin bắt buộc' });
    }

    const exists = await students.findOne({ email });
    if (exists) {
      return reply.code(400).send({ error: 'Email đã tồn tại' });
    }

    await students.insertOne({ name, email, phone, birthdate });
    reply.send({ success: true });
  });

  // Lấy danh sách học viên
  fastify.get('/', async (_, reply) => {
    const allStudents = await students.find().toArray();
    reply.send(allStudents);
  });

  // Lấy tất cả khóa học
  fastify.get('/courses', async (_, reply) => {
    const allCourses = await courses.find().toArray();
    reply.send(allCourses);
  });

  // Lấy chi tiết học viên theo ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const student = await students.findOne({ _id: new ObjectId(request.params.id) });
      if (!student) return reply.code(404).send({ error: 'Không tìm thấy học viên' });
      reply.send(student);
    } catch {
      reply.code(400).send({ error: 'ID không hợp lệ' });
    }
  });

  // Cập nhật học viên
  fastify.put('/:id', async (request, reply) => {
    const { name, email, phone, birthdate } = request.body;
    try {
      const result = await students.updateOne(
        { _id: new ObjectId(request.params.id) },
        { $set: { name, email, phone, birthdate } }
      );
      if (result.matchedCount === 0) {
        return reply.code(404).send({ error: 'Không tìm thấy học viên' });
      }
      reply.send({ success: true });
    } catch {
      reply.code(400).send({ error: 'ID không hợp lệ' });
    }
  });

  // Đăng ký khóa học (yêu cầu xác thực)
  fastify.post('/courses/:courseId/register', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const courseId = request.params.courseId;
    const studentId = request.user?._id;

    if (!studentId) return reply.code(401).send({ error: 'Không xác thực' });

    const course = await courses.findOne({ _id: new ObjectId(courseId) });
    if (!course) return reply.code(404).send({ error: 'Không tìm thấy khóa học' });

    const enrolled = course.students || [];
    const pending = course.pendingStudents || [];

    if (enrolled.includes(studentId) || pending.includes(studentId)) {
      return reply.code(400).send({ error: 'Bạn đã đăng ký hoặc đang chờ duyệt khóa học này' });
    }

    await courses.updateOne(
      { _id: new ObjectId(courseId) },
      { $addToSet: { pendingStudents: studentId } }
    );

    reply.send({ success: true, message: 'Đăng ký khóa học thành công, chờ giảng viên duyệt' });
  });

  // Lấy danh sách khóa học học viên đã đăng ký
  fastify.get('/my-courses/:studentId', async (request, reply) => {
    const studentId = request.params.studentId;

    try {
      const allCourses = await courses.find({
        $or: [
          { students: studentId },
          { pendingStudents: studentId }
        ]
      }).toArray();

      // Lấy danh sách ID giảng viên
      const teacherIds = allCourses.map(c => c.teacher).filter(Boolean);
      const teacherObjects = await users.find({
        _id: { $in: teacherIds.map(id => new ObjectId(id)) }
      }).project({ _id: 1, name: 1 }).toArray();

      const teacherMap = {};
      teacherObjects.forEach(t => {
        teacherMap[t._id.toString()] = t.name;
      });

      const result = allCourses.map(course => {
        let status = 'pending';
        if (course.students?.includes(studentId)) status = 'approved';

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          teacherName: teacherMap[course.teacher?.toString()] || 'Không xác định',
          duration: course.duration,
          status,

        };
      });

      reply.send(result);
    } catch (err) {
      console.error(err);
      reply.code(500).send({ error: 'Lỗi khi lấy danh sách khóa học' });
    }
  });

  // Xóa học viên
  fastify.delete('/:id', async (request, reply) => {
    try {
      const result = await students.deleteOne({ _id: new ObjectId(request.params.id) });
      if (result.deletedCount === 0) {
        return reply.code(404).send({ error: 'Không tìm thấy học viên' });
      }
      reply.send({ success: true });
    } catch {
      reply.code(400).send({ error: 'ID không hợp lệ' });
    }
  });
}

module.exports = studentRoutes;
