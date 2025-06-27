require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";
const courseId = "68568192fbed438708345a36"; // The course ID with the error

async function checkCourse() {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = await MongoClient.connect(url);
    const db = client.db();
    console.log("Connected successfully!");

    // Find the course
    const course = await db
      .collection("courses")
      .findOne({ _id: new ObjectId(courseId) });

    if (!course) {
      console.log(`Course with ID ${courseId} not found!`);
      return;
    }

    console.log("Found course:");
    console.log(`- ID: ${course._id}`);
    console.log(`- Name: ${course.courseName || course.title}`);
    console.log(`- Teacher ID: ${course.teacherId}`);
    console.log(`- Max Students: ${course.maxStudents || "Not set"}`);
    console.log(`- Active: ${course.isActive ? "Yes" : "No"}`);

    // Check students and pendingStudents arrays
    console.log(
      `- Students: ${
        Array.isArray(course.students) ? course.students.length : "Not an array"
      }`
    );
    console.log(
      `- Pending Students: ${
        Array.isArray(course.pendingStudents)
          ? course.pendingStudents.length
          : "Not an array"
      }`
    );

    // Check if teacher exists
    if (course.teacherId) {
      const teacher = await db
        .collection("users")
        .findOne({ _id: new ObjectId(course.teacherId) });

      if (teacher) {
        console.log("\nTeacher information:");
        console.log(`- Name: ${teacher.name || teacher.fullName}`);
        console.log(`- Email: ${teacher.email}`);
        console.log(`- Role: ${teacher.role}`);
      } else {
        console.log("\nTeacher not found in the database!");
      }
    }

    // Fix any structure issues with the course
    let updated = false;

    // Make sure students array exists and is an array
    if (!course.students || !Array.isArray(course.students)) {
      await db
        .collection("courses")
        .updateOne({ _id: new ObjectId(courseId) }, { $set: { students: [] } });
      updated = true;
      console.log("\nUpdated: Added empty students array");
    }

    // Make sure pendingStudents array exists and is an array
    if (!course.pendingStudents || !Array.isArray(course.pendingStudents)) {
      await db
        .collection("courses")
        .updateOne(
          { _id: new ObjectId(courseId) },
          { $set: { pendingStudents: [] } }
        );
      updated = true;
      console.log("\nUpdated: Added empty pendingStudents array");
    }

    if (updated) {
      console.log("\nCourse structure has been fixed.");
    } else {
      console.log("\nNo structure issues found with this course.");
    }
  } catch (error) {
    console.error("Error checking course:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkCourse().then(() => console.log("Done"));
