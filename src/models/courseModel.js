const { ObjectId } = require("mongodb");

async function courseModel(db) {
  const courses = db.collection("courses");

  return {
    // Tạo khóa học mới
    createCourse: (course) =>
      courses.insertOne({
        ...course,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

    // Lấy tất cả khóa học
    getAllCourses: () => courses.find().toArray(),

    // Lấy khóa học theo ID
    findById: (id) => courses.findOne({ _id: new ObjectId(id) }),

    // Lấy khóa học theo teacher ID
    findByTeacherId: (teacherId) =>
      courses.find({ teacherId: new ObjectId(teacherId) }).toArray(),

    // Lấy khóa học mà student đã đăng ký
    findByStudentId: async (studentId) => {
      try {
        // Chuyển đổi studentId thành ObjectId nếu nó là string
        const studentObjectId =
          typeof studentId === "string" ? new ObjectId(studentId) : studentId;

        console.log(`Tìm khóa học cho học viên với ID: ${studentObjectId}`);

        // Truy vấn để tìm kiếm cả hai cấu trúc dữ liệu:
        // 1. Cấu trúc đơn giản: students là mảng các ObjectId
        // 2. Cấu trúc phức tạp: students là mảng các object có studentId
        const query = {
          $or: [
            // Kiểm tra trong mảng students nếu là mảng ObjectId
            { students: studentObjectId },
            // Kiểm tra trong mảng students nếu là mảng object
            { "students.studentId": studentObjectId },
          ],
        };

        console.log("Query tìm kiếm khóa học:", JSON.stringify(query));

        // Tìm tất cả các khóa học phù hợp
        const result = await courses.find(query).toArray();
        console.log(
          `Tìm thấy ${result.length} khóa học cho học viên ${studentObjectId}`
        );

        // Nếu không tìm thấy kết quả, thử tìm kiếm bằng phương pháp khác
        if (result.length === 0) {
          console.log("Không tìm thấy kết quả, thử tìm với cấu trúc khác...");

          // Tải tất cả các khóa học để kiểm tra thủ công
          const allCourses = await courses.find().toArray();
          console.log(
            `Đang kiểm tra ${allCourses.length} khóa học thủ công...`
          );

          const manualResults = allCourses.filter((course) => {
            // Kiểm tra nếu students là mảng các ObjectId
            if (Array.isArray(course.students)) {
              return course.students.some((student) => {
                if (student === null || student === undefined) return false;

                // Kiểm tra nếu student là ObjectId trực tiếp
                if (typeof student.toString === "function") {
                  return student.toString() === studentObjectId.toString();
                }

                // Kiểm tra nếu student là object có studentId
                if (student && student.studentId) {
                  return (
                    student.studentId.toString() === studentObjectId.toString()
                  );
                }

                return false;
              });
            }
            return false;
          });

          console.log(
            `Tìm thấy ${manualResults.length} khóa học bằng phương pháp thủ công`
          );
          return manualResults;
        }

        return result;
      } catch (error) {
        console.error("Lỗi trong findByStudentId:", error);
        return [];
      }
    },

    // Thêm student vào khóa học
    addStudentToCourse: (courseId, studentData) =>
      courses.updateOne(
        { _id: new ObjectId(courseId) },
        {
          $push: { students: studentData },
          $set: { updatedAt: new Date() },
        }
      ),

    // Xóa student khỏi khóa học
    removeStudentFromCourse: (courseId, studentId) =>
      courses.updateOne(
        { _id: new ObjectId(courseId) },
        {
          $pull: { students: { studentId: new ObjectId(studentId) } },
          $set: { updatedAt: new Date() },
        }
      ),

    // Cập nhật thông tin khóa học
    updateCourse: (id, updateData) =>
      courses.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      ),

    // Xóa khóa học
    deleteCourse: (id) => courses.deleteOne({ _id: new ObjectId(id) }),

    // Lấy danh sách student trong khóa học
    getStudentsInCourse: (courseId) =>
      courses.findOne(
        { _id: new ObjectId(courseId) },
        { projection: { students: 1, courseName: 1 } }
      ),

    // Đăng ký học viên vào khóa học với thông tin thanh toán
    enrollStudent: (courseId, studentInfo) =>
      courses.updateOne(
        { _id: new ObjectId(courseId) },
        {
          $push: { students: studentInfo },
          $set: { updatedAt: new Date() },
        }
      ),

    // Hủy đăng ký học viên khỏi khóa học
    unenrollStudent: (courseId, studentId) =>
      courses.updateOne(
        { _id: new ObjectId(courseId) },
        {
          $pull: { students: { studentId: new ObjectId(studentId) } },
          $set: { updatedAt: new Date() },
        }
      ),
  };
}

module.exports = courseModel;
