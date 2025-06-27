const { ObjectId } = require("mongodb");
const path = require("path");
const fs = require("fs");

async function fileController(fastify) {
  const files = await require("../models/fileModel")(fastify.mongo.db);
  const courses = await require("../models/courseModel")(fastify.mongo.db);

  return {
    // Upload file chung
    uploadFile: async (request, reply) => {
      try {
        const data = await request.file();
        const uploaderId = request.user._id;

        if (!data) {
          return reply.code(400).send({ error: "Không có file được upload" });
        }

        // Tạo thư mục uploads nếu chưa có
        const uploadDir = path.join(__dirname, "../../uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Tạo tên file unique
        const fileExtension = path.extname(data.filename);
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        // Lưu file
        const buffer = await data.toBuffer();
        fs.writeFileSync(filePath, buffer);

        const fileData = {
          fileName: data.filename,
          originalName: data.filename,
          filePath: `/uploads/${fileName}`,
          fileSize: buffer.length,
          mimeType: data.mimetype,
          uploadedBy: new ObjectId(uploaderId),
          fileType: "general",
          downloadCount: 0,
        };

        const result = await files.uploadFile(fileData);
        reply.send({
          success: true,
          message: "Upload file thành công",
          fileId: result.insertedId,
          filePath: fileData.filePath,
        });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi upload file: " + error.message });
      }
    },

    // Upload danh sách student (Admin)
    uploadStudentList: async (request, reply) => {
      try {
        // Verify user is admin
        if (!request.user || request.user.role !== "admin") {
          return reply.code(403).send({
            error: "Chỉ admin mới được phép upload danh sách học viên",
          });
        }

        // With attachFieldsToBody: true, the file is now part of the body
        if (!request.body || !request.body.file) {
          return reply.code(400).send({ error: "Không có file được upload" });
        }

        const fileField = request.body.file;
        const uploaderId = request.user._id;

        // Get file data using .toBuffer() on the file field
        const data = await fileField.toBuffer();
        const filename = fileField.filename;
        const mimetype = fileField.mimetype;

        console.log("File upload details:", {
          filename,
          mimetype,
          size: data.length,
        });

        // Set default description
        let description = "Danh sách học viên đã thanh toán";

        // Try to get description field if it exists
        if (request.body.description && request.body.description.value) {
          description = request.body.description.value;
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(__dirname, "../../uploads/student-lists");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileExtension = path.extname(filename);
        const newFileName = `student_list_${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadDir, newFileName);

        // Save file to disk
        fs.writeFileSync(filePath, data);

        const fileData = {
          fileName: newFileName,
          originalName: filename,
          filePath: `/uploads/student-lists/${newFileName}`,
          fileSize: data.length,
          mimeType: mimetype,
          uploadedBy: uploaderId,
          fileType: "student_list",
          downloadCount: 0,
          description: description,
        };

        const result = await files.uploadFile(fileData);
        reply.send({
          success: true,
          message: "Upload danh sách học viên thành công",
          fileId: result.insertedId,
        });
      } catch (error) {
        console.error("Upload student list error:", error);
        reply
          .code(500)
          .send({ error: "Lỗi upload danh sách học viên: " + error.message });
      }
    },

    // Upload tài liệu khóa học (Teacher)
    uploadCourseMaterial: async (request, reply) => {
      try {
        console.log("Course material upload endpoint called");

        // Verify user is a teacher
        if (!request.user || request.user.role !== "teacher") {
          return reply.code(403).send({
            error: "Chỉ giảng viên mới được phép upload tài liệu khóa học",
          });
        }

        // Get the course ID from the form
        const { courseId } = request.query;
        console.log("Upload course material - courseId:", courseId);
        console.log("User role:", request.user.role);
        console.log("User id:", request.user._id);

        if (!courseId) {
          console.log("Missing courseId");
          return reply.code(400).send({ error: "Thiếu mã khóa học" });
        }

        // Log all query params
        console.log("Query parameters:", request.query);

        // Check if the course exists
        const course = await courses.findById(courseId);
        console.log("Found course:", course ? course._id : "Not found");

        if (!course) {
          console.log("Course not found with ID:", courseId);
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        // For debugging, print teacher ID
        if (course.teacherId) {
          console.log("Course teacherId:", course.teacherId.toString());
        } else {
          console.log("Course has no teacher ID");
        }

        console.log("Current user id:", request.user._id.toString());

        console.log("Attempting to read uploaded file...");

        // Process the uploaded file - add more error handling
        let data;
        try {
          data = await request.file();
          console.log("File received:", data ? data.filename : "No file data");
        } catch (fileError) {
          console.error("Error processing file:", fileError);
          return reply
            .code(400)
            .send({ error: `Lỗi xử lý file: ${fileError.message}` });
        }

        if (!data || !data.filename) {
          console.log("No file data found in request");
          return reply.code(400).send({
            error: "Không có file được upload hoặc file không hợp lệ",
          });
        }

        // Get file info
        let buffer;
        try {
          buffer = await data.toBuffer();
          console.log("File buffer size:", buffer.length);
        } catch (bufferError) {
          console.error("Error reading file buffer:", bufferError);
          return reply
            .code(400)
            .send({ error: `Lỗi đọc file: ${bufferError.message}` });
        }

        const fileExtension = path.extname(data.filename);
        const fileName = `material_${Date.now()}${fileExtension}`;
        const uploadDir = path.join(__dirname, "../../uploads/materials");
        console.log("Upload directory:", uploadDir);

        // Make sure the directory exists
        if (!fs.existsSync(uploadDir)) {
          console.log("Creating upload directory");
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uploadPath = path.join(uploadDir, fileName);
        const relativePath = `/uploads/materials/${fileName}`;
        console.log("File will be saved to:", uploadPath);

        // Save the file
        try {
          fs.writeFileSync(uploadPath, buffer);
          console.log("File saved successfully");
        } catch (writeError) {
          console.error("Error writing file to disk:", writeError);
          return reply
            .code(500)
            .send({ error: `Lỗi lưu file: ${writeError.message}` });
        }

        // Save in database
        const fileData = {
          originalName: data.filename,
          fileName: fileName,
          filePath: relativePath,
          fileSize: buffer.length,
          mimeType: data.mimetype,
          uploadedBy: request.user._id,
          description: request.query.description || "Tài liệu khóa học",
          fileCategory: "course-material",
          courseId: new ObjectId(courseId),
          uploadedAt: new Date(),
        };

        console.log("Saving file data:", JSON.stringify(fileData, null, 2));
        const result = await files.uploadFile(fileData);
        console.log("File saved with ID:", result.insertedId);

        reply.send({
          success: true,
          fileId: result.insertedId,
          fileName,
          originalName: data.filename,
        });
      } catch (error) {
        console.error("Error uploading course material:", error);
        reply
          .code(500)
          .send({ error: `Lỗi upload tài liệu khóa học: ${error.message}` });
      }
    },

    // Upload bài nộp (Student)
    uploadAssignmentSubmission: async (request, reply) => {
      try {
        const data = await request.file();
        const uploaderId = request.user._id;
        const { assignmentId, description } = request.body;

        if (!data) {
          return reply.code(400).send({ error: "Không có file được upload" });
        }

        const uploadDir = path.join(__dirname, "../../uploads/submissions");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileExtension = path.extname(data.filename);
        const fileName = `submission_${assignmentId}_${uploaderId}_${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        const buffer = await data.toBuffer();
        fs.writeFileSync(filePath, buffer);

        const fileData = {
          fileName: data.filename,
          originalName: data.filename,
          filePath: `/uploads/submissions/${fileName}`,
          fileSize: buffer.length,
          mimeType: data.mimetype,
          uploadedBy: new ObjectId(uploaderId),
          assignmentId: new ObjectId(assignmentId),
          fileType: "assignment_submission",
          description: description || "",
          downloadCount: 0,
        };

        const result = await files.uploadFile(fileData);
        reply.send({
          success: true,
          message: "Upload bài nộp thành công",
          fileId: result.insertedId,
          filePath: fileData.filePath,
        });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi upload bài nộp: " + error.message });
      }
    },

    // Download file
    downloadFile: async (request, reply) => {
      try {
        const { id } = request.params;

        // Log thông tin request
        console.log(`Download request for file ${id}`);
        console.log(`Query params:`, request.query);

        // Xác thực token từ query parameter nếu có
        let userId = null;

        if (request.query && request.query.token) {
          try {
            // Xác thực token từ query parameter
            const tokenFromQuery = request.query.token;
            console.log(`Using token from query parameter`);

            const decoded = await fastify.jwt.verify(tokenFromQuery);
            userId = decoded._id;
            console.log(`Token verified, user ID: ${userId}`);

            // Gán thông tin user vào request để các middleware khác có thể sử dụng
            request.user = decoded;
          } catch (tokenError) {
            console.error("Token verification error:", tokenError);
          }
        }

        // Nếu không có token từ query hoặc token không hợp lệ, kiểm tra token từ header
        if (!userId && request.user && request.user._id) {
          userId = request.user._id;
          console.log(`Using token from request header, user ID: ${userId}`);
        }

        // Nếu không có user ID hợp lệ, trả về lỗi
        if (!userId) {
          console.log(`No valid token found for file download request: ${id}`);
          return reply
            .code(401)
            .send({ error: "Token không hợp lệ hoặc đã hết hạn" });
        }

        // Tìm file trong database
        const file = await files.findById(id);
        if (!file) {
          console.log(`File not found: ${id}`);
          return reply.code(404).send({ error: "Không tìm thấy file" });
        }

        // Kiểm tra quyền download
        if (
          file.fileType === "student_list" &&
          request.user.role === "student"
        ) {
          console.log(
            `Student ${userId} attempted to access student list file`
          );
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền tải file này" });
        }

        const filePath = path.join(__dirname, "../..", file.filePath);
        console.log(`Looking for file at path: ${filePath}`);

        if (!fs.existsSync(filePath)) {
          console.log(`Physical file not found at path: ${filePath}`);
          return reply
            .code(404)
            .send({ error: "File không tồn tại trên server" });
        }

        console.log(
          `Downloading file: ${file.originalName}, path: ${filePath}`
        );

        try {
          // Tăng số lượt download
          await files.incrementDownloadCount(id);

          // Gửi file, đặt các header phù hợp để tránh cache
          reply.header(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
          );
          reply.header("Pragma", "no-cache");
          reply.header("Expires", "0");
          reply.type(file.mimeType);
          reply.header(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(file.originalName)}"`
          );

          const fileStream = fs.createReadStream(filePath);
          fileStream.on("error", (err) => {
            console.error(`Error reading file stream: ${err.message}`);
            // Không thể gọi reply.code ở đây vì response có thể đã được gửi
          });

          return reply.send(fileStream);
        } catch (streamError) {
          console.error("Error streaming file:", streamError);
          return reply.code(500).send({ error: "Lỗi khi đọc file" });
        }
      } catch (error) {
        console.error("Error downloading file:", error);
        reply.code(500).send({ error: "Lỗi download file: " + error.message });
      }
    },

    // Lấy thông tin file
    getFileInfo: async (request, reply) => {
      try {
        const { id } = request.params;
        const file = await files.findById(id);

        if (!file) {
          return reply.code(404).send({ error: "Không tìm thấy file" });
        }

        reply.send(file);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy thông tin file: " + error.message });
      }
    },

    // Lấy files theo khóa học
    getCourseFiles: async (request, reply) => {
      try {
        const { courseId } = request.params;
        const courseFiles = await files.getCourseMaterials(courseId);
        reply.send(courseFiles);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy files khóa học: " + error.message });
      }
    },

    // Lấy files theo bài tập
    getAssignmentFiles: async (request, reply) => {
      try {
        const { assignmentId } = request.params;
        const assignmentFiles = await files.getSubmissionFiles(assignmentId);
        reply.send(assignmentFiles);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy files bài tập: " + error.message });
      }
    },

    // Lấy danh sách files student (Teacher)
    getStudentListFiles: async (request, reply) => {
      try {
        const studentListFiles = await files.getStudentListFiles();
        reply.send(studentListFiles);
      } catch (error) {
        reply.code(500).send({
          error: "Lỗi lấy danh sách files học viên: " + error.message,
        });
      }
    },

    // Lấy files của user
    getMyFiles: async (request, reply) => {
      try {
        const userId = request.user._id;
        const myFiles = await files.findByUploaderId(userId);
        reply.send(myFiles);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy files của bạn: " + error.message });
      }
    },

    // Cập nhật thông tin file
    updateFile: async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user._id;
        const updateData = request.body;

        const file = await files.findById(id);
        if (!file) {
          return reply.code(404).send({ error: "Không tìm thấy file" });
        }

        // Kiểm tra quyền
        if (
          file.uploadedBy.toString() !== userId &&
          request.user.role !== "admin"
        ) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền chỉnh sửa file này" });
        }

        await files.updateFile(id, updateData);
        reply.send({ success: true, message: "Cập nhật file thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi cập nhật file: " + error.message });
      }
    },

    // Xóa file
    deleteFile: async (request, reply) => {
      try {
        const { id } = request.params;
        const userId = request.user._id;

        const file = await files.findById(id);
        if (!file) {
          return reply.code(404).send({ error: "Không tìm thấy file" });
        }

        // Kiểm tra quyền
        if (
          file.uploadedBy.toString() !== userId &&
          request.user.role !== "admin"
        ) {
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền xóa file này" });
        }

        // Xóa file khỏi disk
        const filePath = path.join(__dirname, "../..", file.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await files.deleteFile(id);
        reply.send({ success: true, message: "Xóa file thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi xóa file: " + error.message });
      }
    },

    // Tìm kiếm files
    searchFiles: async (request, reply) => {
      try {
        const { q, courseId } = request.query;
        if (!q) {
          return reply.code(400).send({ error: "Thiếu từ khóa tìm kiếm" });
        }

        const searchResults = await files.searchFiles(q, courseId);
        reply.send(searchResults);
      } catch (error) {
        reply.code(500).send({ error: "Lỗi tìm kiếm files: " + error.message });
      }
    },

    // Lấy tất cả files (Admin)
    getAllFiles: async (request, reply) => {
      try {
        const allFiles = await files.getAllFiles();
        reply.send(allFiles);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy danh sách files: " + error.message });
      }
    },

    // Lấy thống kê files (Admin)
    getFileStats: async (request, reply) => {
      try {
        const stats = await files.getFileStats();
        reply.send(stats);
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi lấy thống kê files: " + error.message });
      }
    },

    // Get course materials
    getCourseMaterials: async (request, reply) => {
      try {
        const { courseId } = request.params;
        console.log("Request to get course materials for courseId:", courseId);
        console.log("User role:", request.user.role);
        console.log("User id:", request.user._id);

        // For debugging - fetch the course directly to examine
        const course = await courses.findById(courseId);
        console.log("Course details:", JSON.stringify(course, null, 2));

        // Temporarily allow all teachers to see course materials
        if (request.user.role === "teacher") {
          // Get all materials for the course
          const materials = await fastify.mongo.db
            .collection("files")
            .find({
              courseId: new ObjectId(courseId),
              fileCategory: "course-material",
            })
            .sort({ uploadedAt: -1 })
            .toArray();

          console.log(
            `Found ${materials.length} materials for course ${courseId}`
          );
          return reply.send(materials);
        }

        // Original permission checks (for other roles)
        const userId = request.user._id;
        const userRole = request.user.role;

        // Admin can access all
        if (userRole === "admin") {
          const materials = await files.getCourseMaterials(courseId);
          return reply.send(materials);
        }

        // Students need to be enrolled
        if (userRole === "student") {
          const enrollment = await fastify.mongo.db
            .collection("enrollments")
            .findOne({
              studentId: new ObjectId(userId),
              courseId: new ObjectId(courseId),
              status: "approved",
            });

          if (!enrollment) {
            return reply
              .code(403)
              .send({ error: "Bạn không ghi danh vào khóa học này" });
          }

          const materials = await files.getCourseMaterials(courseId);
          return reply.send(materials);
        }

        // This shouldn't be reached but just in case
        reply.code(403).send({ error: "Không có quyền truy cập" });
      } catch (error) {
        console.error("Error getting course materials:", error);
        reply
          .code(500)
          .send({ error: `Lỗi lấy tài liệu khóa học: ${error.message}` });
      }
    },
  };
}

module.exports = fileController;
