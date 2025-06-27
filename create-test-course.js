const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao"; // Fix database name

async function createTestCourse() {
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
        name: "Test Teacher",
        fullName: "Test Teacher",
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

    // Find the current student
    const student = await db.collection("users").findOne({ role: "student" });

    if (!student) {
      console.log(
        "No student found. Please run add-student-to-course.js first."
      );
      client.close();
      return;
    }

    console.log("Found student:", student.email);
    const studentId = student._id;

    // Create a test course with Vietnamese name
    const courseData = {
      courseName: "Khóa học thử nghiệm",
      title: "Khóa học Demo với bài tập",
      description: "Đây là khóa học được tạo tự động để thử nghiệm hệ thống",
      teacherId: teacherId,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      maxStudents: 50,
      students: [
        {
          studentId: new ObjectId(studentId),
          enrolledAt: new Date(),
          status: "active",
        },
      ],
      pendingStudents: [], // Initialize pendingStudents as an empty array
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      meetLink: "https://meet.google.com/demo",
      duration: "90 phút/buổi",
      schedule: "Thứ 2, Thứ 4 - 18:00-19:30",
    };

    const courseResult = await db.collection("courses").insertOne(courseData);
    console.log("Created test course with ID:", courseResult.insertedId);
    console.log("Course data:", courseData);
    console.log("Student added to course:", student.email);

    client.close();
    return courseResult.insertedId;
  } catch (error) {
    console.error("Error:", error);
  }
}

createTestCourse().then((courseId) => {
  console.log("\nUse this course ID for testing:", courseId);
  console.log("Done");
});
