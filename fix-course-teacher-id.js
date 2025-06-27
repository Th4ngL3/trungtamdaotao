const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function fixCourseTeacherId() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get the teacher user ID
    const teacherUser = await db.collection("users").findOne({
      email: "teacher@example.com",
      role: "teacher",
    });

    if (!teacherUser) {
      console.error("Teacher user not found");
      return;
    }

    console.log("Found teacher user:", teacherUser._id);

    // Find all courses with string teacherId
    const courses = await db
      .collection("courses")
      .find({
        teacherId: { $type: "string" },
      })
      .toArray();

    console.log(`Found ${courses.length} courses with string teacherId`);

    // Update each course
    for (const course of courses) {
      console.log(`Updating course: ${course._id}`);
      console.log(
        `  Current teacherId: ${course.teacherId} (${typeof course.teacherId})`
      );

      try {
        // Convert the string ID to ObjectId
        const teacherId = new ObjectId(course.teacherId);

        // Update the course
        await db
          .collection("courses")
          .updateOne({ _id: course._id }, { $set: { teacherId: teacherId } });

        console.log(`  Updated teacherId to ObjectId: ${teacherId}`);
      } catch (error) {
        console.error(`  Error updating course ${course._id}:`, error.message);
      }
    }

    // Verify the updates
    const updatedCourses = await db.collection("courses").find({}).toArray();

    console.log("\nVerification:");
    for (const course of updatedCourses) {
      const idType =
        course.teacherId instanceof ObjectId
          ? "ObjectId"
          : typeof course.teacherId;

      console.log(
        `Course ${course._id}: teacherId is ${idType} - ${course.teacherId}`
      );
    }

    client.close();
    console.log("\nDone fixing course teacher IDs");
  } catch (error) {
    console.error("Error fixing course teacher IDs:", error);
  }
}

fixCourseTeacherId().then(() => console.log("Script completed"));
