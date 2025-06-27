const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao";

async function fixSpecificCourse() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // The course ID that's causing the 400 error
    const courseId = "68568192fbed438708345a35";

    console.log(`Fixing course with ID: ${courseId}`);

    // Update the course to add pendingStudents array
    const result = await db
      .collection("courses")
      .updateOne(
        { _id: new ObjectId(courseId) },
        { $set: { pendingStudents: [] } }
      );

    console.log(`Updated ${result.modifiedCount} course(s)`);

    // Verify the course has been updated
    const updatedCourse = await db.collection("courses").findOne({
      _id: new ObjectId(courseId),
    });

    console.log("Course after update:");
    console.log(
      "Course name:",
      updatedCourse.courseName || updatedCourse.title
    );
    console.log(
      "pendingStudents exists:",
      updatedCourse.pendingStudents !== undefined
    );
    console.log(
      "pendingStudents is array:",
      Array.isArray(updatedCourse.pendingStudents)
    );
    console.log(
      "pendingStudents length:",
      updatedCourse.pendingStudents
        ? updatedCourse.pendingStudents.length
        : "N/A"
    );
    console.log("Course details:", JSON.stringify(updatedCourse, null, 2));

    client.close();
    console.log("Done");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixSpecificCourse();
