const { ObjectId } = require("mongodb");

async function notificationController(fastify) {
  const db = fastify.mongo.db;
  const notifications = await require("../models/notificationModel")(db);
  const courses = await require("../models/courseModel")(db);

  return {
    // Xác minh xem user có quyền truy cập vào thông báo này hay không 
    async verifyNotificationAccess(request, reply) {
      try {
        await fastify.authenticate(request, reply);

        const { id } = request.params;
        const notification = await notifications.getNotificationById(id);

        if (!notification) {
          return reply.code(404).send({ error: "Thông báo không tồn tại" });
        }

        const userId = request.user._id;
        const userRole = request.user.role;

        // Admin can access all notifications
        if (userRole === "admin") return;

        // Teachers can access notifications they created or for courses they teach
        if (userRole === "teacher") {
          if (notification.createdBy === userId) return;

          if (notification.courseId) {
            const course = await courses.findById(notification.courseId);
            if (course && course.teacherId.toString() === userId.toString())
              return;
          }
        }

        // Students can only access notifications for courses they're enrolled in or global notifications
        if (userRole === "student" && notification.courseId) {
          const enrollment = await db.collection("enrollments").findOne({
            studentId: new ObjectId(userId),
            courseId: new ObjectId(notification.courseId),
            status: "approved",
          });

          if (enrollment || notification.isGlobal) return;
        }

        return reply
          .code(403)
          .send({ error: "Bạn không có quyền truy cập thông báo này" });
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    },

    // Create a new notification/announcement
    async createNotification(request, reply) {
      try {
        const {
          title,
          content,
          courseId,
          priority,
          isGlobal,
          recipients,
          type,
        } = request.body;
        const userId = request.user._id;

        // Validate required fields
        if (!title || !content) {
          return reply
            .code(400)
            .send({ error: "Tiêu đề và nội dung là bắt buộc" });
        }

        // Teachers can only create notifications for their courses
        if (request.user.role === "teacher" && courseId) {
          console.log("Validating teacher access for course:", courseId);
          const course = await courses.findById(courseId);
          if (!course) {
            return reply.code(404).send({ error: "Không tìm thấy khóa học" });
          }

          // Safe comparison to avoid toString() on undefined
          const teacherId = course.teacherId;
          if (!teacherId) {
            return reply
              .code(400)
              .send({ error: "Khóa học không có giảng viên" });
          }

          const courseTeacherId = teacherId.toString();
          const currentUserId = userId.toString();

          if (courseTeacherId !== currentUserId) {
            console.log(
              `Permission denied: ${courseTeacherId} !== ${currentUserId}`
            );
            return reply.code(403).send({
              error: "Bạn không có quyền tạo thông báo cho khóa học này",
            });
          }
        }

        const notificationData = {
          title,
          content,
          priority: priority || "normal",
          createdBy: userId,
          isGlobal: isGlobal || false,
          createdAt: new Date(),
          type: type || "general",
        };

        if (courseId) {
          console.log("Adding courseId to notification:", courseId);
          notificationData.courseId = new ObjectId(courseId);
        }

        // If specific recipients are provided
        if (recipients && Array.isArray(recipients) && recipients.length > 0) {
          notificationData.recipients = recipients.map((id) => {
            try {
              return new ObjectId(id);
            } catch (e) {
              return id;
            }
          });
        }

        console.log(
          "Creating notification with data:",
          JSON.stringify(notificationData)
        );
        const result = await notifications.createNotification(notificationData);
        const newNotification = {
          _id: result.insertedId,
          ...notificationData,
        };

        // Broadcast notification to relevant users
        if (recipients && Array.isArray(recipients)) {
          // Broadcast to specific recipients
          fastify.broadcastNotification(newNotification, recipients);
        } else if (courseId) {
          // Get students and teachers for this course
          const course = await courses.findById(courseId);
          let targetUserIds = [];

          // Add teacher
          if (course && course.teacherId) {
            targetUserIds.push(course.teacherId.toString());
          }

          // Add students
          if (course && course.students && Array.isArray(course.students)) {
            course.students.forEach((student) => {
              // Handle both object format and ID format
              if (student) {
                if (typeof student === "object" && student.studentId) {
                  targetUserIds.push(student.studentId.toString());
                } else if (typeof student.toString === "function") {
                  targetUserIds.push(student.toString());
                }
              }
            });
          }

          // Broadcast to course users
          if (targetUserIds.length > 0) {
            console.log(
              `Broadcasting notification to ${targetUserIds.length} course users`
            );
            fastify.broadcastNotification(newNotification, targetUserIds);
          }
        } else if (notificationData.isGlobal) {
          // Broadcast to all users
          console.log("Broadcasting global notification");
          fastify.broadcastNotification(newNotification);
        }

        reply.code(201).send({
          success: true,
          message: "Tạo thông báo thành công",
          notificationId: result.insertedId,
        });
      } catch (error) {
        console.error("Error in createNotification:", error);
        reply.code(500).send({ error: error.message });
      }
    },

    // Create enrollment approval notification
    async createEnrollmentNotification(request, reply) {
      try {
        const { courseId, studentId } = request.body;

        if (!courseId || !studentId) {
          return reply
            .code(400)
            .send({ error: "Thiếu thông tin khóa học hoặc học viên" });
        }

        // Get course details
        const course = await courses.findById(courseId);
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        const notificationData = {
          title: `Đăng ký vào khóa học ${
            course.courseName || course.title || "Khóa học"
          } đã được chấp nhận`,
          content: `Chúc mừng! Bạn đã được chấp nhận vào khóa học "${
            course.courseName || course.title
          }". 
          Vui lòng kiểm tra mục "Khóa học của tôi" để xem chi tiết và nội dung bài học.`,
          priority: "high",
          createdBy: request.user._id,
          courseId: new ObjectId(courseId),
          recipients: [new ObjectId(studentId)],
          createdAt: new Date(),
          type: "enrollment_approved",
        };

        const result = await notifications.createNotification(notificationData);

        // Broadcast to student
        fastify.broadcastNotification(
          {
            _id: result.insertedId,
            ...notificationData,
          },
          [studentId]
        );

        reply.code(201).send({
          success: true,
          message: "Đã tạo thông báo duyệt đăng ký khóa học",
          notificationId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating enrollment notification:", error);
        reply.code(500).send({ error: error.message });
      }
    },

    // Get all notifications (admin)
    async getAllNotifications(request, reply) {
      try {
        const allNotifications = await notifications.getAllNotifications();
        reply.send(allNotifications);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },

    // Get notifications for a specific course
    async getCourseNotifications(request, reply) {
      try {
        const { courseId } = request.params;

        // Verify course access if not admin
        if (request.user.role !== "admin") {
          // For teacher: verify they teach this course
          if (request.user.role === "teacher") {
            const course = await courses.findById(courseId);
            if (
              !course ||
              course.teacherId.toString() !== request.user._id.toString()
            ) {
              return reply.code(403).send({
                error: "Bạn không có quyền xem thông báo của khóa học này",
              });
            }
          }

          // For student: verify they're enrolled in this course
          if (request.user.role === "student") {
            const enrollment = await db.collection("enrollments").findOne({
              studentId: new ObjectId(request.user._id),
              courseId: new ObjectId(courseId),
              status: "approved",
            });

            if (!enrollment) {
              return reply
                .code(403)
                .send({ error: "Bạn không ghi danh vào khóa học này" });
            }
          }
        }

        const courseNotifications =
          await notifications.getNotificationsByCourse(courseId);
        reply.send(courseNotifications);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },

    // Get notifications for the current user
    async getMyNotifications(request, reply) {
      try {
        const userId = request.user._id;
        let userCourseIds = [];

        console.log(
          "Getting notifications for user:",
          userId,
          "with role:",
          request.user.role
        );

        // Get courses the user has access to
        if (request.user.role === "student") {
          // For students: check if we need to use enrollments or the courses collection
          try {
            // First try the enrollments collection
            const enrollments = await db
              .collection("enrollments")
              .find({
                studentId: new ObjectId(userId),
                status: "approved",
              })
              .toArray();

            if (enrollments && enrollments.length > 0) {
              userCourseIds = enrollments.map((e) => e.courseId);
              console.log("Found enrollments:", enrollments.length);
            } else {
              // If no enrollments found, try to find courses with this student in the students array
              console.log("No enrollments found, checking courses collection");
              const studentCourses = await courses.findByStudentId(userId);
              userCourseIds = studentCourses.map((c) => c._id);
              console.log("Found courses with student:", studentCourses.length);
            }
          } catch (err) {
            console.error("Error fetching student courses:", err);
            // Provide empty array as fallback
            userCourseIds = [];
          }
        } else if (request.user.role === "teacher") {
          // For teachers: get courses they teach
          try {
            const teacherCourses = await courses.findByTeacherId(userId);
            userCourseIds = teacherCourses.map((c) => c._id);
            console.log("Found teacher courses:", teacherCourses.length);
          } catch (err) {
            console.error("Error fetching teacher courses:", err);
            userCourseIds = [];
          }
        }

        console.log("User course IDs:", userCourseIds.length);

        // Ensure userCourseIds is always an array, even if empty
        const safeUserCourseIds = Array.isArray(userCourseIds)
          ? userCourseIds
          : [];

        const userNotifications = await notifications.getNotificationsForUser(
          userId,
          safeUserCourseIds
        );

        console.log("Found notifications:", userNotifications.length);
        reply.send(userNotifications);
      } catch (error) {
        console.error("Error in getMyNotifications:", error);
        reply.code(500).send({ error: error.message });
      }
    },

    // Get unread notifications
    async getUnreadNotifications(request, reply) {
      try {
        const userId = request.user._id;
        let userCourseIds = [];

        console.log("Getting unread notifications for user:", userId);

        // Get courses the user has access to
        if (request.user.role === "student") {
          try {
            // First try the enrollments collection
            const enrollments = await db
              .collection("enrollments")
              .find({
                studentId: new ObjectId(userId),
                status: "approved",
              })
              .toArray();

            if (enrollments && enrollments.length > 0) {
              userCourseIds = enrollments.map((e) => e.courseId);
            } else {
              // If no enrollments found, try to find courses with this student in the students array
              const studentCourses = await courses.findByStudentId(userId);
              userCourseIds = studentCourses.map((c) => c._id);
            }
          } catch (err) {
            console.error(
              "Error fetching student courses for unread notifications:",
              err
            );
            userCourseIds = [];
          }
        } else if (request.user.role === "teacher") {
          try {
            const teacherCourses = await courses.findByTeacherId(userId);
            userCourseIds = teacherCourses.map((c) => c._id);
          } catch (err) {
            console.error(
              "Error fetching teacher courses for unread notifications:",
              err
            );
            userCourseIds = [];
          }
        }

        // Ensure userCourseIds is always an array, even if empty
        const safeUserCourseIds = Array.isArray(userCourseIds)
          ? userCourseIds
          : [];

        const unreadNotifications = await notifications.getUnreadNotifications(
          userId,
          safeUserCourseIds
        );

        console.log("Found unread notifications:", unreadNotifications.length);
        reply.send(unreadNotifications);
      } catch (error) {
        console.error("Error in getUnreadNotifications:", error);
        reply.code(500).send({ error: error.message });
      }
    },

    // Mark a notification as read
    async markAsRead(request, reply) {
      try {
        const { id } = request.params;
        const userId = request.user._id;

        await notifications.markAsRead(id, userId);

        reply.send({ success: true });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },

    // Mark all notifications as read
    async markAllAsRead(request, reply) {
      try {
        const userId = request.user._id;
        let userCourseIds = [];

        console.log("Marking all notifications as read for user:", userId);

        // Get courses the user has access to
        if (request.user.role === "student") {
          try {
            // First try the enrollments collection
            const enrollments = await db
              .collection("enrollments")
              .find({
                studentId: new ObjectId(userId),
                status: "approved",
              })
              .toArray();

            if (enrollments && enrollments.length > 0) {
              userCourseIds = enrollments.map((e) => e.courseId);
            } else {
              // If no enrollments found, try to find courses with this student in the students array
              const studentCourses = await courses.findByStudentId(userId);
              userCourseIds = studentCourses.map((c) => c._id);
            }
          } catch (err) {
            console.error(
              "Error fetching student courses for marking as read:",
              err
            );
            userCourseIds = [];
          }
        } else if (request.user.role === "teacher") {
          try {
            const teacherCourses = await courses.findByTeacherId(userId);
            userCourseIds = teacherCourses.map((c) => c._id);
          } catch (err) {
            console.error(
              "Error fetching teacher courses for marking as read:",
              err
            );
            userCourseIds = [];
          }
        }

        // Ensure userCourseIds is always an array, even if empty
        const safeUserCourseIds = Array.isArray(userCourseIds)
          ? userCourseIds
          : [];

        await notifications.markAllAsRead(userId, safeUserCourseIds);

        console.log("Marked all notifications as read for user:", userId);
        reply.send({ success: true });
      } catch (error) {
        console.error("Error in markAllAsRead:", error);
        reply.code(500).send({ error: error.message });
      }
    },

    // Delete a notification (admin or creator)
    async deleteNotification(request, reply) {
      try {
        const { id } = request.params;
        const userId = request.user._id;

        // Get the notification
        const notification = await notifications.getNotificationById(id);

        if (!notification) {
          return reply.code(404).send({ error: "Thông báo không tồn tại" });
        }

        // Check permission
        if (
          request.user.role !== "admin" &&
          notification.createdBy.toString() !== userId.toString()
        ) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xóa thông báo này" });
        }

        // Get notification before deleting to know who to notify
        const notificationToDelete = await notifications.getNotificationById(
          id
        );

        // Delete the notification
        await notifications.deleteNotification(id);

        // Notify users about the deletion
        if (notificationToDelete) {
          if (notificationToDelete.courseId) {
            // Get students and teachers for this course
            const course = await courses.findById(
              notificationToDelete.courseId
            );
            let targetUserIds = [];

            // Add teacher
            if (course && course.teacherId) {
              targetUserIds.push(course.teacherId.toString());
            }

            // Add students
            if (course && course.students && course.students.length > 0) {
              course.students.forEach((student) => {
                if (student.studentId) {
                  targetUserIds.push(student.studentId.toString());
                }
              });
            }

            // Notify course users
            if (targetUserIds.length > 0) {
              fastify.notifyNotificationDelete(id, targetUserIds);
            }
          } else if (notificationToDelete.isGlobal) {
            // Notify all users
            fastify.notifyNotificationDelete(id);
          }
        }

        reply.send({ success: true, message: "Xóa thông báo thành công" });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },

    // Update a notification (admin or creator)
    async updateNotification(request, reply) {
      try {
        const { id } = request.params;
        const { title, content, priority } = request.body;
        const userId = request.user._id;

        // Get the notification
        const notification = await notifications.getNotificationById(id);

        if (!notification) {
          return reply.code(404).send({ error: "Thông báo không tồn tại" });
        }

        // Check permission
        if (
          request.user.role !== "admin" &&
          notification.createdBy.toString() !== userId.toString()
        ) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền cập nhật thông báo này" });
        }

        const updateData = {};
        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (priority) updateData.priority = priority;

        await notifications.updateNotification(id, updateData);

        // Get the updated notification
        const updatedNotification = await notifications.getNotificationById(id);

        // Notify users about the update
        if (updatedNotification.courseId) {
          // Get students and teachers for this course
          const course = await courses.findById(updatedNotification.courseId);
          let targetUserIds = [];

          // Add teacher
          if (course && course.teacherId) {
            targetUserIds.push(course.teacherId.toString());
          }

          // Add students
          if (course && course.students && course.students.length > 0) {
            course.students.forEach((student) => {
              if (student.studentId) {
                targetUserIds.push(student.studentId.toString());
              }
            });
          }

          // Notify course users
          if (targetUserIds.length > 0) {
            fastify.notifyNotificationUpdate(id, targetUserIds);
          }
        } else if (updatedNotification.isGlobal) {
          // Notify all users
          fastify.notifyNotificationUpdate(id);
        }

        reply.send({ success: true, message: "Cập nhật thông báo thành công" });
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },

    // Get notification by ID
    async getNotificationById(request, reply) {
      try {
        const { id } = request.params;

        const notification = await notifications.getNotificationById(id);

        if (!notification) {
          return reply.code(404).send({ error: "Thông báo không tồn tại" });
        }

        reply.send(notification);
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  };
}

module.exports = notificationController;
