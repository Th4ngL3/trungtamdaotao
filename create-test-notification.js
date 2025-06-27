const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";
const client = new MongoClient(uri);

async function createTestNotification() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Create a global notification
    const globalNotification = {
      title: "Thông báo hệ thống",
      content:
        "Chào mừng bạn đến với hệ thống quản lý trung tâm đào tạo. Đây là thông báo test.",
      priority: "normal",
      isGlobal: true,
      createdBy: new ObjectId(), // Admin ID
      createdAt: new Date(),
      readBy: [],
    };

    // Insert notification
    const result = await db
      .collection("notifications")
      .insertOne(globalNotification);
    console.log(`Notification created with ID: ${result.insertedId}`);

    // Create a course-specific notification if courses exist
    const courses = await db.collection("courses").find({}).limit(1).toArray();

    if (courses && courses.length > 0) {
      const courseId = courses[0]._id;
      const courseNotification = {
        title: "Thông báo khóa học",
        content: `Thông báo cho khóa học: ${courses[0].courseName}`,
        priority: "important",
        isGlobal: false,
        courseId: courseId,
        createdBy: new ObjectId(), // Admin ID
        createdAt: new Date(),
        readBy: [],
      };

      const courseResult = await db
        .collection("notifications")
        .insertOne(courseNotification);
      console.log(
        `Course notification created with ID: ${courseResult.insertedId} for course: ${courses[0].courseName}`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

createTestNotification();
