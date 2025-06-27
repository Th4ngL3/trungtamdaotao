const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao";

async function createTestAssignment() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get the latest course (the one we just created)
    const course = await db
      .collection("courses")
      .find()
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (!course || course.length === 0) {
      console.log("No courses found. Please create a course first.");
      client.close();
      return;
    }

    const latestCourse = course[0];
    console.log("Found course:", latestCourse.title || latestCourse.courseName);
    console.log("Course ID:", latestCourse._id);

    // Create multiple test assignments
    const assignments = [
      {
        title: "Bài tập 1: Giới thiệu",
        description:
          "Bài tập đầu tiên - Giới thiệu về khóa học và làm quen với nội dung",
        courseId: new ObjectId(latestCourse._id),
        teacherId: latestCourse.teacherId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        maxScore: 10,
        instructions:
          "Hãy viết một đoạn văn giới thiệu về bản thân và lý do bạn tham gia khóa học này.",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        submissions: [],
      },
      {
        title: "Bài tập 2: Bài tập thực hành",
        description: "Thực hành các kiến thức đã học",
        courseId: new ObjectId(latestCourse._id),
        teacherId: latestCourse.teacherId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        maxScore: 20,
        instructions:
          "Hoàn thành các bài tập trong tài liệu đính kèm và nộp kết quả của bạn.",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        submissions: [],
      },
      {
        title: "Bài tập 3: Dự án cuối kỳ",
        description: "Dự án tổng hợp kiến thức của khóa học",
        courseId: new ObjectId(latestCourse._id),
        teacherId: latestCourse.teacherId,
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
        maxScore: 50,
        instructions:
          "Tạo một dự án hoàn chỉnh ứng dụng các kiến thức đã học trong khóa học. Chi tiết yêu cầu tham khảo tài liệu được cung cấp.",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        submissions: [],
      },
    ];

    // Insert assignments
    const result = await db.collection("assignments").insertMany(assignments);
    console.log(`${result.insertedCount} assignments created successfully.`);

    for (let i = 0; i < assignments.length; i++) {
      console.log(`Assignment ${i + 1} ID: ${result.insertedIds[i]}`);
    }

    client.close();
    return result;
  } catch (error) {
    console.error("Error:", error);
  }
}

createTestAssignment().then(() => {
  console.log("\nAssignments created successfully!");
});
