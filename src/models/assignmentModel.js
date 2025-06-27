const { ObjectId } = require("mongodb");

async function assignmentModel(db) {
  const assignments = db.collection("assignments");

  return {
    // Tạo bài tập mới
    createAssignment: (assignment) =>
      assignments.insertOne({
        ...assignment,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),

    // Lấy tất cả bài tập
    getAllAssignments: () => assignments.find().toArray(),

    // Lấy bài tập theo ID
    findById: (id) => assignments.findOne({ _id: new ObjectId(id) }),

    // Lấy bài tập theo khóa học
    findByCourseId: (courseId) =>
      assignments
        .find({
          courseId: new ObjectId(courseId),
        })
        .toArray(),

    // Lấy bài tập theo teacher
    findByTeacherId: (teacherId) =>
      assignments
        .find({
          teacherId: new ObjectId(teacherId),
        })
        .toArray(),

    // Cập nhật bài tập
    updateAssignment: (id, updateData) =>
      assignments.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      ),

    // Xóa bài tập
    deleteAssignment: (id) => assignments.deleteOne({ _id: new ObjectId(id) }),

    // Nộp bài tập (student)
    submitAssignment: (assignmentId, studentId, submissionData) =>
      assignments.updateOne(
        { _id: new ObjectId(assignmentId) },
        {
          $push: {
            submissions: {
              studentId: new ObjectId(studentId),
              ...submissionData,
              submittedAt: new Date(),
            },
          },
          $set: { updatedAt: new Date() },
        }
      ),

    // Lấy bài nộp của student
    getStudentSubmission: async (assignmentId, studentId) => {
      try {
        // Convert to ObjectId if they're strings
        const assignmentObjId =
          typeof assignmentId === "string"
            ? new ObjectId(assignmentId)
            : assignmentId;
        const studentObjId =
          typeof studentId === "string" ? new ObjectId(studentId) : studentId;

        console.log(
          `Getting submission for assignment ${assignmentObjId} by student ${studentObjId}`
        );

        // First try direct match
        const result = await assignments.findOne(
          {
            _id: assignmentObjId,
            "submissions.studentId": studentObjId,
          },
          {
            projection: {
              "submissions.$": 1,
              title: 1,
              description: 1,
              dueDate: 1,
              maxScore: 1,
            },
          }
        );

        if (result) {
          console.log("Found submission with direct match");
          return result;
        }

        // If not found, try with string comparison
        const studentIdStr = studentObjId.toString();

        // Get full assignment first
        const assignment = await assignments.findOne({ _id: assignmentObjId });

        if (!assignment) {
          console.log("Assignment not found");
          return null;
        }

        // Manually filter submissions to find match
        if (assignment.submissions && assignment.submissions.length > 0) {
          const matchingSubmission = assignment.submissions.find(
            (s) =>
              s.studentId &&
              (s.studentId.toString() === studentIdStr ||
                (typeof s.studentId === "string" &&
                  s.studentId === studentIdStr))
          );

          if (matchingSubmission) {
            console.log("Found submission with string comparison");
            return {
              _id: assignment._id,
              title: assignment.title,
              description: assignment.description,
              dueDate: assignment.dueDate,
              maxScore: assignment.maxScore,
              submissions: [matchingSubmission],
            };
          }
        }

        console.log("No submission found");
        return null;
      } catch (error) {
        console.error("Error in getStudentSubmission:", error);
        return null;
      }
    },

    // Lấy tất cả bài nộp của một bài tập
    getAllSubmissions: (assignmentId) =>
      assignments.findOne(
        { _id: new ObjectId(assignmentId) },
        { projection: { submissions: 1, title: 1, description: 1 } }
      ),

    // Chấm điểm bài tập
    gradeSubmission: (assignmentId, studentId, grade, feedback) =>
      assignments.updateOne(
        {
          _id: new ObjectId(assignmentId),
          "submissions.studentId": new ObjectId(studentId),
        },
        {
          $set: {
            "submissions.$.grade": grade,
            "submissions.$.feedback": feedback,
            "submissions.$.gradedAt": new Date(),
            updatedAt: new Date(),
          },
        }
      ),
  };
}

module.exports = assignmentModel;
