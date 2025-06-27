
// Create a patch for the authentication middleware
// Add this to your server.js file after the original authenticate decorator

// Enhanced authenticate decorator that ensures proper ID handling
fastify.decorate('authenticateWithIdFix', async function(request, reply) {
  try {
    await request.jwtVerify();
    
    // Ensure the user ID is properly handled
    if (request.user && request.user._id) {
      // If the ID is a string, try to convert it to ObjectId
      if (typeof request.user._id === 'string') {
        try {
          request.user._id = new ObjectId(request.user._id);
          console.log('Converted user ID string to ObjectId');
        } catch (error) {
          console.error('Failed to convert ID to ObjectId:', error);
          // Continue with the string ID if conversion fails
        }
      }
    }
  } catch (err) {
    reply.code(401).send({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
});

// Update the isTeacher decorator to use our enhanced authentication
fastify.decorate('isTeacher', async function(request, reply) {
  await fastify.authenticateWithIdFix(request, reply);
  if (request.user.role !== 'teacher') {
    return reply.code(403).send({ error: 'Bạn không phải giảng viên' });
  }
  
  // Debug information
  console.log('Teacher authenticated with ID:', request.user._id);
  console.log('ID type:', typeof request.user._id);
  console.log('Is ObjectId instance:', request.user._id instanceof ObjectId);
});
