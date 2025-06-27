const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function createTestAssignmentsForAllCourses() {
  let client;
  try {
    client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // Lấy danh sách tất cả khóa học
    const courses = await db.collection("courses").find().toArray();
    console.log(`Tìm thấy ${courses.length} khóa học`);

    // Lấy danh sách học viên
    const students = await db
      .collection("users")
      .find({ role: "student" })
      .toArray();
    console.log(`Tìm thấy ${students.length} học viên`);

    // Tạo bài tập cho mỗi khóa học
    for (const course of courses) {
      console.log(
        `\nĐang tạo bài tập cho khóa học: ${
          course.courseName || course.title || "Không tên"
        } (${course._id})`
      );

      // Kiểm tra xem khóa học đã có bài tập chưa
      const existingAssignments = await db
        .collection("assignments")
        .find({
          courseId: course._id,
        })
        .toArray();

      if (existingAssignments.length > 0) {
        console.log(
          `Khóa học đã có ${existingAssignments.length} bài tập, bỏ qua...`
        );
        continue;
      }

      // Tạo các bài tập mẫu cho khóa học
      const assignments = [
        {
          title: "Bài tập 1: Giới thiệu",
          description: "Bài tập đầu tiên để làm quen với khóa học",
          courseId: course._id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày sau
          maxScore: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          submissions: [],
        },
        {
          title: "Bài tập 2: Kiến thức cơ bản",
          description: "Bài tập về các kiến thức cơ bản của khóa học",
          courseId: course._id,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 ngày sau
          maxScore: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          submissions: [],
        },
        {
          title: "Bài tập 3: Thực hành",
          description: "Bài tập thực hành các kỹ năng đã học",
          courseId: course._id,
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 ngày sau
          maxScore: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          submissions: [],
        },
      ];

      // Thêm bài tập vào cơ sở dữ liệu
      const result = await db.collection("assignments").insertMany(assignments);
      console.log(
        `Đã tạo ${result.insertedCount} bài tập cho khóa học ${course._id}`
      );

      // Tạo một số submission mẫu cho mỗi học viên
      if (students.length > 0) {
        console.log("Tạo submission mẫu cho học viên...");

        // Lấy ID của bài tập đầu tiên
        const firstAssignmentId = result.insertedIds[0];

        // Tạo submission cho mỗi học viên
        for (const student of students) {
          const submission = {
            assignmentId: firstAssignmentId,
            studentId: student._id,
            content: "Nội dung bài nộp mẫu",
            submittedAt: new Date(),
            grade: Math.floor(Math.random() * 40) + 60, // Điểm từ 60-100
            feedback: "Bài làm tốt, cần cải thiện thêm về phần X, Y, Z",
            status: "graded",
          };

          await db
            .collection("assignments")
            .updateOne(
              { _id: firstAssignmentId },
              { $push: { submissions: submission } }
            );

          console.log(
            `Đã tạo submission cho học viên ${student._id} trong bài tập ${firstAssignmentId}`
          );
        }
      }
    }

    console.log("\nHoàn thành việc tạo bài tập cho tất cả khóa học");

    // Kiểm tra lại kết quả
    const allAssignments = await db.collection("assignments").find().toArray();
    console.log(`Tổng số bài tập trong hệ thống: ${allAssignments.length}`);
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("Đã đóng kết nối MongoDB");
    }
  }
}

createTestAssignmentsForAllCourses()
  .then(() => console.log("Script hoàn tất"))
  .catch((err) => console.error("Lỗi chạy script:", err));
