const token = localStorage.getItem('token');
if (!token) {
  window.location.href = '/index.html';
}

// DOM elements
const courseList = document.getElementById('courseList');
const approvedCourses = document.getElementById('approvedCourses');
const pendingCourses = document.getElementById('pendingCourses');
const studentNameEl = document.getElementById('studentName');
const overlay = document.getElementById('overlay');
const modal = document.getElementById('courseDetailModal');

// Modal fields
let selectedCourseId = null;
const courseTitle = document.getElementById('courseTitle');
const courseDescription = document.getElementById('courseDescription');
const courseTeacher = document.getElementById('courseTeacher');
const courseDuration = document.getElementById('courseDuration');

// Lấy thông tin học viên
fetch('/users/me', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(user => {
   console.log('User info:', user);
  if (user && user.name) {
    studentNameEl.textContent = `Xin chào, ${user.name}`;
  } else {
    studentNameEl.textContent = 'Xin chào, Học viên';
  }
  })
  .catch(() => {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
  });

// hiển thị tất cả các khóa học có sẵn
fetch('/students/courses', {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(courses => {
    courses.forEach(course => {
  const divAll = createCourseItem(course);
  courseList.appendChild(divAll); // phần tất cả khóa học

  if (course.status === 'approved') {
    const divApproved = createCourseItem(course);
    approvedCourses.appendChild(divApproved);
  } else if (course.status === 'pending') {
    const divPending = createCourseItem(course);
    pendingCourses.appendChild(divPending);
  }
  });
  
  function createCourseItem(course) {
  const div = document.createElement('div');
  div.className = 'course-item';
  div.innerHTML = `
    <strong>${course.title}</strong><br>
    Giảng viên: ${course.teacherName}
  `;
  div.onclick = () => showCourseDetail(course);
  return div;
}


  })
  .catch(err => {
    alert("Lỗi khi tải khóa học");
    console.error(err);
  });

// Hiển thị modal với chi tiết khóa học
function showCourseDetail(course) {
  selectedCourseId = course._id;
  courseTitle.textContent = course.title;
  courseDescription.textContent = course.description;
  courseTeacher.textContent = course.teacherName;
  courseDuration.textContent = course.duration || "Chưa cập nhật";
  modal.style.display = 'block';
  overlay.style.display = 'block';
}

function closeModal() {
  modal.style.display = 'none';
  overlay.style.display = 'none';
  selectedCourseId = null;
}

// Đăng kí khóa học
function registerCourse() {
  if (!selectedCourseId) return;

  fetch(`/students/courses/${selectedCourseId}/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Đăng ký thất bại");
      return res.json();
    })
    .then(data => {
      alert("Đăng ký thành công!");
      closeModal();
    })
    .catch(err => {
      alert("Lỗi: Bạn đã đăng ký hoặc không thể đăng kí khóa học này.");
      console.error(err);
    });
}

//Đăng xuất
function logout() {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}
