const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function checkCourseEnrollment() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // Kiểm tra thông tin học sinh
    const student = await db.collection("users").findOne({ role: "student" });
    if (!student) {
      console.log("Không tìm thấy học sinh nào.");
      client.close();
      return;
    }

    console.log("Thông tin học sinh:");
    console.log(`- ID: ${student._id}`);
    console.log(`- Email: ${student.email}`);
    console.log(`- Tên: ${student.fullName || student.name}`);

    // Kiểm tra danh sách khóa học
    const allCourses = await db.collection("courses").find().toArray();
    console.log(`Tổng số khóa học trong hệ thống: ${allCourses.length}`);

    // Kiểm tra cấu trúc của mỗi khóa học
    for (const course of allCourses) {
      console.log("\n===========================");
      console.log(`Khóa học: ${course.title || course.courseName}`);
      console.log(`ID: ${course._id}`);

      // Kiểm tra cấu trúc dữ liệu students
      console.log(
        "Cấu trúc students:",
        course.students ? typeof course.students : "không có"
      );
      if (course.students) {
        console.log(`Số học sinh: ${course.students.length}`);

        // Kiểm tra từng học sinh trong khóa học
        for (let i = 0; i < course.students.length; i++) {
          const s = course.students[i];
          console.log(`Student ${i + 1}:`);
          console.log(`  - studentId type: ${typeof s.studentId}`);
          if (s.studentId) {
            if (typeof s.studentId === "object") {
              console.log(`  - studentId: ${s.studentId}`);
              console.log(
                `  - Match với học sinh hiện tại: ${
                  s.studentId.toString() === student._id.toString()
                }`
              );
            } else {
              console.log(`  - studentId: ${s.studentId}`);
              console.log(
                `  - Match với học sinh hiện tại: ${
                  s.studentId === student._id.toString()
                }`
              );
            }
          } else {
            console.log("  - studentId không hợp lệ");
          }
        }
      }

      // Fix lỗi cấu trúc dữ liệu nếu cần
      if (!course.students || course.students.length === 0) {
        console.log("Thêm học sinh vào khóa học này...");

        const result = await db.collection("courses").updateOne(
          { _id: course._id },
          {
            $push: {
              students: {
                studentId: new ObjectId(student._id),
                enrolledAt: new Date(),
                status: "active",
              },
            },
          }
        );

        console.log(`Kết quả cập nhật: ${result.modifiedCount} bản ghi đã sửa`);
      }
    }

    // Kiểm tra lại việc đăng ký khóa học
    console.log("\n===== KIỂM TRA LẠI =====");

    // Tìm khóa học theo cấu trúc chuẩn
    const coursesStandard = await db
      .collection("courses")
      .find({
        "students.studentId": new ObjectId(student._id),
      })
      .toArray();
    console.log(`Tìm được ${coursesStandard.length} khóa học (theo ObjectId)`);

    // Tìm khóa học theo string ID
    const coursesAltFormat = await db
      .collection("courses")
      .find({
        "students.studentId": student._id.toString(),
      })
      .toArray();
    console.log(`Tìm được ${coursesAltFormat.length} khóa học (theo string)`);

    client.close();
    console.log("\nĐã đóng kết nối MongoDB");
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

checkCourseEnrollment().then(() => console.log("Script hoàn tất"));
