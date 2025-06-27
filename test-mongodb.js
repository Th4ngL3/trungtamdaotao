const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";
const client = new MongoClient(uri);

async function listCourses() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db();

    // Check if courses collection exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("Available collections:", collectionNames);

    if (collectionNames.includes("courses")) {
      // Count courses
      const courseCount = await db.collection("courses").countDocuments();
      console.log(`Number of courses in the database: ${courseCount}`);

      // List all courses
      const courses = await db.collection("courses").find({}).toArray();
      console.log("Courses:", JSON.stringify(courses, null, 2));
    } else {
      console.log("The 'courses' collection does not exist in the database");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

listCourses();
