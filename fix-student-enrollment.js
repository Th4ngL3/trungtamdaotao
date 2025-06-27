const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function fixStudentEnrollment() {
  let client;
  try {
    client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // 1. Lấy thông tin học viên hiện tại (dựa trên dữ liệu trong log)
    const studentId = "685590fefd8c1d360dea97ff"; // ID học viên từ log
    console.log(`Tìm học viên với ID: ${studentId}`);

    const student = await db
      .collection("users")
      .findOne({ _id: new ObjectId(studentId) });
    console.log(
      "Thông tin học viên:",
      student ? `Tìm thấy: ${student.email}` : "Không tìm thấy"
    );

    if (!student) {
      // Tạo mới học viên để đảm bảo tồn tại trong DB
      console.log("Tạo học viên mới để đảm bảo tồn tại trong DB");
      const newStudentData = {
        _id: new ObjectId(studentId),
        email: "student_fix@example.com",
        password:
          "$2a$10$xVqYLGDOkVUXQYJVUxVQZ.Qn4AjIGJJJYu8zMaYq9RyXYxVPnHoPS", // "password"
        role: "student",
        name: "Học viên Cần Fix",
        fullName: "Học viên Cần Fix",
        createdAt: new Date(),
        status: "active",
      };

      await db.collection("users").insertOne(newStudentData);
      console.log(`Đã tạo học viên mới với ID: ${studentId}`);
    }

    // 2. Lấy danh sách tất cả khóa học
    const allCourses = await db.collection("courses").find().toArray();
    console.log(`Tìm thấy ${allCourses.length} khóa học trong hệ thống`);

    // 3. Kiểm tra cấu trúc khóa học và khắc phục vấn đề
    let fixedCourses = 0;

    for (const course of allCourses) {
      console.log(`\n==========================================`);
      console.log(
        `Đang kiểm tra khóa học: ${
          course.courseName || course.title || "Không tên"
        } (${course._id})`
      );

      // In ra cấu trúc students để debug
      if (course.students && course.students.length > 0) {
        console.log("Cấu trúc students:");
        console.dir(course.students, { depth: 3 });
      } else {
        console.log("Không có students hoặc mảng rỗng");
      }

      // Khởi tạo mảng students nếu chưa có
      if (!course.students) {
        await db
          .collection("courses")
          .updateOne({ _id: course._id }, { $set: { students: [] } });
        console.log(
          `- Khóa học ${course._id} không có mảng students, đã khởi tạo`
        );
        course.students = [];
      }

      // Kiểm tra xem học viên đã đăng ký khóa học chưa
      const isEnrolled =
        Array.isArray(course.students) &&
        course.students.some((s) => {
          if (!s || !s.studentId) return false;

          const sIdStr =
            typeof s.studentId === "object"
              ? s.studentId.toString()
              : s.studentId;
          const targetIdStr = studentId.toString();
          return sIdStr === targetIdStr;
        });

      console.log(
        `- Học viên ${isEnrolled ? "đã" : "chưa"} đăng ký khóa học này`
      );

      // Nếu chưa đăng ký, thêm học viên vào khóa học
      if (!isEnrolled) {
        console.log(`- Thêm học viên ${studentId} vào khóa học ${course._id}`);

        const result = await db.collection("courses").updateOne(
          { _id: course._id },
          {
            $push: {
              students: {
                studentId: new ObjectId(studentId),
                enrolledAt: new Date(),
                status: "active",
              },
            },
            $set: { updatedAt: new Date() },
          }
        );

        console.log(
          `- Kết quả thêm học viên: modifiedCount=${result.modifiedCount}, matchedCount=${result.matchedCount}`
        );

        if (result.modifiedCount > 0) {
          fixedCourses++;
          console.log(`- Đã thêm học viên vào khóa học ${course._id}`);
        } else {
          console.log(`- Không thể thêm học viên vào khóa học ${course._id}`);
        }
      } else {
        console.log(`- Học viên đã đăng ký khóa học ${course._id}`);

        // Kiểm tra xem studentId có đang ở dạng String không, nếu có thì chuyển về ObjectId
        const studentWithStringId = course.students.find(
          (s) =>
            s &&
            s.studentId &&
            typeof s.studentId === "string" &&
            s.studentId === studentId
        );

        if (studentWithStringId) {
          console.log(
            `- Đang sửa định dạng studentId trong khóa học ${course._id}`
          );

          // Xóa record cũ
          const pullResult = await db.collection("courses").updateOne(
            { _id: course._id },
            {
              $pull: { students: { studentId: studentId } },
            }
          );

          console.log(`  - Đã xóa ${pullResult.modifiedCount} phần tử cũ`);

          // Thêm record mới với ObjectId
          const pushResult = await db.collection("courses").updateOne(
            { _id: course._id },
            {
              $push: {
                students: {
                  studentId: new ObjectId(studentId),
                  enrolledAt: new Date(),
                  status: "active",
                },
              },
            }
          );

          console.log(`  - Đã thêm ${pushResult.modifiedCount} phần tử mới`);

          if (pullResult.modifiedCount > 0 || pushResult.modifiedCount > 0) {
            fixedCourses++;
            console.log(
              `- Đã sửa định dạng studentId trong khóa học ${course._id}`
            );
          }
        }
      }
    }

    // 4. Kiểm tra lại kết quả
    console.log("\n=== KIỂM TRA KẾT QUẢ ===");

    // Kiểm tra với ObjectId
    const coursesWithObjectId = await db
      .collection("courses")
      .find({
        "students.studentId": new ObjectId(studentId),
      })
      .toArray();

    console.log(
      `Tìm thấy ${coursesWithObjectId.length} khóa học cho học viên (dạng ObjectId)`
    );
    coursesWithObjectId.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.courseName || c.title || "Không tên"} (${c._id})`
      );
    });

    // Kiểm tra với String
    const coursesWithString = await db
      .collection("courses")
      .find({
        "students.studentId": studentId,
      })
      .toArray();

    console.log(
      `Tìm thấy ${coursesWithString.length} khóa học cho học viên (dạng String)`
    );

    console.log(`\nĐã sửa tổng cộng ${fixedCourses} khóa học`);

    // 5. Kiểm tra/Sửa kết quả trả về của phương thức findByStudentId
    console.log("\n=== SỬA CHỮA MẪU TRUY VẤN ===");

    // Áp dụng tạm thời query mới để kiểm tra
    const testQuery = {
      students: {
        $elemMatch: {
          studentId: { $in: [new ObjectId(studentId), studentId] },
        },
      },
    };

    const testResult = await db.collection("courses").find(testQuery).toArray();
    console.log(`Kết quả với query cải tiến: ${testResult.length} khóa học`);
    console.log("Danh sách khóa học tìm được:");
    testResult.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.courseName || c.title || "Không tên"} (${c._id})`
      );
    });
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("Đã đóng kết nối MongoDB");
    }
  }
}

fixStudentEnrollment()
  .then(() => console.log("Hoàn tất script sửa chữa đăng ký khóa học"))
  .catch((err) => console.error("Lỗi chạy script:", err));
