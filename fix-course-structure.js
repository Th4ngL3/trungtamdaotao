require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";

async function fixCourseStructure() {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = await MongoClient.connect(url);
    const db = client.db();
    console.log("Connected successfully!");

    // Find all courses
    const courses = await db.collection("courses").find({}).toArray();
    console.log(`Found ${courses.length} courses in the database`);

    let fixedCount = 0;

    // Check and fix each course
    for (const course of courses) {
      let updated = false;
      const updates = {};

      if (!course.students || !Array.isArray(course.students)) {
        updates.students = [];
        updated = true;
      }

      if (!course.pendingStudents || !Array.isArray(course.pendingStudents)) {
        updates.pendingStudents = [];
        updated = true;
      }

      // Make sure maxStudents is set
      if (!course.maxStudents) {
        updates.maxStudents = 30; // Default to 30 students
        updated = true;
      }

      // Make sure isActive is set
      if (course.isActive === undefined) {
        updates.isActive = true;
        updated = true;
      }

      if (updated) {
        await db
          .collection("courses")
          .updateOne(
            { _id: course._id },
            { $set: { ...updates, updatedAt: new Date() } }
          );

        console.log(
          `Fixed course ${course._id}: ${course.courseName || course.title}`
        );
        fixedCount++;
      }
    }

    console.log(
      `\nFixed ${fixedCount} courses out of ${courses.length} total courses`
    );
  } catch (error) {
    console.error("Error fixing courses:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

fixCourseStructure().then(() => console.log("Done"));
