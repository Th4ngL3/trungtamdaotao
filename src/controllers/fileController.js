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
        // Xác minh người dùng là admin
        if (!request.user || request.user.role !== "admin") {
          return reply.code(403).send({
            error: "Chỉ admin mới được phép upload danh sách học viên",
          });
        }

        if (!request.body || !request.body.file) {
          return reply.code(400).send({ error: "Không có file được upload" });
        }

        const fileField = await request.file();
        const uploaderId = request.user._id;

        // Lấy dữ liệu tệp
        const data = await fileField.toBuffer();
        const filename = fileField.filename;
        const mimetype = fileField.mimetype;

        // Đặt mô tả mặc định
        let description = "Danh sách học viên đã thanh toán";

        // Lấy trường mô tả nếu nó tồn tại
        if (fileField.fields?.description?.value) {
          description = fileField.fields.description.value;
        }

        // Tạo thư mục tải lên 
        const uploadDir = path.join(__dirname, "../../uploads/student-lists");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const fileExtension = path.extname(filename);
        const newFileName = `student_list_${Date.now()}${fileExtension}`;
        const filePath = path.join(uploadDir, newFileName);

        // Lưu file vào đĩa
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
        reply.code(500).send({ error: "Lỗi upload danh sách học viên: " + error.message });
      }
    },

    // Upload tài liệu khóa học (Teacher)
    uploadCourseMaterial: async (request, reply) => {
      try {
        // Verify user is a teacher
        if (!request.user || request.user.role !== "teacher") {
          return reply.code(403).send({
            error: "Chỉ giảng viên mới được phép upload tài liệu khóa học",
          });
        }

        // Get the course ID from the form
        const { courseId } = request.query;
        if (!courseId) {
          return reply.code(400).send({ error: "Thiếu mã khóa học" });
        }

        // Log all query params
        // Check if the course exists
        const course = await courses.findById(courseId);
        if (!course) {
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        // For debugging, print teacher ID
        if (course.teacherId) {
        } else {
        }
        // Process the uploaded file - add more error handling
        let data;
        try {
          data = await request.file();
        } catch (fileError) {
          return reply.code(400).send({ error: `Lỗi xử lý file: ${fileError.message}` });
        }

        if (!data || !data.filename) {
          return reply.code(400).send({
            error: "Không có file được upload hoặc file không hợp lệ",
          });
        }

        // Get file info
        let buffer;
        try {
          buffer = await data.toBuffer();
        } catch (bufferError) {
          return reply.code(400).send({ error: `Lỗi đọc file: ${bufferError.message}` });
        }

        const fileExtension = path.extname(data.filename);
        const fileName = `material_${Date.now()}${fileExtension}`;
        const uploadDir = path.join(__dirname, "../../uploads/materials");
        // Make sure the directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uploadPath = path.join(uploadDir, fileName);
        const relativePath = `/uploads/materials/${fileName}`;
        // Save the file
        try {
          fs.writeFileSync(uploadPath, buffer);
        } catch (writeError) {
          return reply.code(500).send({ error: `Lỗi lưu file: ${writeError.message}` });
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
        const result = await files.uploadFile(fileData);
        reply.send({
          success: true,
          fileId: result.insertedId,
          fileName,
          originalName: data.filename,
        });
      } catch (error) {
        reply.code(500).send({ error: `Lỗi upload tài liệu khóa học: ${error.message}` });
      }
    },


    // Download file
    downloadFile: async (request, reply) => {
      try {
        const { id } = request.params;

        // Log thông tin request
        // Xác thực token từ query parameter nếu có
        let userId = null;

        if (request.query && request.query.token) {
          try {
            // Xác thực token từ query parameter
            const tokenFromQuery = request.query.token;
            const decoded = await fastify.jwt.verify(tokenFromQuery);
            userId = decoded._id;
            // Gán thông tin user vào request để các middleware khác có thể sử dụng
            request.user = decoded;
          } catch (tokenError) {
          }
        }

        // Nếu không có token từ query hoặc token không hợp lệ, kiểm tra token từ header
        if (!userId && request.user && request.user._id) {
          userId = request.user._id;
        }

        // Nếu không có user ID hợp lệ, trả về lỗi
        if (!userId) {
          return reply.code(401).send({ error: "Token không hợp lệ hoặc đã hết hạn" });
        }

        // Tìm file trong database
        const file = await files.findById(id);
        if (!file) {
          return reply.code(404).send({ error: "Không tìm thấy file" });
        }

        // Kiểm tra quyền download
        if (
          file.fileType === "student_list" &&
          request.user.role === "student"
        ) {
          return reply.code(403).send({ error: "Bạn không có quyền tải file này" });
        }

        const filePath = path.join(__dirname, "../..", file.filePath);
        if (!fs.existsSync(filePath)) {
          return reply.code(404).send({ error: "File không tồn tại trên server" });
        }

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
            // Không thể gọi reply.code ở đây vì response có thể đã được gửi
          });

          return reply.send(fileStream);
        } catch (streamError) {
          return reply.code(500).send({ error: "Lỗi khi đọc file" });
        }
      } catch (error) {
        reply.code(500).send({ error: "Lỗi download file: " + error.message });
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
          return reply.code(403).send({ error: "Bạn không có quyền xóa file này" });
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


    // Get course materials
    getCourseMaterials: async (request, reply) => {
      try {
        const { courseId } = request.params;
        // For debugging - fetch the course directly to examine
        const course = await courses.findById(courseId);
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
            return reply.code(403).send({ error: "Bạn không ghi danh vào khóa học này" });
          }

          const materials = await files.getCourseMaterials(courseId);
          return reply.send(materials);
        }

        // This shouldn't be reached but just in case
        reply.code(403).send({ error: "Không có quyền truy cập" });
      } catch (error) {
        reply.code(500).send({ error: `Lỗi lấy tài liệu khóa học: ${error.message}` });
      }
    },
  };
}

module.exports = fileController;
