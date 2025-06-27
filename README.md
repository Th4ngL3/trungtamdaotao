# Hệ thống Quản lý Trung tâm Đào tạo

## Tính năng chính

### Cho Student (Học viên):

- ✅ Cập nhật thông tin cá nhân
- ✅ Xem khóa học đã đăng ký
- ✅ Xem và nộp bài tập
- ✅ Xem thông báo từ giảng viên
- ✅ Đổi mật khẩu

### Cho Teacher (Giảng viên):

- ✅ Cập nhật thông tin cá nhân
- ✅ Tạo và quản lý khóa học
- ✅ Tạo và quản lý bài tập
- ✅ Đăng thông báo cho học viên
- ✅ Upload tài liệu khóa học
- ✅ Xem danh sách học viên
- ✅ Chấm điểm bài tập
- ✅ Xem file danh sách học viên đã thanh toán

### Cho Admin (Quản trị viên):

- ✅ Quản lý người dùng (tạo, sửa, xóa)
- ✅ Upload file danh sách học viên đã thanh toán (Excel/Word)
- ✅ Quản lý tất cả khóa học
- ✅ Gửi thông báo broadcast

## Cài đặt và Khởi chạy

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình MongoDB

- Khởi động MongoDB từ Laragon Control Panel
- File `.env` đã được cấu hình sẵn:

```
MONGO_URL=mongodb://127.0.0.1:27017/trungtamdaotao
```

### 3. Kiểm tra kết nối MongoDB

```bash
node test-mongo.js
```

### 4. Khởi chạy server

```bash
npm start
# hoặc
node server.js
```

Server sẽ chạy tại: http://localhost:3003

## Tài khoản mặc định

Sau khi chạy `test-mongo.js`, hệ thống sẽ tạo tài khoản admin mặc định:

- **Email:** admin@example.com
- **Password:** admin123

## Cấu trúc API

### Authentication

- `POST /users/register` - Đăng ký
- `POST /users/login` - Đăng nhập
- `GET /users/me` - Thông tin user hiện tại
- `PUT /users/profile` - Cập nhật thông tin cá nhân
- `PUT /users/password` - Đổi mật khẩu

### Courses (Khóa học)

- `GET /courses` - Lấy tất cả khóa học
- `POST /courses` - Tạo khóa học (Teacher)
- `GET /courses/student/my-courses` - Khóa học của student
- `GET /courses/teacher/my-courses` - Khóa học của teacher
- `POST /courses/:id/enroll` - Đăng ký khóa học

### Assignments (Bài tập)

- `POST /assignments` - Tạo bài tập (Teacher)
- `GET /assignments/course/:courseId` - Bài tập theo khóa học
- `POST /assignments/:id/submit` - Nộp bài tập
- `GET /assignments/:id/submissions` - Xem bài nộp (Teacher)

### Notifications (Thông báo)

- `POST /notifications` - Tạo thông báo (Teacher)
- `GET /notifications/my-notifications` - Thông báo của user
- `GET /notifications/unread` - Thông báo chưa đọc
- `POST /notifications/:id/read` - Đánh dấu đã đọc

### Files (Tệp tin)

- `POST /files/upload/student-list` - Upload danh sách học viên (Admin)
- `POST /files/upload/course-material` - Upload tài liệu khóa học (Teacher)
- `POST /files/upload/assignment-submission` - Upload bài nộp (Student)
- `GET /files/:id/download` - Tải file
- `GET /files/student-lists` - Danh sách file học viên (Teacher/Admin)

## Cấu trúc thư mục

```
├── public/                 # Frontend files
│   ├── index.html         # Trang đăng nhập
│   ├── student-home.html  # Trang học viên
│   ├── teacher-home.html  # Trang giảng viên
│   ├── admin.html         # Trang admin
│   └── *.js              # JavaScript files
├── src/
│   ├── controllers/       # API controllers
│   ├── models/           # Database models
│   └── routes/           # API routes
├── uploads/              # Uploaded files
│   ├── student-lists/    # Danh sách học viên
│   ├── course-materials/ # Tài liệu khóa học
│   └── submissions/      # Bài nộp
├── server.js             # Main server file
├── test-mongo.js         # MongoDB connection test
└── package.json          # Dependencies
```

## Sử dụng

1. **Đăng nhập:** Truy cập http://localhost:3003
2. **Admin:** Sử dụng tài khoản admin để quản lý hệ thống
3. **Teacher:** Tạo khóa học, bài tập, đăng thông báo
4. **Student:** Đăng ký khóa học, làm bài tập, xem thông báo

## Lưu ý

- Đảm bảo MongoDB đang chạy trước khi khởi động server
- Files upload sẽ được lưu trong thư mục `uploads/`
- Hệ thống hỗ trợ upload file Excel (.xlsx, .xls) và Word (.docx, .doc)
- JWT token được sử dụng để xác thực
  Email: teacher@example.com
  Password: password123
