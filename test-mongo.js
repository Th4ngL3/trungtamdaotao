require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
  const url = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/trungtamdaotao';
  console.log('🔍 Đang thử kết nối MongoDB với URL:', url);

  try {
    const client = new MongoClient(url);
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công!');

    // Test database
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log('📁 Các collection hiện có:', collections.map(c => c.name));

    // Tạo một user admin mẫu nếu chưa có
    const users = db.collection('users');
    const adminExists = await users.findOne({ email: 'admin@example.com' });

    if (!adminExists) {
      await users.insertOne({
        name: 'Admin',
        fullName: 'Quản trị viên',
        email: 'admin@example.com',
        password: 'admin123', // Trong thực tế nên hash password
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('👤 Đã tạo user admin mẫu: admin@example.com / admin123');
    }

    await client.close();
    console.log('🔌 Đã đóng kết nối MongoDB');
    console.log('\n🚀 Bạn có thể khởi chạy server bằng lệnh: node server.js');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    console.log('\n💡 Hướng dẫn khắc phục:');
    console.log('1. Kiểm tra MongoDB có đang chạy không');
    console.log('2. Nếu dùng Laragon, hãy start MongoDB service');
    console.log('3. Kiểm tra URL trong file .env');
    console.log('4. Thử khởi động MongoDB từ Laragon Control Panel');
  }
}

testConnection();
