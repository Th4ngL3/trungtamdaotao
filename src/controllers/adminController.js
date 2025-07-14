const { ObjectId } = require("mongodb");

module.exports = (fastify) => {
  const db = fastify.mongo.db;
  const users = db.collection("users");
  const courses = db.collection("courses");

  async function verifyAdmin(request, reply) {
    await fastify.authenticate(request, reply);
    if (!request.user || request.user.role !== "admin") {
      return reply.code(403).send({ error: "Chỉ admin mới được phép truy cập" });
    }
  }

  return {
    verifyAdmin,

    async getAllUsers(req, reply) {
      const allUsers = await users.find().toArray();
      reply.send(allUsers);
    },

    async getAllCourses(req, reply) {
      const allCourses = await courses.find().toArray();
      reply.send(allCourses);
    },

    async updateUserRole(req, reply) {
      const { id } = req.params;
      const { role } = req.body;

      if (!["admin", "teacher", "student"].includes(role)) {
        return reply.code(400).send({ error: "Vai trò không hợp lệ" });
      }

      try {
        const result = await users.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );
        reply.send({ success: result.modifiedCount === 1 });
      } catch (err) {
        reply.code(400).send({ error: "ID không hợp lệ" });
      }
    },

    async deleteUser(req, reply) {
      const { id } = req.params;

      try {
        const result = await users.deleteOne({ _id: new ObjectId(id) });
        reply.send({ success: result.deletedCount === 1 });
      } catch (err) {
        reply.code(400).send({ error: "ID không hợp lệ" });
      }
    },
  };
};
