const token = localStorage.getItem('token'); // Token phải lưu sau khi admin đăng nhập

async function fetchUsers() {
  const res = await fetch('/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await res.json();
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';
  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>
        <button onclick="deleteUser('${user._id}')">Xóa</button>
        <button onclick="showRoleUpdate('${user._id}', '${user.role}')">Sửa vai trò</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('userTable').classList.remove('hidden');
}

function showCreateForm() {
  document.getElementById('createUserForm').classList.toggle('hidden');
}

async function createUser() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const res = await fetch('/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })  // ⚠️ backend cần hỗ trợ role
  });
  const data = await res.json();
  alert(data.success ? 'Tạo thành công' : 'Thất bại');
  fetchUsers();
}

async function deleteUser(id) {
  if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
  const res = await fetch(`/admin/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const result = await res.json();
  if (result.success) {
    alert('Đã xóa');
    fetchUsers();
  }
}

async function showRoleUpdate(id, currentRole) {
  const newRole = prompt('Nhập vai trò mới (student, teacher, admin):', currentRole);
  if (!newRole || newRole === currentRole) return;
  const res = await fetch(`/admin/users/${id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ role: newRole })
  });
  const result = await res.json();
  if (result.success) {
    alert('Cập nhật vai trò thành công');
    fetchUsers();
  }
}

async function fetchCourses() {
  const res = await fetch('/admin/courses', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const courses = await res.json();
  const ul = document.getElementById('courseList');
  ul.innerHTML = '';
  courses.forEach(course => {
    const li = document.createElement('li');
    li.textContent = course.title || 'Không rõ tiêu đề';
    ul.appendChild(li);
  });
  ul.classList.remove('hidden');
}
