const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";
const client = new MongoClient(uri);

async function addTestCourses() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Check if users collection exists and find a teacher
    let teacherId = null;
    if (
      (await db.collection("users").countDocuments({ role: "teacher" })) > 0
    ) {
      const teacher = await db.collection("users").findOne({ role: "teacher" });
      if (teacher) {
        teacherId = teacher._id;
        console.log(`Found teacher with ID: ${teacherId}`);
      }
    } else {
      console.log("No teachers found. Creating a dummy teacher ID");
      teacherId = new ObjectId();
    }

    // Sample courses
    const sampleCourses = [
      {
        courseName: "Lập trình Web với JavaScript",
        description:
          "Học cách phát triển ứng dụng web với JavaScript, HTML và CSS",
        teacherId: teacherId,
        startDate: new Date("2023-09-01"),
        endDate: new Date("2023-11-30"),
        maxStudents: 30,
        students: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Cơ sở dữ liệu MongoDB",
        description: "Tìm hiểu về cơ sở dữ liệu NoSQL phổ biến nhất",
        teacherId: teacherId,
        startDate: new Date("2023-10-15"),
        endDate: new Date("2024-01-15"),
        maxStudents: 25,
        students: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        courseName: "Node.js cơ bản đến nâng cao",
        description:
          "Xây dựng ứng dụng server-side với Node.js, Express và MongoDB",
        teacherId: teacherId,
        startDate: new Date("2023-11-01"),
        endDate: new Date("2024-02-28"),
        maxStudents: 20,
        students: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Insert courses
    const result = await db.collection("courses").insertMany(sampleCourses);
    console.log(`${result.insertedCount} courses inserted successfully`);
    console.log("Inserted IDs:", result.insertedIds);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

addTestCourses();
