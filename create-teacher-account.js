require("dotenv").config();
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function createTeacherAccount() {
  try {
    console.log("Connecting to MongoDB...");
    const client = await MongoClient.connect(url);
    const db = client.db(dbName);
    console.log("Connected successfully!");

    // First check if we already have a user with this email
    const existingUser = await db
      .collection("users")
      .findOne({ email: "teacher@example.com" });
    const existingTeacher = await db
      .collection("teachers")
      .findOne({ email: "teacher@example.com" });

    if (existingUser && existingTeacher) {
      console.log("Teacher account already exists:");
      console.log("User ID:", existingUser._id);
      console.log("Teacher ID:", existingTeacher._id);

      // Update password to make sure it's set correctly
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash("password123", saltRounds);

      await db
        .collection("users")
        .updateOne(
          { email: "teacher@example.com" },
          { $set: { password: hashedPassword } }
        );

      console.log("Updated password for existing teacher account");
      client.close();
      return;
    }

    // Create teacher user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash("password123", saltRounds);

    const userResult = await db.collection("users").insertOne({
      email: "teacher@example.com",
      password: hashedPassword,
      name: "Test Teacher",
      role: "teacher",
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    });

    console.log("Created user with ID:", userResult.insertedId);

    // Create teacher profile
    const teacherResult = await db.collection("teachers").insertOne({
      _id: userResult.insertedId,
      email: "teacher@example.com",
      name: "Test Teacher",
      createdAt: new Date(),
      bio: "This is a test teacher account",
      status: "active",
    });

    console.log("Created teacher profile with ID:", teacherResult.insertedId);

    client.close();
    console.log("Teacher account created successfully");
  } catch (error) {
    console.error("Error creating teacher account:", error);
  }
}

createTeacherAccount().then(() => console.log("Done"));
