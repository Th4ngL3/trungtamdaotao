
// In assignmentController.js, modify the compareTeacherId function

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

// Then in your createAssignment function:
// Replace:
// if (!courseTeacherId || courseTeacherId !== currentTeacherId) {
// With:
if (!courseTeacherId || !compareIds(course.teacherId, teacherId)) {
  console.log('Teacher ownership verification failed');
  return reply.code(403).send({ error: 'Bạn không có quyền tạo bài tập cho khóa học này' });
}
