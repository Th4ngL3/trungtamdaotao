const { ObjectId } = require('mongodb');

async function userModel(db) {
  const users = db.collection('users');

  return {
    findByEmail: (email) => users.findOne({ email }),
    insertUser: (user) => users.insertOne({
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    findById: (id) => users.findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } }),
    getAllUsers: () => users.find({}, { projection: { password: 0 } }).toArray(),
    updateRole: (id, role) => users.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          role,
          updatedAt: new Date()
        }
      }
    ),
    deleteUser: (id) => users.deleteOne({ _id: new ObjectId(id) }),

    // Cập nhật thông tin cá nhân
    updateProfile: (id, profileData) => users.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...profileData,
          updatedAt: new Date()
        }
      }
    ),

    // Đổi mật khẩu
    updatePassword: (id, hashedPassword) => users.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    ),

    // Lấy users theo role
    findByRole: (role) => users.find({ role }, { projection: { password: 0 } }).toArray(),

    // Tìm kiếm users
    searchUsers: (searchTerm) => users.find({
      $or: [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } }
      ]
    }, { projection: { password: 0 } }).toArray()
  };
}

module.exports = userModel;
