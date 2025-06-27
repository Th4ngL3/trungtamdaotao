const { ObjectId } = require("mongodb");

async function assignmentController(fastify) {
  const assignments = await require("../models/assignmentModel")(
    fastify.mongo.db
  );
  const courses = await require("../models/courseModel")(fastify.mongo.db);

  return {
    // Tạo bài tập mới (Teacher)
    createAssignment: async (request, reply) => {
      try {
        console.log("Create assignment called with body:", request.body);

        const teacherId = request.user._id;
        console.log(
          `Teacher ID from request.user: ${teacherId} (Type: ${typeof teacherId}, instanceof ObjectId: ${
            teacherId instanceof ObjectId
          })`
        );
        console.log(`Teacher ID as string: ${teacherId.toString()}`);

        const {
          title,
          description,
          courseId,
          dueDate,
          maxScore,
          instructions,
        } = request.body;

        // Validate required fields
        if (!title || !courseId || !dueDate) {
          console.log("Missing required fields");
          return reply.code(400).send({
            error: "Thiếu thông tin bắt buộc: title, courseId, dueDate",
          });
        }

        // Ensure courseId is properly formatted as ObjectId
        let courseObjectId;
        try {
          courseObjectId = new ObjectId(courseId);
          console.log(`Course ID converted to ObjectId: ${courseObjectId}`);
        } catch (err) {
          console.error("Invalid course ID format:", courseId);
          return reply.code(400).send({ error: "Mã khóa học không hợp lệ" });
        }

        console.log("Looking up course:", courseObjectId);
        // Kiểm tra khóa học tồn tại
        const course = await courses.findById(courseObjectId);
        console.log("Raw course data:", JSON.stringify(course, null, 2));

        if (!course) {
          console.log("Course not found:", courseObjectId);
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        console.log("Course found:", course._id);

        // Debug all fields in course
        console.log("Course fields:");
        for (const [key, value] of Object.entries(course)) {
          const valueType = typeof value;
          const isObjectId = value instanceof ObjectId;
          console.log(
            `  ${key}: ${value} (Type: ${valueType}, isObjectId: ${isObjectId})`
          );
        }

        // Kiểm tra quyền sở hữu khóa học
        let courseTeacherId = null;
        if (course.teacherId) {
          courseTeacherId =
            typeof course.teacherId === "string"
              ? course.teacherId
              : course.teacherId.toString();
        } else if (course.teacher) {
          courseTeacherId =
            typeof course.teacher === "string"
              ? course.teacher
              : course.teacher.toString();
        }

        const currentTeacherId = teacherId ? teacherId.toString() : null;

        console.log(
          "Course teacherId:",
          courseTeacherId,
          "Type:",
          typeof courseTeacherId
        );
        console.log(
          "Current teacher id:",
          currentTeacherId,
          "Type:",
          typeof currentTeacherId
        );
        console.log("Do they match?", courseTeacherId === currentTeacherId);

        if (!courseTeacherId) {
          console.log("Course has no teacher ID");
          return reply
            .code(403)
            .send({ error: "Khóa học không có giảng viên" });
        }

        if (courseTeacherId !== currentTeacherId) {
          console.log("Teacher doesn't own this course");
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền tạo bài tập cho khóa học này" });
        }

        const assignmentData = {
          title,
          description: description || "",
          courseId: courseObjectId, // Use the properly formatted ObjectId
          teacherId: new ObjectId(teacherId),
          dueDate: new Date(dueDate),
          maxScore: maxScore || 100,
          instructions: instructions || "",
          submissions: [],
          isActive: true,
        };

        console.log("Creating assignment with data:", {
          title: assignmentData.title,
          courseId: assignmentData.courseId,
          dueDate: assignmentData.dueDate,
        });

        const result = await assignments.createAssignment(assignmentData);
        console.log("Assignment created with ID:", result.insertedId);

        reply.send({
          success: true,
          message: "Tạo bài tập thành công",
          assignmentId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating assignment:", error);
        reply.code(500).send({ error: "Lỗi tạo bài tập: " + error.message });
      }
    },

    // Cập nhật bài tập (Teacher)
    updateAssignment: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;
        const updateData = request.body;

        // Kiểm tra quyền sở hữu
        const assignment = await assignments.findById(id);
        if (!assignment || assignment.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền chỉnh sửa bài tập này" });
        }

        await assignments.updateAssignment(id, updateData);
        reply.send({ success: true, message: "Cập nhật bài tập thành công" });
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi cập nhật bài tập: " + error.message });
      }
    },

    // Xóa bài tập (Teacher)
    deleteAssignment: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;

        // Kiểm tra quyền sở hữu
        const assignment = await assignments.findById(id);
        if (!assignment || assignment.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xóa bài tập này" });
        }

        await assignments.deleteAssignment(id);
        reply.send({ success: true, message: "Xóa bài tập thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi xóa bài tập: " + error.message });
      }
    },

    // Lấy bài tập của teacher
    getTeacherAssignments: async (request, reply) => {
      try {
        const teacherId = request.user._id;
        const teacherAssignments = await assignments.findByTeacherId(teacherId);

        // Lấy thông tin courses để thêm tên khóa học vào bài tập
        const courseIds = [
          ...new Set(teacherAssignments.map((a) => a.courseId.toString())),
        ];
        const coursesData = {};

        for (const courseId of courseIds) {
          const course = await courses.findById(courseId);
          if (course) {
            coursesData[courseId] = {
              name: course.courseName || course.title || `Khóa học ${courseId}`,
              // Có thể thêm thông tin khác của khóa học nếu cần
            };
          }
        }

        // Thêm tên khóa học vào mỗi bài tập
        const enhancedAssignments = teacherAssignments.map((assignment) => {
          const courseId = assignment.courseId.toString();
          return {
            ...assignment,
            courseName: coursesData[courseId]
              ? coursesData[courseId].name
              : "Khóa học không xác định",
          };
        });

        reply.send(enhancedAssignments);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy bài tập của giảng viên: " + error.message });
      }
    },

    // Lấy bài tập theo khóa học (Student)
    getCourseAssignments: async (request, reply) => {
      try {
        const { courseId } = request.params;
        const studentId = request.user._id;

        // Kiểm tra student có trong khóa học không
        const course = await courses.findById(courseId);
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        const isEnrolled = course.students.some(
          (s) => s.studentId.toString() === studentId
        );
        if (!isEnrolled) {
          return reply
            .code(403)
            .send({ error: "Bạn chưa đăng ký khóa học này" });
        }

        const courseAssignments = await assignments.findByCourseId(courseId);

        // Thêm tên khóa học vào mỗi bài tập
        const enhancedAssignments = courseAssignments.map((assignment) => ({
          ...assignment,
          courseName:
            course.courseName || course.title || `Khóa học ${courseId}`,
        }));

        reply.send(enhancedAssignments);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy bài tập khóa học: " + error.message });
      }
    },

    // Lấy chi tiết bài tập
    getAssignmentById: async (request, reply) => {
      try {
        const { id } = request.params;
        const assignment = await assignments.findById(id);

        if (!assignment) {
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        // Lấy thêm thông tin tên khóa học
        const course = await courses.findById(assignment.courseId);
        if (course) {
          assignment.courseName =
            course.courseName ||
            course.title ||
            `Khóa học ${assignment.courseId}`;
        }

        reply.send(assignment);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy thông tin bài tập: " + error.message });
      }
    },

    // Nộp bài tập (Student)
    submitAssignment: async (request, reply) => {
      try {
        const { id } = request.params;
        const studentId = request.user._id;
        const { content, fileUrls } = request.body;

        const assignment = await assignments.findById(id);
        if (!assignment) {
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        // Kiểm tra deadline
        if (new Date() > assignment.dueDate) {
          return reply.code(400).send({ error: "Đã quá hạn nộp bài" });
        }

        // Kiểm tra đã nộp chưa
        const existingSubmission = assignment.submissions.find(
          (s) => s.studentId.toString() === studentId
        );
        if (existingSubmission) {
          return reply.code(400).send({ error: "Bạn đã nộp bài tập này rồi" });
        }

        const submissionData = {
          content: content || "",
          fileUrls: fileUrls || [],
          status: "submitted",
        };

        await assignments.submitAssignment(id, studentId, submissionData);
        reply.send({ success: true, message: "Nộp bài tập thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi nộp bài tập: " + error.message });
      }
    },

    // Lấy bài nộp của học viên hiện tại
    getMySubmission: async (request, reply) => {
      try {
        const { id } = request.params;
        const studentId = request.user._id;

        console.log(
          `Getting submission for assignment ${id} by student ${studentId}`
        );

        // Kiểm tra bài tập tồn tại
        const assignment = await assignments.findById(id);
        if (!assignment) {
          console.log("Assignment not found");
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        // Tìm bài nộp của học viên
        const submission = await assignments.getStudentSubmission(
          id,
          studentId
        );

        if (!submission) {
          console.log("No submission found");
          return reply.code(404).send({ error: "Bạn chưa nộp bài tập này" });
        }

        reply.send(submission);
      } catch (error) {
        console.error("Error getting student submission:", error);
        reply
          .code(500)
          .send({ error: "Lỗi lấy bài nộp của học viên: " + error.message });
      }
    },

    // Lấy tất cả bài nộp của bài tập (Teacher)
    getAssignmentSubmissions: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;

        console.log(
          `Getting submissions for assignment: ${id}, requested by teacher: ${teacherId}`
        );

        // Kiểm tra quyền
        const assignment = await assignments.findById(id);
        if (!assignment) {
          console.log(`Assignment not found: ${id}`);
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        if (assignment.teacherId.toString() !== teacherId.toString()) {
          console.log(
            `Teacher ${teacherId} doesn't have permission for assignment ${id} with teacher ${assignment.teacherId}`
          );
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xem bài nộp" });
        }

        // Lấy thông tin bài nộp
        const submissionData = await assignments.getAllSubmissions(id);
        if (!submissionData || !submissionData.submissions) {
          console.log("No submissions found");
          return reply.send({
            title: assignment.title,
            description: assignment.description,
            submissions: [],
          });
        }

        // Lấy thông tin học viên để bổ sung tên cho bài nộp
        const studentIds = submissionData.submissions.map((s) => s.studentId);
        const studentMap = {};

        try {
          for (const studentId of studentIds) {
            // Tìm trong bảng users trước
            const user = await db
              .collection("users")
              .findOne({ _id: studentId });

            if (user) {
              studentMap[studentId.toString()] = {
                name: user.fullName || user.name || "Học viên không xác định",
                email: user.email,
              };
            } else {
              // Nếu không tìm thấy, tìm trong bảng students
              const student = await db
                .collection("students")
                .findOne({ _id: studentId });
              if (student) {
                studentMap[studentId.toString()] = {
                  name: student.name || "Học viên không xác định",
                  email: student.email,
                };
              }
            }
          }
        } catch (studentError) {
          console.error("Error fetching student information:", studentError);
        }

        // Thêm tên học viên vào mỗi bài nộp
        const enhancedSubmissions = submissionData.submissions.map((sub) => {
          const studentInfo = studentMap[sub.studentId.toString()] || {};
          return {
            ...sub,
            studentName: studentInfo.name || "Học viên không xác định",
            studentEmail: studentInfo.email || "",
          };
        });

        console.log(`Returning ${enhancedSubmissions.length} submissions`);

        reply.send({
          title: submissionData.title,
          description: submissionData.description,
          submissions: enhancedSubmissions,
        });
      } catch (error) {
        console.error("Error getting assignment submissions:", error);
        reply.code(500).send({ error: "Lỗi lấy bài nộp: " + error.message });
      }
    },

    // Chấm điểm bài tập (Teacher)
    gradeSubmission: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;
        const { studentId, grade, feedback } = request.body;

        // Kiểm tra quyền
        const assignment = await assignments.findById(id);
        if (!assignment || assignment.teacherId.toString() !== teacherId) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền chấm điểm" });
        }

        await assignments.gradeSubmission(id, studentId, grade, feedback);
        reply.send({ success: true, message: "Chấm điểm thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi chấm điểm: " + error.message });
      }
    },

    // Lấy tất cả bài tập (Admin)
    getAllAssignments: async (request, reply) => {
      try {
        const allAssignments = await assignments.getAllAssignments();
        reply.send(allAssignments);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy danh sách bài tập: " + error.message });
      }
    },
  };
}

module.exports = assignmentController;
