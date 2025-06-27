const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao";

async function createAvailableCourses() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // First, get a teacher from the database
    const teacher = await db.collection("users").findOne({ role: "teacher" });

    if (!teacher) {
      console.log("No teachers found. Creating a test teacher...");
      const teacherResult = await db.collection("users").insertOne({
        email: "teacher@example.com",
        password:
          "$2a$10$xVqYLGDOkVUXQYJVUxVQZ.Qn4AjIGJJJYu8zMaYq9RyXYxVPnHoPS", // "password"
        name: "Giảng viên Demo",
        fullName: "Giảng viên Demo",
        role: "teacher",
        createdAt: new Date(),
        status: "active",
      });
      var teacherId = teacherResult.insertedId;
      console.log("Created test teacher with ID:", teacherId);
    } else {
      var teacherId = teacher._id;
      console.log("Using existing teacher with ID:", teacherId);
    }

    // Create several available courses with different topics
    const courseTopics = [
      {
        name: "Phát triển ứng dụng di động với React Native",
        description:
          "Khóa học phát triển ứng dụng di động cho cả iOS và Android với React Native. Bạn sẽ học từ cơ bản đến xuất bản ứng dụng lên store.",
        meetLink: "https://meet.google.com/react-native",
        duration: "120 phút/buổi",
        schedule: "Thứ 7, Chủ nhật - 9:00-11:00",
        price: 2500000,
      },
      {
        name: "Thiết kế UI/UX chuyên nghiệp",
        description:
          "Khóa học giúp bạn nắm vững nguyên lý thiết kế giao diện và trải nghiệm người dùng. Thực hành với các công cụ như Figma và Adobe XD.",
        meetLink: "https://meet.google.com/ui-ux",
        duration: "90 phút/buổi",
        schedule: "Thứ 3, Thứ 5 - 19:00-20:30",
        price: 2200000,
      },
      {
        name: "Lập trình Python cho Data Science",
        description:
          "Học Python và các thư viện phân tích dữ liệu như Pandas, NumPy, Matplotlib. Thực hành với các dự án phân tích dữ liệu thực tế.",
        meetLink: "https://meet.google.com/python-ds",
        duration: "120 phút/buổi",
        schedule: "Thứ 2, Thứ 4 - 18:30-20:30",
        price: 2700000,
      },
      {
        name: "Phát triển Web với Node.js và Express",
        description:
          "Xây dựng ứng dụng web từ đầu đến cuối với Node.js và Express. Học cách tạo API, xác thực người dùng và triển khai lên cloud.",
        meetLink: "https://meet.google.com/nodejs",
        duration: "90 phút/buổi",
        schedule: "Thứ 6, Thứ 7 - 20:00-21:30",
        price: 2300000,
      },
      {
        name: "Machine Learning cơ bản",
        description:
          "Hiểu về các thuật toán học máy cơ bản và ứng dụng thực tế. Thực hành với các bài toán phân loại, hồi quy và phân cụm.",
        meetLink: "https://meet.google.com/ml-basic",
        duration: "120 phút/buổi",
        schedule: "Chủ nhật - 14:00-16:00",
        price: 2900000,
      },
    ];

    // Insert all courses
    const coursePromises = courseTopics.map((topic) => {
      const courseData = {
        courseName: topic.name,
        title: topic.name,
        description: topic.description,
        teacherId: teacherId,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
        maxStudents: 20,
        students: [], // Empty students array
        pendingStudents: [], // Initialize pendingStudents as an empty array
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        meetLink: topic.meetLink,
        duration: topic.duration,
        schedule: topic.schedule,
        price: topic.price,
        paymentMethods: ["banking", "momo", "zalopay", "vnpay"],
        qrCodeUrl: `https://example.com/qr/${topic.name
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
        bankingInfo: {
          accountName: "TRUNG TAM DAO TAO",
          accountNumber: "0123456789",
          bankName: "Vietcombank",
          branch: "Ho Chi Minh City",
        },
      };

      return db.collection("courses").insertOne(courseData);
    });

    const result = await Promise.all(coursePromises);
    console.log(
      `Created ${result.length} available courses with IDs:`,
      result.map((r) => r.insertedId)
    );

    client.close();
    return result.map((r) => r.insertedId);
  } catch (error) {
    console.error("Error:", error);
  }
}

createAvailableCourses().then((courseIds) => {
  console.log("\nCreated available courses for testing");
  console.log("Done");
});
