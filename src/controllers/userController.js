const { ObjectId } = require("mongodb");

// Middleware for checking if the user is either an admin or a teacher
async function isAdminOrTeacher(request, reply) {
  await request.jwtVerify();
  if (request.user.role !== "admin" && request.user.role !== "teacher") {
    return reply
      .code(403)
      .send({ error: "Bạn không có quyền truy cập chức năng này" });
  }
}

async function userController(fastify) {
  const users = await require("../models/userModel")(fastify.mongo.db);

  return {
    register: async (request, reply) => {
      const { name, email, password } = request.body;
      const role = "student";

      if (await users.findByEmail(email)) {
        return reply.code(400).send({ error: "Email đã tồn tại" });
      }

      await users.insertUser({ name, email, password, role });
      reply.send({ success: true });
    },

    login: async (request, reply) => {
      const { email, password } = request.body;
      const user = await users.findByEmail(email);

      if (!user || user.password !== password) {
        return reply
          .code(401)
          .send({ error: "Email hoặc mật khẩu không đúng" });
      }

      const token = fastify.jwt.sign({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      reply.send({
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    },

    getMe: async (request, reply) => {
      const user = await users.findById(new ObjectId(request.user._id));
      if (!user)
        return reply.code(404).send({ error: "Không tìm thấy người dùng" });
      reply.send(user);
    },

    getAllUsers: async (request, reply) => {
      const allUsers = await users.getAllUsers();
      reply.send(allUsers);
    },

    // Cập nhật thông tin cá nhân
    updateProfile: async (request, reply) => {
      try {
        const userId = request.user._id;
        const { fullName, phone, address, dateOfBirth } = request.body;

        const updateData = {};
        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;
        if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

        await users.updateProfile(userId, updateData);

        const updatedUser = await users.findById(new ObjectId(userId));
        reply.send({
          success: true,
          message: "Cập nhật thông tin thành công",
          user: updatedUser,
        });
      } catch (error) {
        reply
          .code(500)
          .send({ error: "Lỗi cập nhật thông tin: " + error.message });
      }
    },

    // Đổi mật khẩu
    changePassword: async (request, reply) => {
      try {
        const userId = request.user._id;
        const { currentPassword, newPassword } = request.body;

        // Kiểm tra mật khẩu hiện tại
        const user = await users.findByEmail(request.user.email);
        if (!user || user.password !== currentPassword) {
          return reply
            .code(400)
            .send({ error: "Mật khẩu hiện tại không đúng" });
        }

        await users.updatePassword(userId, newPassword);
        reply.send({ success: true, message: "Đổi mật khẩu thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi đổi mật khẩu: " + error.message });
      }
    },

    // Tìm kiếm users
    searchUsers: async (request, reply) => {
      try {
        const { q } = request.query;
        if (!q) {
          return reply.code(400).send({ error: "Thiếu từ khóa tìm kiếm" });
        }

        const searchResults = await users.searchUsers(q);
        reply.send(searchResults);
      } catch (error) {
        reply.code(500).send({ error: "Lỗi tìm kiếm: " + error.message });
      }
    },

    // Cập nhật role user
    updateUserRole: async (request, reply) => {
      try {
        const { id } = request.params;
        const { role } = request.body;

        if (!["admin", "teacher", "student"].includes(role)) {
          return reply.code(400).send({ error: "Role không hợp lệ" });
        }

        await users.updateRole(id, role);
        reply.send({ success: true, message: "Cập nhật quyền thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi cập nhật quyền: " + error.message });
      }
    },

    // Xóa user
    deleteUser: async (request, reply) => {
      try {
        const { id } = request.params;
        await users.deleteUser(id);
        reply.send({ success: true, message: "Xóa người dùng thành công" });
      } catch (error) {
        reply.code(500).send({ error: "Lỗi xóa người dùng: " + error.message });
      }
    },
  };
}

module.exports = userController;
module.exports.isAdminOrTeacher = isAdminOrTeacher;
