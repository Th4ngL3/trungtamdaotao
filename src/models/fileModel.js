const { ObjectId } = require("mongodb");

// Helper function to safely convert string to ObjectId
function safeObjectId(id) {
  try {
    return typeof id === "string" ? new ObjectId(id) : id;
  } catch (error) {
    console.error("Error converting to ObjectId:", error);
    return id;
  }
}

async function fileModel(db) {
  const files = db.collection("files");

  return {
    // Upload file mới
    uploadFile: (fileData) =>
      files.insertOne({
        ...fileData,
        uploadedAt: new Date(),
      }),

    // Lấy tất cả files
    getAllFiles: () => files.find().sort({ uploadedAt: -1 }).toArray(),

    // Lấy file theo ID
    findById: (id) => files.findOne({ _id: safeObjectId(id) }),

    // Lấy files theo khóa học
    findByCourseId: (courseId) =>
      files
        .find({
          courseId: safeObjectId(courseId),
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Lấy files theo người upload
    findByUploaderId: (uploaderId) =>
      files
        .find({
          uploadedBy: uploaderId, // Keep as string for now
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Lấy files theo loại
    findByType: (fileType) =>
      files
        .find({
          fileType: fileType,
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Lấy files danh sách student (cho admin/teacher)
    getStudentListFiles: () =>
      files
        .find({
          fileType: "student_list",
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Lấy files tài liệu khóa học
    getCourseMaterials: (courseId) => {
      console.log("Fetching course materials for course:", courseId);
      return files
        .find({
          courseId: safeObjectId(courseId),
          fileCategory: "course-material",
        })
        .sort({ uploadedAt: -1 })
        .toArray()
        .then((results) => {
          console.log(`Found ${results.length} materials`);
          return results;
        })
        .catch((err) => {
          console.error("Error fetching course materials:", err);
          throw err;
        });
    },

    // Lấy files bài nộp
    getSubmissionFiles: (assignmentId) =>
      files
        .find({
          assignmentId: safeObjectId(assignmentId),
          fileType: "assignment_submission",
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Lấy files bài nộp của student cụ thể
    getStudentSubmissionFiles: (assignmentId, studentId) =>
      files
        .find({
          assignmentId: safeObjectId(assignmentId),
          uploadedBy: studentId, // Keep as string
          fileType: "assignment_submission",
        })
        .sort({ uploadedAt: -1 })
        .toArray(),

    // Cập nhật thông tin file
    updateFile: (id, updateData) =>
      files.updateOne({ _id: safeObjectId(id) }, { $set: updateData }),

    // Xóa file
    deleteFile: (id) => files.deleteOne({ _id: safeObjectId(id) }),

    // Tăng số lượt download
    incrementDownloadCount: (id) =>
      files.updateOne(
        { _id: safeObjectId(id) },
        {
          $inc: { downloadCount: 1 },
          $set: { lastDownloaded: new Date() },
        }
      ),

    // Lấy thống kê files
    getFileStats: () =>
      files
        .aggregate([
          {
            $group: {
              _id: "$fileType",
              count: { $sum: 1 },
              totalSize: { $sum: "$fileSize" },
            },
          },
        ])
        .toArray(),

    // Tìm kiếm files
    searchFiles: (searchTerm, courseId = null) => {
      const query = {
        $or: [
          { fileName: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
        ],
      };

      if (courseId) {
        query.courseId = safeObjectId(courseId);
      }

      return files.find(query).sort({ uploadedAt: -1 }).toArray();
    },
  };
}

module.exports = fileModel;
