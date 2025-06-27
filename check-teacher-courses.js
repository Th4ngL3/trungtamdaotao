const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function checkTeacherCourses() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get all teachers
    const teachers = await db.collection("teachers").find().toArray();
    console.log(`Found ${teachers.length} teachers:`);

    for (const teacher of teachers) {
      console.log(`\nTeacher ID: ${teacher._id}`);
      console.log(`  Name: ${teacher.name || "No name"}`);
      console.log(`  Email: ${teacher.email || "No email"}`);

      // Find courses for this teacher
      const courses = await db
        .collection("courses")
        .find({ teacherId: teacher._id })
        .toArray();

      console.log(`  Courses (${courses.length}):`);

      courses.forEach((course, index) => {
        console.log(`    [${index + 1}] ID: ${course._id}`);
        console.log(
          `        Name: ${course.courseName || course.title || "Unnamed"}`
        );
      });
    }

    client.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTeacherCourses().then(() => console.log("\nDone"));
