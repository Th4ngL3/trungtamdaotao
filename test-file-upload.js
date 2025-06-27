const fetch = require("node-fetch");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");

// We need to test with a valid teacher token
// Let's create a function to get a token first
async function getTeacherToken() {
  try {
    const response = await fetch("http://localhost:3003/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "teacher@example.com",
        password: "password123",
      }),
    });

    const data = await response.json();
    if (data.token) {
      console.log("Got teacher token successfully");
      return data.token;
    } else {
      console.error("Failed to get token:", data);
      throw new Error("Failed to get token");
    }
  } catch (error) {
    console.error("Error getting token:", error);
    throw error;
  }
}

// Function to test file upload
async function testFileUpload() {
  try {
    const token = await getTeacherToken();

    // Create a test file if it doesn't exist
    const testFilePath = path.join(__dirname, "test-material.txt");
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(
        testFilePath,
        "This is a test material file for upload testing."
      );
      console.log("Created test file at:", testFilePath);
    }

    // Get course ID from our test script output
    const courseId = "685657f08e2540c1190ae76a";
    console.log("Using course ID:", courseId);

    // Create form data with file
    const form = new FormData();
    form.append("file", fs.createReadStream(testFilePath));

    // Upload file
    console.log("Uploading file...");
    const uploadResponse = await fetch(
      `http://localhost:3003/files/upload/course-material?courseId=${courseId}&description=Test%20Material`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...form.getHeaders(),
        },
        body: form,
      }
    );

    const uploadResult = await uploadResponse.json();
    console.log("Upload response status:", uploadResponse.status);
    console.log("Upload response:", uploadResult);
  } catch (error) {
    console.error("Error testing file upload:", error);
  }
}

testFileUpload().then(() => console.log("Done testing"));
