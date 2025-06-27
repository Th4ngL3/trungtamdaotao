const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao";

async function addStudentToCourse() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // Lấy danh sách học sinh
    const students = await db
      .collection("users")
      .find({ role: "student" })
      .toArray();

    if (students.length === 0) {
      console.log("Không tìm thấy học sinh nào. Tạo một học sinh mới...");

      // Tạo một học sinh mới nếu không có
      const newStudent = {
        email: "student@example.com",
        password:
          "$2a$10$xVqYLGDOkVUXQYJVUxVQZ.Qn4AjIGJJJYu8zMaYq9RyXYxVPnHoPS", // "password"
        role: "student",
        name: "Học sinh Test",
        fullName: "Học sinh Test",
        createdAt: new Date(),
        status: "active",
      };

      const studentResult = await db.collection("users").insertOne(newStudent);
      var studentId = studentResult.insertedId;
      console.log("Đã tạo học sinh mới với ID:", studentId);
    } else {
      var studentId = students[0]._id;
      console.log("Sử dụng học sinh có sẵn với ID:", studentId);
      console.log("Email học sinh:", students[0].email);
    }

    // Lấy danh sách khóa học
    const courses = await db.collection("courses").find().toArray();

    if (courses.length === 0) {
      console.log("Không tìm thấy khóa học nào.");
      client.close();
      return;
    }

    console.log(`Tìm thấy ${courses.length} khóa học:`);

    // Hiển thị danh sách khóa học
    courses.forEach((course, index) => {
      console.log(
        `${index + 1}. ${course._id}: ${
          course.title || course.courseName || "Không có tên"
        }`
      );
    });

    // Xử lý từng khóa học
    let successCount = 0;
    let alreadyEnrolledCount = 0;

    for (const course of courses) {
      console.log(
        `\nĐang xử lý khóa học: ${
          course.title || course.courseName || "Không có tên"
        } (${course._id})`
      );

      // Kiểm tra xem học sinh đã có trong khóa học chưa
      const studentExists =
        course.students &&
        Array.isArray(course.students) &&
        course.students.some(
          (s) => s.studentId && s.studentId.toString() === studentId.toString()
        );

      if (studentExists) {
        console.log(`- Học sinh đã có trong khóa học này`);
        alreadyEnrolledCount++;
        continue;
      }

      // Thêm học sinh vào khóa học
      const studentData = {
        studentId: new ObjectId(studentId),
        enrolledAt: new Date(),
        status: "active",
      };

      const result = await db.collection("courses").updateOne(
        { _id: course._id },
        {
          $push: { students: studentData },
          $set: { updatedAt: new Date() },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`- Đã thêm học sinh vào khóa học thành công`);
        successCount++;
      } else {
        console.log(`- Không thể thêm học sinh vào khóa học`);
      }
    }

    console.log("\n======= KẾT QUẢ =======");
    console.log(`Tổng số khóa học: ${courses.length}`);
    console.log(`Số khóa học đã thêm thành công: ${successCount}`);
    console.log(
      `Số khóa học học sinh đã đăng ký trước đó: ${alreadyEnrolledCount}`
    );

    client.close();
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

addStudentToCourse().then(() => console.log("Script hoàn tất"));
