
// Fix for the assignment controller createAssignment function

const { ObjectId } = require("mongodb");

async function assignmentController(fastify) {
  const assignments = await require("../models/assignmentModel")(
    fastify.mongo.db
  );
  const courses = await require("../models/courseModel")(fastify.mongo.db);

  // Helper function to safely compare IDs regardless of type
  function compareIds(id1, id2) {
    // Convert both IDs to strings for comparison
    const str1 = id1 ? (id1 instanceof ObjectId ? id1.toString() : String(id1)) : null;
    const str2 = id2 ? (id2 instanceof ObjectId ? id2.toString() : String(id2)) : null;
    
    console.log('Comparing IDs:');
    console.log('  ID1:', str1, '(type:', typeof id1, ')');
    console.log('  ID2:', str2, '(type:', typeof id2, ')');
    
    return str1 === str2;
  }

  return {
    // Tạo bài tập mới (Teacher)
    createAssignment: async (request, reply) => {
      try {
        console.log("Create assignment called with body:", request.body);
        console.log("User in request:", request.user);

        const teacherId = request.user._id;
        console.log("Teacher ID:", teacherId);
        console.log("Teacher ID type:", typeof teacherId);
        
        let teacherObjectId;
        try {
          // Ensure teacherId is an ObjectId
          teacherObjectId = teacherId instanceof ObjectId 
            ? teacherId 
            : new ObjectId(teacherId);
          console.log("Teacher ObjectId:", teacherObjectId);
        } catch (err) {
          console.error("Error converting teacherId to ObjectId:", err);
          // Continue with original teacherId
          teacherObjectId = teacherId;
        }

        const {
          title,
          description,
          courseId,
          dueDate,
          maxScore,
          instructions,
        } = request.body;

        // Validate required fields
        if (!title || !courseId || !dueDate) {
          console.log("Missing required fields");
          return reply.code(400).send({
            error: "Thiếu thông tin bắt buộc: title, courseId, dueDate",
          });
        }

        // Ensure courseId is properly formatted as ObjectId
        let courseObjectId;
        try {
          courseObjectId = new ObjectId(courseId);
          console.log("Converted courseId to ObjectId:", courseObjectId);
        } catch (err) {
          console.error("Invalid course ID format:", courseId);
          return reply.code(400).send({ error: "Mã khóa học không hợp lệ" });
        }

        console.log("Looking up course:", courseObjectId);
        // Kiểm tra khóa học tồn tại
        const course = await courses.findById(courseObjectId);
        if (!course) {
          console.log("Course not found:", courseObjectId);
          return reply.code(404).send({ error: "Không tìm thấy khóa học" });
        }

        console.log("Course found:", course._id);
        console.log("Course full object:", JSON.stringify(course, null, 2));

        // FIXED: Use the compareIds helper function for proper ID comparison
        if (!course.teacherId || !compareIds(course.teacherId, teacherObjectId)) {
          console.log("Teacher ownership verification failed");
          return reply
            .code(403)
            .send({ error: "Bạn không có quyền tạo bài tập cho khóa học này" });
        }

        console.log("Teacher ownership verified. Creating assignment...");

        const assignmentData = {
          title,
          description: description || "",
          courseId: courseObjectId,
          teacherId: teacherObjectId,
          dueDate: new Date(dueDate),
          maxScore: maxScore || 100,
          instructions: instructions || "",
          submissions: [],
          isActive: true,
        };

        console.log("Creating assignment with data:", {
          title: assignmentData.title,
          courseId: assignmentData.courseId,
          dueDate: assignmentData.dueDate,
        });

        const result = await assignments.createAssignment(assignmentData);
        console.log("Assignment created with ID:", result.insertedId);

        reply.send({
          success: true,
          message: "Tạo bài tập thành công",
          assignmentId: result.insertedId,
        });
      } catch (error) {
        console.error("Error creating assignment:", error);
        reply.code(500).send({ error: "Lỗi tạo bài tập: " + error.message });
      }
    },

    // Other methods...
  };
}

module.exports = assignmentController;
