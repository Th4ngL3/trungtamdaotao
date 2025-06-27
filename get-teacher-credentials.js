require("dotenv").config();
const { MongoClient } = require("mongodb");

const url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/trungtamdaotao";

async function getTeacherCredentials() {
  let client;
  try {
    console.log("Connecting to MongoDB...");
    client = await MongoClient.connect(url);
    const db = client.db();
    console.log("Connected successfully!");

    // Find all teachers in the system
    const teachers = await db
      .collection("users")
      .find({ role: "teacher" })
      .toArray();

    console.log(`Found ${teachers.length} teachers in the system:\n`);

    if (teachers.length === 0) {
      console.log(
        "No teachers found. You may need to create a teacher account first."
      );
      console.log("Try running: node create-teacher-account.js");
    }

    teachers.forEach((teacher, index) => {
      console.log(`Teacher ${index + 1}:`);
      console.log(`- ID: ${teacher._id}`);
      console.log(`- Name: ${teacher.name || teacher.fullName}`);
      console.log(`- Email: ${teacher.email}`);
      console.log(`- Password: ${teacher.password}`);
      console.log("------------------------------------------------");
    });

    // Check if we need to create a test teacher account
    if (teachers.length === 0) {
      console.log("Creating a test teacher account...");
      const result = await db.collection("users").insertOne({
        email: "teacher@example.com",
        password: "password123",
        name: "Test Teacher",
        role: "teacher",
        createdAt: new Date(),
        isActive: true,
      });

      console.log("Created test teacher account:");
      console.log(`- ID: ${result.insertedId}`);
      console.log(`- Email: teacher@example.com`);
      console.log(`- Password: password123`);
    }
  } catch (error) {
    console.error("Error accessing teacher credentials:", error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

getTeacherCredentials().then(() => console.log("Done"));
