const { ObjectId } = require("mongodb");

async function assignmentController(fastify) {
  const assignments = await require("../models/assignmentModel")(fastify.mongo.db);
  const courses = await require("../models/courseModel")(fastify.mongo.db);

  return {
    // Tạo bài tập mới (Teacher)
    createAssignment: async (request, reply) => {
      try {

        const teacherId = request.user._id;
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
          return reply.code(400).send({
            error: "Thiếu thông tin bắt buộc: title, courseId, dueDate",
          });
        }

        // Ensure courseId is properly formatted as ObjectId
        let courseObjectId;
        try {
          courseObjectId = new ObjectId(courseId);
        } catch (err) {
          console.error("Invalid course ID format:", courseId);
          return reply.code(400).send({ error: "Mã khóa học không hợp lệ" });
        }

        // Kiểm tra khóa học tồn tại
        const course = await courses.findById(courseObjectId);

        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        // Kiểm tra quyền sở hữu khóa học
        let courseTeacherId = null;
        if (course.teacherId) {
          courseTeacherId =
            typeof course.teacherId === "string" ? course.teacherId : course.teacherId.toString();
        } else if (course.teacher) {
          courseTeacherId =
            typeof course.teacher === "string" ? course.teacher : course.teacher.toString();
        }

        const currentTeacherId = teacherId ? teacherId.toString() : null;

        if (!courseTeacherId) {
          return reply.code(403).send({ error: "Khóa học không có giảng viên" });
        }

        if (courseTeacherId !== currentTeacherId) {
          return reply.code(403).send({ error: "Bạn không có quyền tạo bài tập cho khóa học này" });
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


        const result = await assignments.createAssignment(assignmentData);

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
          return reply.code(403).send({ error: "Bạn không có quyền chỉnh sửa bài tập này" });
        }

        await assignments.updateAssignment(id, updateData);
        reply.send({ success: true, message: "Cập nhật bài tập thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi cập nhật bài tập: " + error.message });
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
          return reply.code(403).send({ error: "Bạn không có quyền xóa bài tập này" });
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
        const courseIds = [...new Set(teacherAssignments.map((a) => a.courseId.toString())),];
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
            courseName: coursesData[courseId] ? coursesData[courseId].name : "Khóa học không xác định",
          };
        });

        reply.send(enhancedAssignments);
      } catch (error) {
        reply.code(500).send({ error: "Lỗi lấy bài tập của giảng viên: " + error.message });
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
          return reply.code(403).send({ error: "Bạn chưa đăng ký khóa học này" });
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
        reply.code(500).send({ error: "Lỗi lấy bài tập khóa học: " + error.message });
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
        reply.code(500).send({ error: "Lỗi lấy thông tin bài tập: " + error.message });
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

        // Kiểm tra bài tập tồn tại
        const assignment = await assignments.findById(id);
        if (!assignment) {
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        // Tìm bài nộp của học viên
        const submission = await assignments.getStudentSubmission(id, studentId);

        if (!submission) {
          return reply.code(404).send({ error: "Bạn chưa nộp bài tập này" });
        }

        reply.send(submission);
      } catch (error) {
        console.error("Error getting student submission:", error);
        reply.code(500).send({ error: "Lỗi lấy bài nộp của học viên: " + error.message });
      }
    },

    // Lấy tất cả bài nộp của bài tập (Teacher)
    getAssignmentSubmissions: async (request, reply) => {
      try {
        const { id } = request.params;
        const teacherId = request.user._id;

        // Kiểm tra quyền
        const assignment = await assignments.findById(id);
        if (!assignment) {
          return reply.code(404).send({ error: "Không tìm thấy bài tập" });
        }

        if (assignment.teacherId.toString() !== teacherId.toString()) {

          return reply.code(403).send({ error: "Bạn không có quyền xem bài nộp" });
        }

        // Lấy thông tin bài nộp
        const submissionData = await assignments.getAllSubmissions(id);
        if (!submissionData || !submissionData.submissions) {
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
            if (!studentId) continue;

            try {
              const user = await fastify.mongo.db.collection("users").findOne({ _id: studentId });

              if (user) {
                studentMap[studentId.toString()] = {
                  name: user.fullName || user.name || "Học viên không xác định",
                  email: user.email,
                };
              } else {
                const student = await fastify.mongo.db.collection("students").findOne({ _id: studentId });
                if (student) {
                  studentMap[studentId.toString()] = {
                    name: student.name || "Học viên không xác định",
                    email: student.email,
                  };
                }
              }
            } catch (err) {
              console.error(`Không thể chuyển studentId thành ObjectId: ${studentId}`, err);
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
          return reply.code(403).send({ error: "Bạn không có quyền chấm điểm" });
        }

        await assignments.gradeSubmission(id, studentId, grade, feedback);
        reply.send({ success: true, message: "Chấm điểm thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi chấm điểm: " + error.message });
      }
    },
  };
}

module.exports = assignmentController;
