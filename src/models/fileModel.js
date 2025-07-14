const { ObjectId } = require("mongodb");

// Chuyển chuỗi thành ObjectId
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

    // Lấy files theo khóa học
    findByCourseId: (courseId) =>
      files
        .find({
          courseId: safeObjectId(courseId),
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



    // Tăng số lượt download
    incrementDownloadCount: (id) =>
      files.updateOne(
        { _id: safeObjectId(id) },
        {
          $inc: { downloadCount: 1 },
          $set: { lastDownloaded: new Date() },
        }
      ),
  };
}

module.exports = fileModel;
