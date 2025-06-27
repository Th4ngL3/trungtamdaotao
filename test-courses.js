const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "education";

async function testTeacherCoursesAssignments() {
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
      console.log("Teacher user not found. Creating one...");
      // Code to create teacher user would go here if needed
      return;
    }

    console.log("Found teacher user:", teacherUser._id);

    // Check if teacher has a profile
    const teacherProfile = await db.collection("teachers").findOne({
      email: "teacher@example.com",
    });

    console.log("Teacher profile:", teacherProfile ? "Found" : "Not found");

    // Get courses for this teacher
    console.log("Searching for courses with teacherId:", teacherUser._id);
    const courses = await db.collection("courses").find({}).toArray();

    // Filter courses manually
    const teacherCourses = courses.filter((course) => {
      const courseTeacherId =
        course.teacherId instanceof ObjectId
          ? course.teacherId.toString()
          : typeof course.teacherId === "string"
          ? course.teacherId
          : null;

      const userTeacherId = teacherUser._id.toString();
      return courseTeacherId === userTeacherId;
    });

    console.log(
      `Found ${teacherCourses.length} courses for this teacher (out of ${courses.length} total courses)`
    );

    for (const course of teacherCourses) {
      console.log("\nCourse Details:");
      console.log(JSON.stringify(course, null, 2));

      // Check assignments for this course
      const assignments = await db
        .collection("assignments")
        .find({
          courseId:
            course._id instanceof ObjectId
              ? course._id
              : new ObjectId(course._id),
        })
        .toArray();

      console.log(`  Found ${assignments.length} assignments for this course`);

      if (assignments.length > 0) {
        console.log("First assignment details:");
        console.log(JSON.stringify(assignments[0], null, 2));
      }
    }

    // If no courses found, create a test course
    if (teacherCourses.length === 0) {
      console.log(
        "No courses found. Creating a test course for the teacher..."
      );

      const courseData = {
        courseName: "Test Course for Assignments",
        title: "Test Course for Teacher",
        description:
          "This is a test course created for testing assignment functionality",
        teacherId: new ObjectId(teacherUser._id),
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        maxStudents: 50,
        students: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        meetLink: "https://meet.google.com/test",
        duration: "2 hours",
        schedule: "Monday, Wednesday 18:00-20:00",
      };

      const courseResult = await db.collection("courses").insertOne(courseData);
      console.log("Created test course with ID:", courseResult.insertedId);
    }

    client.close();
  } catch (error) {
    console.error("Error testing teacher courses assignments:", error);
  }
}

testTeacherCoursesAssignments().then(() => console.log("Done"));
