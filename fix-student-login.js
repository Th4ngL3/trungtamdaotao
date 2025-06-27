const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function fixStudentLogin() {
  let client;
  try {
    client = await MongoClient.connect(url);
    console.log("Đã kết nối với MongoDB");

    const db = client.db(dbName);

    // 1. Lấy thông tin người dùng hiện tại từ giao diện
    const currentUserId = "685590fefd8c1d360dea97ff"; // ID học viên từ log

    // Kiểm tra thông tin người dùng hiện tại
    console.log(`Kiểm tra thông tin người dùng với ID: ${currentUserId}`);
    const currentUser = await db.collection("users").findOne({
      _id: new ObjectId(currentUserId),
    });

    if (!currentUser) {
      console.log("Không tìm thấy người dùng với ID này, tạo mới...");

      // Tạo người dùng mới với thông tin cần thiết
      const newUser = {
        _id: new ObjectId(currentUserId),
        email: "student_fix@example.com",
        password: await bcrypt.hash("password", 10),
        role: "student",
        name: "Nguyễn Cường",
        fullName: "Nguyễn Cường",
        createdAt: new Date(),
        status: "active",
      };

      await db.collection("users").insertOne(newUser);
      console.log("Đã tạo người dùng mới với ID:", currentUserId);
    } else {
      console.log("Đã tìm thấy người dùng:", currentUser.email);
    }

    // 2. Kiểm tra tài khoản đăng nhập hiện tại
    const loginUser = await db.collection("users").findOne({
      email: "student@example.com",
      role: "student",
    });

    if (loginUser) {
      console.log("Tìm thấy tài khoản đăng nhập:", loginUser.email);
      console.log("ID tài khoản đăng nhập:", loginUser._id);

      // 3. Kiểm tra khóa học của tài khoản đăng nhập
      const loginUserCourses = await db
        .collection("courses")
        .find({
          "students.studentId": loginUser._id,
        })
        .toArray();

      console.log(`Tài khoản đăng nhập có ${loginUserCourses.length} khóa học`);

      // 4. Đồng bộ khóa học giữa tài khoản đăng nhập và tài khoản cần khắc phục
      console.log("Đồng bộ khóa học giữa hai tài khoản...");

      // Kiểm tra khóa học của tài khoản cần khắc phục
      const targetUserCourses = await db
        .collection("courses")
        .find({
          "students.studentId": new ObjectId(currentUserId),
        })
        .toArray();

      console.log(
        `Tài khoản cần khắc phục có ${targetUserCourses.length} khóa học`
      );

      // 5. Cập nhật thông tin đăng nhập
      console.log("Cập nhật thông tin đăng nhập...");

      // Phương pháp 1: Cập nhật email của tài khoản hiện tại để có thể đăng nhập
      await db.collection("users").updateOne(
        { _id: new ObjectId(currentUserId) },
        {
          $set: {
            email: "student@example.com",
            password: loginUser.password,
          },
        }
      );

      console.log(
        "Đã cập nhật thông tin đăng nhập cho tài khoản cần khắc phục"
      );

      // Phương pháp 2: Cập nhật ID của tài khoản đăng nhập để trỏ đến các khóa học
      for (const course of loginUserCourses) {
        console.log(`Đang cập nhật khóa học: ${course._id}`);

        // Kiểm tra xem tài khoản cần khắc phục đã có trong khóa học chưa
        const targetExists =
          course.students &&
          course.students.some(
            (s) => s.studentId && s.studentId.toString() === currentUserId
          );

        if (!targetExists) {
          // Thêm tài khoản cần khắc phục vào khóa học
          await db.collection("courses").updateOne(
            { _id: course._id },
            {
              $push: {
                students: {
                  studentId: new ObjectId(currentUserId),
                  enrolledAt: new Date(),
                  status: "active",
                },
              },
            }
          );
          console.log(
            `Đã thêm tài khoản cần khắc phục vào khóa học ${course._id}`
          );
        } else {
          console.log(
            `Tài khoản cần khắc phục đã có trong khóa học ${course._id}`
          );
        }
      }
    } else {
      console.log("Không tìm thấy tài khoản đăng nhập student@example.com");
    }

    // 6. Kiểm tra lại kết quả
    console.log("\n=== KIỂM TRA KẾT QUẢ ===");

    const updatedUser = await db.collection("users").findOne({
      email: "student@example.com",
    });

    console.log("Thông tin tài khoản đăng nhập sau khi cập nhật:");
    console.log(`- ID: ${updatedUser._id}`);
    console.log(`- Email: ${updatedUser.email}`);
    console.log(`- Tên: ${updatedUser.name || updatedUser.fullName}`);

    const finalCourses = await db
      .collection("courses")
      .find({
        "students.studentId": updatedUser._id,
      })
      .toArray();

    console.log(
      `\nTìm thấy ${finalCourses.length} khóa học cho tài khoản đăng nhập:`
    );
    finalCourses.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.courseName || c.title || "Không tên"} (${c._id})`
      );
    });
  } catch (error) {
    console.error("Lỗi:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("\nĐã đóng kết nối MongoDB");
    }
  }
}

fixStudentLogin()
  .then(() => console.log("Hoàn tất khắc phục đăng nhập học viên"))
  .catch((err) => console.error("Lỗi chạy script:", err));
