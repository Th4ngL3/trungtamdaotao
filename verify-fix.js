const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function verifyFixes() {
  let client;
  try {
    client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // 1. Lấy thông tin học viên
    const studentId = "685590fefd8c1d360dea97ff"; // ID học viên từ log
    const student = await db
      .collection("users")
      .findOne({ _id: new ObjectId(studentId) });

    console.log(`\n=== THÔNG TIN HỌC VIÊN ===`);
    if (student) {
      console.log(
        `Học viên: ${student.name || student.fullName || student.email}`
      );
      console.log(`ID: ${student._id}`);
      console.log(`Email: ${student.email}`);
      console.log(`Vai trò: ${student.role}`);
    } else {
      console.log(`Không tìm thấy học viên với ID ${studentId}`);
      return;
    }

    // 2. Kiểm tra các khóa học của học viên theo nhiều phương thức
    console.log(`\n=== KIỂM TRA THEO CÁCH 1 - TRUY VẤN TRỰC TIẾP ===`);
    // Kiểm tra với ObjectId
    const coursesWithObjectId = await db
      .collection("courses")
      .find({
        "students.studentId": new ObjectId(studentId),
      })
      .toArray();

    console.log(
      `Tìm thấy ${coursesWithObjectId.length} khóa học theo ObjectId`
    );
    if (coursesWithObjectId.length > 0) {
      coursesWithObjectId.forEach((c, i) => {
        console.log(
          `${i + 1}. ${c.courseName || c.title || "Không tên"} (${c._id})`
        );
      });
    }

    console.log(`\n=== KIỂM TRA THEO CÁCH 2 - TRUY VẤN ELEMATCH ===`);
    // Kiểm tra với truy vấn nâng cao
    const elemMatchQuery = {
      students: {
        $elemMatch: {
          studentId: { $in: [new ObjectId(studentId), studentId] },
        },
      },
    };

    const coursesWithElemMatch = await db
      .collection("courses")
      .find(elemMatchQuery)
      .toArray();
    console.log(
      `Tìm thấy ${coursesWithElemMatch.length} khóa học theo $elemMatch`
    );
    if (coursesWithElemMatch.length > 0) {
      coursesWithElemMatch.forEach((c, i) => {
        console.log(
          `${i + 1}. ${c.courseName || c.title || "Không tên"} (${c._id})`
        );
      });
    }

    console.log(`\n=== THÔNG TIN CHI TIẾT CÁC KHÓA HỌC ===`);
    // Hiển thị thông tin chi tiết khóa học
    const allCourses = await db.collection("courses").find().toArray();
    for (const course of allCourses) {
      console.log(
        `\nKhóa học: ${course.courseName || course.title || "Không tên"}`
      );
      console.log(`ID: ${course._id}`);

      // Kiểm tra mảng students
      if (course.students && course.students.length > 0) {
        console.log(`Số học viên: ${course.students.length}`);

        // Kiểm tra từng phần tử trong mảng students
        let hasTargetStudent = false;
        course.students.forEach((student, idx) => {
          if (!student || !student.studentId) return;

          const sIdStr =
            typeof student.studentId === "object"
              ? student.studentId.toString()
              : student.studentId;
          const targetIdStr = studentId.toString();

          if (sIdStr === targetIdStr) {
            hasTargetStudent = true;
            console.log(`- Tìm thấy học viên mục tiêu ở vị trí ${idx + 1}`);
            console.log(`  + Loại studentId: ${typeof student.studentId}`);
            console.log(`  + Giá trị: ${student.studentId}`);
          }
        });

        if (!hasTargetStudent) {
          console.log(
            `Không tìm thấy học viên ${studentId} trong khóa học này!`
          );
        }
      } else {
        console.log(`Không có học viên nào trong khóa học này`);
      }
    }

    console.log(`\n=== TÓM TẮT KIỂM TRA ===`);
    console.log(`- Tổng số khóa học: ${allCourses.length}`);
    console.log(
      `- Khóa học tìm được theo ObjectId: ${coursesWithObjectId.length}`
    );
    console.log(
      `- Khóa học tìm được theo $elemMatch: ${coursesWithElemMatch.length}`
    );

    // Kết luận
    if (
      coursesWithObjectId.length === allCourses.length &&
      coursesWithElemMatch.length === allCourses.length
    ) {
      console.log(
        `\n✓ ĐÃ KHẮC PHỤC THÀNH CÔNG: Học viên có thể thấy tất cả ${allCourses.length} khóa học!`
      );
    } else {
      console.log(
        `\n✗ CHƯA KHẮC PHỤC HOÀN TẤT: Học viên chỉ thấy một phần khóa học (${Math.max(
          coursesWithObjectId.length,
          coursesWithElemMatch.length
        )}/${allCourses.length})`
      );
    }
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\nĐã đóng kết nối MongoDB");
    }
  }
}

verifyFixes()
  .then(() => console.log("Hoàn tất kiểm tra"))
  .catch((err) => console.error("Lỗi chạy script kiểm tra:", err));
