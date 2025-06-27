const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function createTestAssignmentCourse() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get the teacher user
    const teacherUser = await db.collection("users").findOne({
      email: "teacher@example.com",
      role: "teacher",
    });

    if (!teacherUser) {
      console.log(
        "Teacher user not found. Please create a teacher account first."
      );
      client.close();
      return;
    }

    console.log("Found teacher user:", teacherUser._id);

    // Create a test course with proper structure
    const courseData = {
      title: "Assignment Test Course",
      courseName: "Assignment Test Course",
      description:
        "This course is created for testing the assignment functionality",
      teacherId: new ObjectId(teacherUser._id),
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      maxStudents: 50,
      students: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      meetLink: "https://meet.google.com/test-assignments",
      duration: "2 hours",
      schedule: "Monday, Wednesday 18:00-20:00",
    };

    const result = await db.collection("courses").insertOne(courseData);
    console.log("Created test course with ID:", result.insertedId);

    // Insert a record with the old course ID specifically for backwards compatibility
    try {
      // Check if we can convert the old ID to ObjectId
      const oldCourseId = new ObjectId("68565463cb059474167811c0");
      const oldCourseData = {
        _id: oldCourseId,
        title: "Redirect Course",
        courseName: "Redirect Course",
        description: "This course redirects to the new test course",
        teacherId: new ObjectId(teacherUser._id),
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxStudents: 50,
        students: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        meetLink: "https://meet.google.com/redirect",
        duration: "2 hours",
        schedule: "Monday, Wednesday 18:00-20:00",
        redirectToNewCourse: result.insertedId,
      };

      await db.collection("courses").insertOne(oldCourseData);
      console.log("Created redirect course with ID:", oldCourseId);
    } catch (error) {
      console.log("Could not create redirect course:", error.message);
    }

    client.close();
    console.log("\nDone creating test course for assignments");
    return result.insertedId;
  } catch (error) {
    console.error("Error creating test course:", error);
  }
}

createTestAssignmentCourse().then((courseId) => {
  if (courseId) {
    console.log("\nUse this course ID for assignments:", courseId);
    console.log(
      "Add it to your assignments tab UI or update the frontend code to use this ID"
    );
  }
  console.log("Script completed");
});
