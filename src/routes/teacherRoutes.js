// src/routes/teacherRoutes.js
async function teacherRoutes(fastify, options) {
  const db = fastify.mongo.db;
  const courses = db.collection('courses');
  const users = db.collection('users');
  const { ObjectId } = fastify.mongo;

  // Middleware kiểm tra quyền teacher
  async function isTeacher(request, reply) {
    await request.jwtVerify();
    const user = await users.findOne({ _id: new ObjectId(request.user.id) });
    if (!user || user.role !== 'teacher') {
      return reply.code(403).send({ error: 'Chỉ giảng viên được phép truy cập' });
    }
    request.userInfo = user;
  }

  // Lấy danh sách khóa học của giảng viên
  fastify.get('/courses', { preValidation: [isTeacher] }, async (request, reply) => {
    const teacherId = new ObjectId(request.user.id);
    const myCourses = await courses.find({ teacher: teacherId }).toArray();
    reply.send(myCourses);
  });

  // Tạo khóa học mới
  fastify.post('/courses', { preValidation: [isTeacher] }, async (request, reply) => {
    const { title, description, duration } = request.body;
    const teacherId = new ObjectId(request.user.id);

    if (!title || !description) {
      return reply.code(400).send({ error: 'Thiếu tiêu đề hoặc mô tả khóa học' });
    }

    const newCourse = {
      title,
      description,
      duration,
      teacher: teacherId,
      students: [],
      pendingStudents: [],
    };

    const result = await courses.insertOne(newCourse);
    reply.send({ success: true, courseId: result.insertedId });
  });

  // Duyệt học viên đăng ký khóa học
  fastify.patch('/courses/:id/approve', { preValidation: [isTeacher] }, async (request, reply) => {
    const courseId = request.params.id;
    const { studentId } = request.body;

    if (!studentId) {
      return reply.code(400).send({ error: 'Thiếu studentId trong body' });
    }

    const course = await courses.findOne({ _id: new ObjectId(courseId) });
    if (!course) {
      return reply.code(404).send({ error: 'Không tìm thấy khóa học' });
    }

    if (!course.teacher.equals(new ObjectId(request.user.id))) {
      return reply.code(403).send({ error: 'Bạn không có quyền duyệt học viên cho khóa học này' });
    }

    if (!course.pendingStudents?.includes(studentId)) {
      return reply.code(400).send({ error: 'Học viên chưa đăng ký hoặc đã được duyệt' });
    }

    await courses.updateOne(
      { _id: new ObjectId(courseId) },
      {
        $pull: { pendingStudents: studentId },
        $addToSet: { students: studentId }
      }
    );

    reply.send({ success: true, message: 'Đã duyệt học viên vào khóa học' });
  });
}

module.exports = teacherRoutes;
