const { MongoClient, ObjectId } = require("mongodb");

const url = "mongodb://localhost:27017";
const dbName = "trungtamdaotao";

async function testTeacherApproval() {
  try {
    const client = await MongoClient.connect(url);
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Get a teacher
    const teacher = await db.collection("users").findOne({ role: "teacher" });
    if (!teacher) {
      console.log("No teacher found");
      client.close();
      return;
    }
    console.log(`Found teacher: ${teacher.name} (${teacher._id})`);

    // Get a student
    const student = await db.collection("users").findOne({ role: "student" });
    if (!student) {
      console.log("No student found");
      client.close();
      return;
    }
    console.log(
      `Found student: ${student.name || student.email} (${student._id})`
    );

    // Get a course created by this teacher
    const course = await db
      .collection("courses")
      .findOne({ teacherId: teacher._id });
    if (!course) {
      console.log("No course found for this teacher");
      client.close();
      return;
    }
    console.log(
      `Found course: ${course.courseName || course.title} (${course._id})`
    );

    // Check if student is already enrolled
    const isEnrolled =
      course.students &&
      course.students.some(
        (s) => s.studentId && s.studentId.toString() === student._id.toString()
      );

    if (isEnrolled) {
      console.log("Student is already enrolled in this course. Removing...");
      await db.collection("courses").updateOne(
        { _id: course._id },
        {
          $pull: { students: { studentId: student._id } },
          $set: { updatedAt: new Date() },
        }
      );
      console.log("Student removed from enrolled list");
    }

    // Add student to pendingStudents if not already there
    const isPending =
      course.pendingStudents &&
      course.pendingStudents.some(
        (id) => id && id.toString() === student._id.toString()
      );

    if (!isPending) {
      console.log("Adding student to pending list...");
      await db.collection("courses").updateOne(
        { _id: course._id },
        {
          $addToSet: { pendingStudents: student._id },
          $set: { updatedAt: new Date() },
        }
      );
      console.log("Student added to pending list");
    } else {
      console.log("Student is already in the pending list");
    }

    // Fetch updated course
    const updatedCourse = await db
      .collection("courses")
      .findOne({ _id: course._id });
    console.log(
      "Current pending students:",
      updatedCourse.pendingStudents ? updatedCourse.pendingStudents.length : 0
    );
    console.log(
      "Current enrolled students:",
      updatedCourse.students ? updatedCourse.students.length : 0
    );

    // Simulate teacher approval
    console.log("Simulating teacher approval...");
    await db.collection("courses").updateOne(
      { _id: course._id },
      {
        $pull: { pendingStudents: student._id },
        $addToSet: {
          students: {
            studentId: student._id,
            enrolledAt: new Date(),
            status: "active",
            approvedAt: new Date(),
            approvedBy: teacher._id,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    console.log("Teacher approval simulated successfully");

    // Verify the student is now enrolled
    const finalCourse = await db
      .collection("courses")
      .findOne({ _id: course._id });
    console.log(
      "Final pending students:",
      finalCourse.pendingStudents ? finalCourse.pendingStudents.length : 0
    );
    console.log(
      "Final enrolled students:",
      finalCourse.students ? finalCourse.students.length : 0
    );

    const isEnrolledNow =
      finalCourse.students &&
      finalCourse.students.some(
        (s) => s.studentId && s.studentId.toString() === student._id.toString()
      );

    if (isEnrolledNow) {
      console.log("Student is now enrolled in the course");
    } else {
      console.log("Error: Student is not enrolled after approval");
    }

    client.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

testTeacherApproval().then(() => {
  console.log("Done");
});
