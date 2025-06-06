const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/index.html';
}

const teacherNameEl = document.getElementById('teacherName');
const myCoursesEl = document.getElementById('myCourses');
const createCourseForm = document.getElementById('createCourseForm');

// Lấy thông tin giảng viên
fetch('/me', {
  headers: { Authorization: `Bearer ${token}` }
})
.then(res => res.json())
.then(user => {
  teacherNameEl.textContent = user.name;
})
.catch(() => {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
});

// Lấy danh sách khóa học
function loadCourses() {
  fetch('/teachers/courses', {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(courses => {
    myCoursesEl.innerHTML = '';
    if (courses.length === 0) {
      myCoursesEl.innerHTML = '<p>Chưa có khóa học nào.</p>';
      return;
    }

    courses.forEach(course => {
      const div = document.createElement('div');
      div.className = 'course-item';
      div.innerHTML = `
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <p><strong>Số học viên:</strong> ${course.students?.length || 0}</p>
      `;
      myCoursesEl.appendChild(div);
    });
  })
  .catch(err => {
    alert("Lỗi khi tải khóa học.");
    console.error(err);
  });
}
loadCourses();

// Xử lý tạo khóa học
createCourseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;

  fetch('/teachers/courses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ title, description })
  })
  .then(res => res.json())
  .then(data => {
    alert('Tạo khóa học thành công!');
    createCourseForm.reset();
    loadCourses();
  })
  .catch(err => {
    alert("Lỗi khi tạo khóa học.");
    console.error(err);
  });
});

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}
