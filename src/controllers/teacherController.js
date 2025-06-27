const { ObjectId } = require("mongodb");

module.exports = (fastify) => {
  const db = fastify.mongo.db;
  const courses = db.collection("courses");
  const users = db.collection("users");

  //Tự động xóa khóa học quá thời hạn
  async function ensureExpireIndex() {
    await courses.createIndex({ endDate: 1 }, { expireAfterSeconds: 0 });
  }

  // Middleware kiểm tra quyền giảng viên
  async function isTeacher(request, reply) {
    try {
      await request.jwtVerify();

      if (!request.user || !request.user._id) {
        console.error("JWT verify successful but user data is missing");
        return reply.code(401).send({ error: "Token không hợp lệ" });
      }

      const userId = request.user._id;
      console.log("Checking teacher role for user:", userId);

      try {
        const objectId = new ObjectId(userId);
        const user = await users.findOne({ _id: objectId });

        if (!user) {
          console.error("User not found in database:", userId);
          return reply.code(404).send({ error: "Không tìm thấy người dùng" });
        }

        if (user.role !== "teacher") {
          console.error("User is not a teacher:", userId, "Role:", user.role);
          return reply
            .code(403)
            .send({ error: "Chỉ giảng viên được phép truy cập" });
        }

        // Set user info in the request for later use
        request.user = user;
      } catch (error) {
        console.error("Error converting userId to ObjectId:", error);
        return reply.code(400).send({ error: "ID người dùng không hợp lệ" });
      }
    } catch (error) {
      console.error("Error in isTeacher middleware:", error);
      return reply
        .code(401)
        .send({ error: "Token không hợp lệ hoặc đã hết hạn" });
    }
  }

  return {
    isTeacher,

    // Get teacher by ID
    async getTeacherById(request, reply) {
      try {
        const teacherId = request.params.id;
        console.log("Fetching teacher by ID:", teacherId);

        // Validate ID format
        let objectId;
        try {
          objectId = new ObjectId(teacherId);
        } catch (error) {
          return reply.code(400).send({ error: "ID giảng viên không hợp lệ" });
        }

        // Find the teacher
        const teacher = await users.findOne(
          {
            _id: objectId,
            role: "teacher",
          },
          {
            projection: {
              _id: 1,
              name: 1,
              email: 1,
              bio: 1,
              expertise: 1,
              avatar: 1,
            },
          }
        );

        if (!teacher) {
          return reply.code(404).send({ error: "Không tìm thấy giảng viên" });
        }

        reply.send(teacher);
      } catch (error) {
        console.error("Error fetching teacher:", error);
        reply.code(500).send({ error: "Lỗi khi tải thông tin giảng viên" });
      }
    },

    async getMyCourses(request, reply) {
      try {
        const teacherId = new ObjectId(request.user._id);
        console.log("Fetching courses for teacher ID:", teacherId);
        const myCourses = await courses.find({ teacher: teacherId }).toArray();
        console.log("Found courses:", myCourses.length);
        reply.send(myCourses);
      } catch (error) {
        console.error("Error fetching teacher courses:", error);
        reply.code(500).send({ error: "Lỗi khi tải khóa học" });
      }
    },

    async createCourse(request, reply) {
      try {
        const {
          title,
          description,
          duration,
          schedule,
          startDate,
          endDate,
          meetLink,
        } = request.body;

        if (
          !title ||
          !description ||
          !schedule ||
          !startDate ||
          !endDate ||
          !meetLink
        ) {
          return reply.code(400).send({ error: "Thiếu thông tin khóa học" });
        }

        const teacherId = new ObjectId(request.user._id);
        console.log("Creating course for teacher:", teacherId);

        const newCourse = {
          title,
          description,
          duration,
          schedule,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          meetLink,
          teacher: teacherId,
          students: [],
          pendingStudents: [],
        };

        const result = await courses.insertOne(newCourse);
        reply.send({ success: true, courseId: result.insertedId });
      } catch (error) {
        console.error("Error creating course:", error);
        reply.code(500).send({ error: "Lỗi khi tạo khóa học" });
      }
    },

    async approveStudent(request, reply) {
      try {
        const courseId = request.params.id;
        const { studentId } = request.body;

        if (!studentId) {
          return reply.code(400).send({ error: "Thiếu studentId trong body" });
        }

        console.log("Approving student for course:", courseId);
        const course = await courses.findOne({ _id: new ObjectId(courseId) });
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        if (!course.teacher.equals(new ObjectId(request.user._id))) {
          return reply.code(403).send({
            error: "Bạn không có quyền duyệt học viên cho khóa học này",
          });
        }

        // Convert studentId từ string sang ObjectId để so sánh
        const sid = new ObjectId(studentId);
        if (!course.pendingStudents?.some((id) => id.equals(sid))) {
          return reply
            .code(400)
            .send({ error: "Học viên chưa đăng ký hoặc đã được duyệt" });
        }

        // Thêm dữ liệu học viên với đầy đủ thông tin cần thiết
        const studentData = {
          studentId: sid,
          enrolledAt: new Date(),
          status: "active",
        };

        // Xóa học viên khỏi pendingStudents và thêm vào students với thông tin đầy đủ
        await courses.updateOne(
          { _id: new ObjectId(courseId) },
          {
            $pull: { pendingStudents: sid },
            $addToSet: { students: studentData },
          }
        );

        reply.send({
          success: true,
          message: "Đã duyệt học viên vào khóa học",
        });
      } catch (error) {
        console.error("Error approving student:", error);
        reply.code(500).send({ error: "Lỗi khi duyệt học viên" });
      }
    },

    async getStudentsList(request, reply) {
      try {
        const courseId = request.params.id;
        console.log("Getting students list for course:", courseId);

        const course = await courses.findOne({ _id: new ObjectId(courseId) });
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        if (!course.teacher.equals(new ObjectId(request.user._id))) {
          return reply.code(403).send({
            error: "Bạn không có quyền xem học viên của khóa học này",
          });
        }

        // Handle possibly undefined arrays safely
        const pendingStudentIds = course.pendingStudents || [];
        const approvedStudentIds = course.students || [];

        console.log("Pending students:", pendingStudentIds.length);
        console.log("Approved students:", approvedStudentIds.length);

        const pending = await users
          .find({ _id: { $in: pendingStudentIds } })
          .project({ _id: 1, name: 1 })
          .toArray();

        const approved = await users
          .find({ _id: { $in: approvedStudentIds } })
          .project({ _id: 1, name: 1 })
          .toArray();

        reply.send({ pendingStudents: pending, approvedStudents: approved });
      } catch (error) {
        console.error("Error getting students list:", error);
        reply.code(500).send({ error: "Lỗi khi lấy danh sách học viên" });
      }
    },

    async getCourseById(request, reply) {
      try {
        const courseId = request.params.id;
        console.log("Getting course by ID:", courseId);

        // Validate ID format
        let objectId;
        try {
          objectId = new ObjectId(courseId);
        } catch (error) {
          return reply.code(400).send({ error: "ID khóa học không hợp lệ" });
        }

        // Find the course
        const course = await courses.findOne({
          _id: objectId,
          teacher: new ObjectId(request.user._id),
        });

        if (!course) {
          return reply
            .code(404)
            .send({
              error: "Không tìm thấy khóa học hoặc bạn không có quyền truy cập",
            });
        }

        reply.send(course);
      } catch (error) {
        console.error("Error fetching course:", error);
        reply.code(500).send({ error: "Lỗi khi tải thông tin khóa học" });
      }
    },

    async updateCourse(request, reply) {
      try {
        const courseId = request.params.id;
        const {
          title,
          description,
          duration,
          schedule,
          startDate,
          endDate,
          meetLink,
          maxStudents,
        } = request.body;

        if (
          !title ||
          !description ||
          !schedule ||
          !startDate ||
          !endDate ||
          !meetLink
        ) {
          return reply.code(400).send({ error: "Thiếu thông tin khóa học" });
        }

        console.log("Updating course for ID:", courseId);

        // Check if course exists and belongs to this teacher
        const course = await courses.findOne({
          _id: new ObjectId(courseId),
          teacher: new ObjectId(request.user._id),
        });

        if (!course) {
          return reply.code(404).send({
            error: "Không tìm thấy khóa học hoặc bạn không có quyền chỉnh sửa",
          });
        }

        // Prepare update data
        const updateData = {
          title,
          description,
          duration,
          schedule,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          meetLink,
          updatedAt: new Date(),
        };

        // Add maxStudents if provided
        if (maxStudents) {
          updateData.maxStudents = parseInt(maxStudents);
        }

        // Update the course
        const result = await courses.updateOne(
          { _id: new ObjectId(courseId) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        reply.send({ success: true, message: "Cập nhật khóa học thành công" });
      } catch (error) {
        console.error("Error updating course:", error);
        reply.code(500).send({ error: "Lỗi khi cập nhật khóa học" });
      }
    },
  };
};
