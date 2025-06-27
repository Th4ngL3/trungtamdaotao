const { MongoClient } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function listCourses() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // List all courses
    const courses = await db.collection("courses").find().toArray();
    console.log(`Found ${courses.length} courses:`);

    courses.forEach((course, index) => {
      console.log(`\n[${index + 1}] ID: ${course._id}`);
      console.log(`  Name: ${course.courseName || course.title || "Unnamed"}`);
      console.log(`  Teacher ID: ${course.teacherId}`);
    });

    // Show collections
    const collections = await db.listCollections().toArray();
    console.log("\nCollections in database:");
    collections.forEach((col) => console.log(`- ${col.name}`));

    client.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

listCourses().then(() => console.log("\nDone"));
