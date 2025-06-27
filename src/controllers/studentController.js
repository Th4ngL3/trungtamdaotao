const { ObjectId } = require('mongodb');
const QRCode = require('qrcode');

module.exports = (fastify) => {
  const db = fastify.mongo.db;
  const students = db.collection('students');
  const courses = db.collection('courses');
  const users = db.collection('users');

  return {
    async addStudent(request, reply) {
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
    },

    async getAllStudents(_, reply) {
      const allStudents = await students.find().toArray();
      reply.send(allStudents);
    },

    async getAllCourses(request, reply) {
      // Lấy danh sách tất cả khóa học
      const all = await courses.find().toArray();

      // Lấy map id→tên giảng viên
      const teacherIds = all.map(c => c.teacher).filter(Boolean);
      const teachers = await users.find({ _id: { $in: teacherIds } })
        .project({ name: 1 }).toArray();
      const tMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.name]));

      // Chỉ trả _id, title, description, teacherName và status (pending/none)
      const result = await Promise.all(all.map(async course => {
        let status = 'none';
        // Nếu đã đăng ký đang chờ xét duyệt
        if (course.pendingStudents?.some(id => id.toString() === request.user._id)) {
          status = 'pending';
        } else if (course.students?.some(id => id.toString() === request.user._id)) {
          status = 'approved';
        }
        const base = {
          _id: course._id,
          title: course.title,
          description: course.description,
          teacherName: tMap[course.teacher?.toString()] || 'Không xác định',
          status
        };

        if (status !== 'approved') {
          // Sinh QR code server-side cho payment
          const paymentData = `Chuyen khoan khoa ${course._id.toString()} - hoc vien ${request.user._id}`;
          const qrCodeUrl = await QRCode.toDataURL(paymentData);

          return {
            ...base,
            // chỉ trả qrCodeUrl, không cần các trường approved
            qrCodeUrl
          };
        }

        // Nếu đã approved, thêm chi tiết
        if (status === 'approved') {
          // sinh QR code server-side
          const qrCodeUrl = await QRCode.toDataURL(
            `Nội dung chuyển khoản: học viên ${request.user._id} thanh toán khóa ${course._id}`
          );

          return {
            ...base,
            duration: course.duration,
            startDate: course.startDate,
            endDate: course.endDate,
            schedule: course.schedule,
            meetLink: course.meetLink,
            qrCodeUrl
          };
        }

        return base;
      }));
      reply.send(result);
    },

    async getStudentById(request, reply) {
      try {
        const student = await students.findOne({ _id: new ObjectId(request.params.id) });
        if (!student) return reply.code(404).send({ error: 'Không tìm thấy học viên' });
        reply.send(student);
      } catch {
        reply.code(400).send({ error: 'ID không hợp lệ' });
      }
    },

    async updateStudent(request, reply) {
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
    },

    async deleteStudent(request, reply) {
      try {
        const result = await students.deleteOne({ _id: new ObjectId(request.params.id) });
        if (result.deletedCount === 0) {
          return reply.code(404).send({ error: 'Không tìm thấy học viên' });
        }
        reply.send({ success: true });
      } catch {
        reply.code(400).send({ error: 'ID không hợp lệ' });
      }
    },

    async registerCourse(request, reply) {
      try {
        const courseId = request.params.courseId;

        // Lấy _id từ token và chuyển sang ObjectId
        const studentObjectId = new ObjectId(request.user._id);

        // Tìm khóa học
        const course = await courses.findOne({ _id: new ObjectId(courseId) });
        if (!course) {
          return reply.code(404).send({ error: 'Không tìm thấy khóa học' });
        }

        // Danh sách đã và đang đăng ký
        const enrolled = course.students || [];
        const pending = course.pendingStudents || [];

        // Kiểm tra xem đã đăng ký hoặc đang chờ duyệt chưa
        const alreadyRegistered = enrolled.some(id => id.toString() === studentObjectId.toString());
        const alreadyPending = pending.some(id => id.toString() === studentObjectId.toString());

        if (alreadyRegistered || alreadyPending) {
          return reply.code(400).send({ error: 'Bạn đã đăng ký hoặc đang chờ duyệt khóa học này' });
        }

        // Cập nhật vào danh sách chờ duyệt
        await courses.updateOne(
          { _id: new ObjectId(courseId) },
          { $addToSet: { pendingStudents: studentObjectId } }
        );

        // Sinh QR code ngay sau khi đăng ký để trả về cho client
        const qrData = `Chuyển khoản: học viên ${studentObjectId.toString()} - khóa ${course._id.toString()}`;
        const qrCodeUrl = await QRCode.toDataURL(qrData);


        reply.send({
          success: true,
          message: 'Đăng ký thành công! Vui lòng chuyển khoản theo mã QR dưới đây, chờ admin xác nhận.',
          qrCodeUrl
        });
      } catch (err) {
        console.error(err);
        reply.code(500).send({ error: 'Lỗi khi đăng ký khóa học' });
      }
    },


    async getMyCourses(request, reply) {
      try {
        // Lấy _id từ JWT token và chuyển về ObjectId
        const studentObjectId = new ObjectId(request.user._id);

        // Tìm các khóa học có sinh viên trong students hoặc pendingStudents
        const allCourses = await courses.find({
          $or: [
            { students: studentObjectId },
            { pendingStudents: studentObjectId }
          ]
        }).toArray();

        // Lấy thông tin giảng viên (nếu có)
        const teacherIds = allCourses.map(c => c.teacher).filter(Boolean);
        const teacherObjects = await users.find({
          _id: { $in: teacherIds.map(id => new ObjectId(id)) }
        }).project({ _id: 1, name: 1 }).toArray();

        const teacherMap = {};
        teacherObjects.forEach(t => {
          teacherMap[t._id.toString()] = t.name;
        });

        // Xử lý kết quả trả về cho frontend
        const result = await Promise.all(allCourses.map(async course => {
          const isApproved = course.students?.some(id => id.equals(studentObjectId));
          const base = {
            _id: course._id,
            title: course.title,
            description: course.description,
            teacherName: teacherMap[course.teacher?.toString()] || 'Không xác định',
            status: isApproved ? 'approved' : 'pending'
          };

          if (isApproved) {
            // Sinh QR code server-side
            const qrCodeUrl = await QRCode.toDataURL(
              `Nội dung chuyển khoản: học viên ${studentObjectId} thanh toán khóa ${course._id}`);
            return {
              ...base,
              duration: course.duration,
              startDate: course.startDate,
              endDate: course.endDate,
              schedule: course.schedule,
              meetLink: course.meetLink,
              qrCodeUrl
            };
          }
          return base;
        }));

        reply.send(result);
      } catch (err) {
        console.error(err);
        reply.code(500).send({ error: 'Lỗi khi lấy danh sách khóa học' });
      }
    },

  };
};
