require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";

async function getTeacherAccount() {
  try {
    console.log("Kết nối tới MongoDB...");
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    console.log("Kết nối thành công!");

    // Tìm tài khoản giảng viên
    const teacherAccount = await db
      .collection("users")
      .findOne({ role: "teacher" });

    if (teacherAccount) {
      console.log("Thông tin tài khoản giảng viên:");
      console.log("============================");
      console.log(`- ID: ${teacherAccount._id}`);
      console.log(`- Email: ${teacherAccount.email}`);
      console.log(`- Mật khẩu: ${teacherAccount.password}`);
      console.log(`- Tên: ${teacherAccount.name}`);
      console.log(`- Họ tên đầy đủ: ${teacherAccount.fullName || "Không có"}`);
      console.log(`- Số điện thoại: ${teacherAccount.phone || "Không có"}`);
      console.log(`- Địa chỉ: ${teacherAccount.address || "Không có"}`);
      console.log(`- Vai trò: ${teacherAccount.role}`);
      console.log(`- Ngày tạo: ${teacherAccount.createdAt}`);
      console.log("============================");
      console.log("Thông tin đăng nhập:");
      console.log(`Email: ${teacherAccount.email}`);
      console.log(`Mật khẩu: ${teacherAccount.password}`);
    } else {
      console.log("Không tìm thấy tài khoản giảng viên nào!");
    }

    await client.close();
    console.log("Đã đóng kết nối tới MongoDB");
  } catch (error) {
    console.error("Lỗi:", error);
  }
}

getTeacherAccount();
