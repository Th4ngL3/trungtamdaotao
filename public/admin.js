// Check for token and user on page load
let token = null;

window.addEventListener("DOMContentLoaded", () => {
  // Get token from localStorage
  token = localStorage.getItem("token");

  if (!token) {
    console.error("No token found! Redirecting to login...");
    alert("Bạn cần đăng nhập lại để truy cập trang quản trị");
    window.location.href = "/index.html";
    return;
  }

  // Check if user exists in localStorage
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log("User role from localStorage:", user.role);

      // Verify user is admin
      if (user.role !== "admin") {
        alert("Bạn không có quyền truy cập trang quản trị");
        window.location.href = "/index.html";
        return;
      }

      // Initialize page content
      console.log("Admin authenticated, initializing page...");

      // Automatically fetch courses on page load
      setTimeout(() => {
        fetchCourses();
        // Also initialize other content if needed
        // fetchUsers(); // Uncomment if you want to load users automatically
      }, 500);
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
  }
});

async function fetchUsers() {
  const res = await fetch("/admin/users", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const users = await res.json();
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";
  users.forEach((user) => {
    const tr = document.createElement("tr");
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
  document.getElementById("userTable").classList.remove("hidden");
}

function showCreateForm() {
  document.getElementById("createUserForm").classList.toggle("hidden");
}

async function createUser() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const res = await fetch("/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }), // ⚠️ backend cần hỗ trợ role
  });
  const data = await res.json();
  alert(data.success ? "Tạo thành công" : "Thất bại");
  fetchUsers();
}

async function deleteUser(id) {
  if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
  const res = await fetch(`/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await res.json();
  if (result.success) {
    alert("Đã xóa");
    fetchUsers();
  }
}

async function showRoleUpdate(id, currentRole) {
  const newRole = prompt(
    "Nhập vai trò mới (student, teacher, admin):",
    currentRole
  );
  if (!newRole || newRole === currentRole) return;
  const res = await fetch(`/admin/users/${id}/role`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role: newRole }),
  });
  const result = await res.json();
  if (result.success) {
    alert("Cập nhật vai trò thành công");
    fetchUsers();
  }
}

async function fetchCourses() {
  try {
    console.log(
      "Trying to fetch courses with token:",
      token ? `${token.substring(0, 15)}...` : "No token"
    );

    // First try the admin endpoint
    let res = await fetch("/admin/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    // If the admin endpoint fails, try the public endpoint
    if (!res.ok) {
      console.log("Admin courses endpoint failed, trying public endpoint");
      res = await fetch("/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    console.log("Course API response status:", res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Error fetching courses:", errorText);
      alert(`Lỗi khi tải danh sách khóa học: ${res.status} - ${errorText}`);
      return;
    }

    const courses = await res.json();
    console.log("Courses received:", courses);

    const ul = document.getElementById("courseList");
    ul.innerHTML = "";

    if (Array.isArray(courses) && courses.length > 0) {
      courses.forEach((course) => {
        const li = document.createElement("li");
        const courseName =
          course.courseName || course.title || "Không rõ tiêu đề";
        li.innerHTML = `<h3>${courseName}</h3>`;

        // Add more details
        const details = document.createElement("div");
        details.innerHTML = `
          <p><strong>Mô tả:</strong> ${
            course.description || "Không có mô tả"
          }</p>
          <p><strong>Ngày bắt đầu:</strong> ${new Date(
            course.startDate
          ).toLocaleDateString()}</p>
          <p><strong>Ngày kết thúc:</strong> ${new Date(
            course.endDate
          ).toLocaleDateString()}</p>
          <p><strong>Số học viên tối đa:</strong> ${
            course.maxStudents || "Không giới hạn"
          }</p>
          <p><strong>Số học viên đã đăng ký:</strong> ${
            course.students ? course.students.length : 0
          }</p>
        `;
        li.appendChild(details);
        ul.appendChild(li);
      });
    } else {
      ul.innerHTML = "<li>Không có khóa học nào</li>";
    }

    ul.classList.remove("hidden");
  } catch (error) {
    console.error("Error in fetchCourses:", error);
    alert(`Lỗi tải danh sách khóa học: ${error.message}`);
  }
}

// Show upload student list form
function showUploadStudentListForm() {
  document.getElementById("uploadStudentListForm").classList.remove("hidden");
  setupStudentListUploadForm();
}

// Hide upload student list form
function hideUploadStudentListForm() {
  document.getElementById("uploadStudentListForm").classList.add("hidden");
  document.getElementById("studentListUploadForm").reset();
}

// Setup student list upload form
function setupStudentListUploadForm() {
  const form = document.getElementById("studentListUploadForm");
  form.onsubmit = async function (e) {
    e.preventDefault();

    const fileInput = document.getElementById("studentListFile");

    if (!fileInput.files[0]) {
      alert("Vui lòng chọn file");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
      console.log("Uploading file:", fileInput.files[0].name);
      console.log("File type:", fileInput.files[0].type);

      const response = await fetch("/files/upload/student-list", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let result;
      try {
        const textResponse = await response.text();
        console.log("Raw response:", textResponse);
        result = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        alert("Lỗi xử lý phản hồi từ server");
        return;
      }

      if (result.success) {
        alert("Upload file thành công!");
        hideUploadStudentListForm();
        viewUploadedFiles(); // Refresh file list
      } else {
        alert(result.error || "Lỗi upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Lỗi upload file: " + error.message);
    }
  };
}

// View uploaded files
async function viewUploadedFiles() {
  try {
    const response = await fetch("/files/student-lists", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch files");
    }

    const files = await response.json();
    const container = document.getElementById("filesList");
    const uploadedFilesDiv = document.getElementById("uploadedFiles");

    if (files.length === 0) {
      container.innerHTML = "<p>Chưa có file nào được upload.</p>";
    } else {
      container.innerHTML = files
        .map(
          (file) => `
        <div class="file-item">
          <h4>${file.originalName}</h4>
          <p><strong>Mô tả:</strong> ${file.description || "Không có mô tả"}</p>
          <p><strong>Kích thước:</strong> ${formatFileSize(file.fileSize)}</p>
          <p><strong>Upload lúc:</strong> ${new Date(
            file.uploadedAt
          ).toLocaleString()}</p>
          <p><strong>Lượt tải:</strong> ${file.downloadCount || 0}</p>
          <div class="file-actions">
            <button class="btn-download" onclick="downloadFile('${
              file._id
            }')">Tải xuống</button>
            <button class="btn-delete" onclick="deleteFile('${
              file._id
            }')">Xóa</button>
          </div>
        </div>
      `
        )
        .join("");
    }

    uploadedFilesDiv.classList.remove("hidden");
  } catch (error) {
    console.error("Error fetching files:", error);
    alert("Lỗi tải danh sách files");
  }
}

// Download file
async function downloadFile(fileId) {
  try {
    const response = await fetch(`/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "download";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading file:", error);
    alert("Lỗi tải file");
  }
}

// Delete file
async function deleteFile(fileId) {
  if (!confirm("Bạn có chắc muốn xóa file này?")) {
    return;
  }

  try {
    const response = await fetch(`/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (response.ok) {
      alert("Xóa file thành công!");
      viewUploadedFiles(); // Refresh file list
    } else {
      alert(result.error || "Lỗi xóa file");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    alert("Lỗi xóa file");
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
