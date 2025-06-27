const { ObjectId } = require("mongodb");

async function courseController(fastify) {
  const courses = await require("../models/courseModel")(fastify.mongo.db);
  const users = await require("../models/userModel")(fastify.mongo.db);

  return {
    // Lấy tất cả khóa học
    getAllCourses: async (request, reply) => {
      try {
        const allCourses = await courses.getAllCourses();
        reply.send(allCourses);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy danh sách khóa học: " + error.message });
      }
    },

    // Lấy khóa học theo ID
    getCourseById: async (request, reply) => {
      try {
        const { id } = request.params;
        const course = await courses.findById(id);

        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        reply.send(course);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy thông tin khóa học: " + error.message });
      }
    },

    // Tạo khóa học mới (Teacher)
    createCourse: async (request, reply) => {
      try {
        const teacherId = request.user._id;
        const { courseName, description, startDate, endDate, maxStudents } =
          request.body;

        const courseData = {
          courseName,
          description,
          teacherId: new ObjectId(teacherId),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          maxStudents: maxStudents || 50,
          students: [],
          isActive: true,
        };

        const result = await courses.createCourse(courseData);
        reply.send({
          success: true,
          message: "Tạo khóa học thành công",
          courseId: result.insertedId,
        });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi tạo khóa học: " + error.message });
      }
    },

    // Cập nhật khóa học (Teacher)
    updateCourse: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;
        const updateData = request.body;

        // Kiểm tra quyền sở hữu
        const course = await courses.findById(id);
        if (!course || course.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền chỉnh sửa khóa học này" });
        }

        await courses.updateCourse(id, updateData);
        reply.send({ success: true, message: "Cập nhật khóa học thành công" });
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi cập nhật khóa học: " + error.message });
      }
    },

    // Xóa khóa học (Teacher)
    deleteCourse: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;

        // Kiểm tra quyền sở hữu
        const course = await courses.findById(id);
        if (!course || course.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xóa khóa học này" });
        }

        await courses.deleteCourse(id);
        reply.send({ success: true, message: "Xóa khóa học thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi xóa khóa học: " + error.message });
      }
    },

    // Lấy khóa học của teacher
    getTeacherCourses: async (request, reply) => {
      try {
        const teacherId = request.user._id;
        const teacherCourses = await courses.findByTeacherId(teacherId);
        reply.send(teacherCourses);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy khóa học của giảng viên: " + error.message });
      }
    },

    // Lấy khóa học của student
    getStudentCourses: async (request, reply) => {
      try {
        console.log("Đang lấy khóa học cho học viên:", request.user._id);

        if (!request.user || !request.user._id) {
          console.log("Không tìm thấy thông tin người dùng trong request");
          return reply
            .code(401)
            .send({ error: "Không tìm thấy thông tin người dùng" });
        }

        const studentId = request.user._id;
        console.log("ID học viên:", studentId);

        // Kiểm tra xem học viên có tồn tại không
        const student = await fastify.mongo.db.collection("users").findOne({
          _id: new ObjectId(studentId),
          role: "student",
        });

        if (!student) {
          console.log("Không tìm thấy học viên với ID:", studentId);
          return reply
            .code(404)
            .send({ error: "Không tìm thấy thông tin học viên" });
        }

        console.log("Tìm khóa học cho học viên:", studentId);

        // Tìm kiếm trực tiếp từ collection thay vì dùng model để debug
        const directEnrolledCourses = await fastify.mongo.db
          .collection("courses")
          .find({
            $or: [
              { students: new ObjectId(studentId) },
              { "students.studentId": new ObjectId(studentId) },
            ],
          })
          .toArray();

        console.log(
          `Tìm thấy trực tiếp ${directEnrolledCourses.length} khóa học`
        );

        // Sử dụng model
        const studentCourses = await courses.findByStudentId(studentId);
        console.log(`Tìm thấy qua model ${studentCourses.length} khóa học`);

        // Log chi tiết các khóa học tìm thấy
        studentCourses.forEach((course, index) => {
          console.log(
            `Khóa học ${index + 1}: ID=${course._id}, Tên=${
              course.courseName || course.title || "Không tên"
            }`
          );
        });

        // Kết hợp cả hai kết quả để đảm bảo không bỏ sót
        const combinedCourses = [...studentCourses];

        // Thêm những khóa học tìm được trực tiếp nhưng không nằm trong kết quả của model
        directEnrolledCourses.forEach((directCourse) => {
          const alreadyExists = combinedCourses.some(
            (course) => course._id.toString() === directCourse._id.toString()
          );
          if (!alreadyExists) {
            combinedCourses.push(directCourse);
          }
        });

        console.log(
          `Kết quả sau khi kết hợp: ${combinedCourses.length} khóa học`
        );

        reply.send(combinedCourses);
      } catch (error) {
        console.error("Lỗi lấy khóa học của học viên:", error);
        reply
          .code(500)
          .send({ error: "Lỗi lấy khóa học của học viên: " + error.message });
      }
    },

    // Đăng ký khóa học (Student)
    enrollInCourse: async (request, reply) => {
      try {
        const { id } = request.params;
        const studentId = request.user._id;

        // Ensure we have a valid studentId
        if (!studentId) {
          console.error("Missing studentId in user object");
          return reply.code(400).send({ error: "Invalid student information" });
        }

        console.log(
          `Attempting to enroll student ${studentId} in course ${id}`
        );

        const course = await courses.findById(id);
        if (!course) {
          console.log(`Course ${id} not found`);
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        console.log(`Course found: ${course.courseName || course.title}`);
        console.log(`Current students count: ${course.students.length}`);
        console.log(`Max students allowed: ${course.maxStudents}`);

        // Ensure students array exists
        if (!course.students) {
          course.students = [];
        }

        // Ensure pendingStudents array exists
        if (!course.pendingStudents) {
          course.pendingStudents = [];
        }

        // Kiểm tra đã đăng ký chưa
        let isEnrolled = false;

        try {
          isEnrolled =
            Array.isArray(course.students) &&
            course.students.some(
              (s) =>
                s &&
                s.studentId &&
                s.studentId.toString() === studentId.toString()
            );
        } catch (err) {
          console.error("Error checking enrolled students:", err);
          isEnrolled = false;
        }

        // Fix: Kiểm tra chính xác studentId trong pendingStudents - convert cả hai thành string để so sánh
        let isPending = false;

        try {
          isPending =
            Array.isArray(course.pendingStudents) &&
            course.pendingStudents.some(
              (id) => id && id.toString() === studentId.toString()
            );
        } catch (err) {
          console.error("Error checking pending students:", err);
          isPending = false;
        }

        console.log(`Student already enrolled: ${isEnrolled}`);
        console.log(`Student already pending: ${isPending}`);

        if (isEnrolled) {
          return reply
            .code(400)
            .send({ error: "Bạn đã đăng ký khóa học này rồi" });
        }

        if (isPending) {
          return reply
            .code(400)
            .send({ error: "Yêu cầu đăng ký của bạn đang chờ duyệt" });
        }

        // Kiểm tra số lượng tối đa
        if (course.students.length >= course.maxStudents) {
          return reply.code(400).send({ error: "Khóa học đã đầy" });
        }

        // Thêm học viên vào danh sách chờ duyệt
        await fastify.mongo.db.collection("courses").updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: { pendingStudents: new ObjectId(studentId) },
            $set: { updatedAt: new Date() },
          }
        );

        console.log(
          `Student ${studentId} added to pending list for course ${id}`
        );

        reply.send({
          success: true,
          message:
            "Đăng ký khóa học thành công. Vui lòng chờ giảng viên duyệt.",
        });
      } catch (error) {
        console.error("Error in enrollInCourse:", error);
        reply
          .code(500)
          .send({ error: "Lỗi đăng ký khóa học: " + error.message });
      }
    },

    // Hủy đăng ký khóa học (Student)
    unenrollFromCourse: async (request, reply) => {
      try {
        const { id } = request.params;
        const studentId = request.user._id;

        const course = await courses.findById(id);
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        // Kiểm tra đã đăng ký chưa
        const isEnrolled = course.students.some(
          (s) => s.studentId.toString() === studentId
        );
        if (!isEnrolled) {
          return reply
            .code(400)
            .send({ error: "Bạn chưa đăng ký khóa học này" });
        }

        await courses.unenrollStudent(id, studentId);
        reply.send({
          success: true,
          message: "Hủy đăng ký khóa học thành công",
        });
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi hủy đăng ký khóa học: " + error.message });
      }
    },

    // Xác nhận thanh toán khóa học (Student)
    confirmPayment: async (request, reply) => {
      try {
        const { id } = request.params;
        const studentId = request.user._id;
        const { paymentMethod, paymentStatus, paymentTime } = request.body;

        const course = await courses.findById(id);
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        // Kiểm tra đã đăng ký chưa
        const studentIndex = course.students.findIndex(
          (s) => s.studentId.toString() === studentId.toString()
        );

        if (studentIndex === -1) {
          return reply
            .code(400)
            .send({ error: "Bạn chưa đăng ký khóa học này" });
        }

        // Cập nhật thông tin thanh toán
        await fastify.mongo.db.collection("courses").updateOne(
          {
            _id: new ObjectId(id),
            "students.studentId": new ObjectId(studentId),
          },
          {
            $set: {
              "students.$.paymentMethod": paymentMethod,
              "students.$.paymentStatus": paymentStatus,
              "students.$.paymentTime": paymentTime,
              "students.$.paymentConfirmed": false, // Cần admin xác nhận
              "students.$.paymentUpdatedAt": new Date(),
            },
          }
        );

        reply.send({
          success: true,
          message: "Cập nhật thông tin thanh toán thành công",
        });
      } catch (error) {
        console.error("Lỗi xác nhận thanh toán:", error);
        reply
          .code(500)
          .send({ error: "Lỗi xác nhận thanh toán: " + error.message });
      }
    },

    // Lấy danh sách học viên trong khóa học (Teacher)
    getCourseStudents: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;

        // Kiểm tra quyền
        const course = await courses.findById(id);
        if (!course || course.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xem danh sách học viên" });
        }

        const courseWithStudents = await courses.getStudentsInCourse(id);
        reply.send(courseWithStudents);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy danh sách học viên: " + error.message });
      }
    },

    // Thêm học viên vào khóa học (Admin)
    addStudentToCourse: async (request, reply) => {
      try {
        const { courseId, studentId } = request.params;

        const studentData = {
          studentId: new ObjectId(studentId),
          enrolledAt: new Date(),
          status: "active",
        };

        await courses.addStudentToCourse(courseId, studentData);
        reply.send({
          success: true,
          message: "Thêm học viên vào khóa học thành công",
        });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi thêm học viên: " + error.message });
      }
    },

    // Xóa học viên khỏi khóa học (Admin)
    removeStudentFromCourse: async (request, reply) => {
      try {
        const { courseId, studentId } = request.params;

        await courses.removeStudentFromCourse(courseId, studentId);
        reply.send({
          success: true,
          message: "Xóa học viên khỏi khóa học thành công",
        });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi xóa học viên: " + error.message });
      }
    },
  };
}

module.exports = courseController;
