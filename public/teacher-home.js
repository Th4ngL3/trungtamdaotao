const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/index.html";
}

// Global variables
let currentUser = null;
let currentTab = "courses";
let socket = null; // WebSocket connection
let pendingStudentsTotal = 0; // Track total pending students

// DOM elements
const teacherNameEl = document.getElementById("teacherName");
const myCoursesEl = document.getElementById("myCourses");
const studentListFilesEl = document.getElementById("studentListFiles");
const createCourseForm = document.getElementById("createCourseForm");

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Load user info
  loadUserInfo().then(() => {
    // Initialize WebSocket connection after user is loaded
    initializeWebSocket();
  });

  // Set up event listeners for forms
  setupProfileForm();
  setupPasswordForm();

  // Show default tab
  showTab("courses");
});

// Load user info
async function loadUserInfo() {
  try {
    const response = await fetch("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to load user info");

    currentUser = await response.json();
    teacherNameEl.textContent =
      currentUser.fullName || currentUser.name || "Giảng viên";

    // Load pending enrollments count
    loadPendingEnrollmentsCount();

    // If on profile tab, fill in the profile form
    if (currentTab === "profile") {
      fillProfileForm();
    }
  } catch (error) {
    console.error("Error loading user info:", error);
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  }
}

// Load pending enrollments count
async function loadPendingEnrollmentsCount() {
  try {
    const response = await fetch("/teachers/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return;

    const courses = await response.json();
    pendingStudentsTotal = 0;

    // Process each course to get pending students
    await Promise.all(
      courses.map(async (course) => {
        try {
          const studentRes = await fetch(
            `/teachers/courses/${course._id}/students`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (studentRes.ok) {
            const studentData = await studentRes.json();
            if (studentData.pendingStudents) {
              pendingStudentsTotal += studentData.pendingStudents.length;
            }
          }
        } catch (err) {
          console.error(
            `Error fetching students for course ${course._id}:`,
            err
          );
        }
      })
    );

    // Update the UI
    updatePendingEnrollmentsUI();
  } catch (error) {
    console.error("Error loading pending enrollments count:", error);
  }
}

// Update UI with pending enrollments count
function updatePendingEnrollmentsUI() {
  // Find the header div
  const headerDiv = document.querySelector("header > div");

  // Check if pending counter already exists
  let pendingCounter = document.getElementById("pendingEnrollmentsCounter");

  if (pendingStudentsTotal > 0) {
    if (!pendingCounter) {
      // Create counter element if it doesn't exist
      pendingCounter = document.createElement("button");
      pendingCounter.id = "pendingEnrollmentsCounter";
      pendingCounter.className = "btn";
      pendingCounter.style.backgroundColor = "#e74c3c";
      pendingCounter.style.color = "white";
      pendingCounter.style.marginRight = "10px";
      pendingCounter.style.position = "relative";
      pendingCounter.style.overflow = "hidden";
      pendingCounter.onclick = () => showTab("courses");

      // Insert at the beginning of the header div
      headerDiv.insertBefore(pendingCounter, headerDiv.firstChild);
    }

    // Update counter content
    pendingCounter.innerHTML = `
      <i class="fas fa-user-clock"></i> ${pendingStudentsTotal} học viên chờ duyệt
      ${
        pendingStudentsTotal > 0
          ? '<span style="display:inline-block;width:8px;height:8px;background:#fff;border-radius:50%;position:absolute;top:5px;right:5px;animation:blink 1s infinite;"></span>'
          : ""
      }
    `;

    // Add blink animation style if not already added
    if (!document.getElementById("blinkAnimation")) {
      const style = document.createElement("style");
      style.id = "blinkAnimation";
      style.textContent = `
        @keyframes blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  } else if (pendingCounter) {
    // Remove counter if no pending enrollments
    pendingCounter.remove();
  }
}

// Show tab content
function showTab(tabName) {
  currentTab = tabName;

  // Hide all tab panes
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.remove("active");
  });

  // Show the selected tab pane
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // Update active state for tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick").includes(`'${tabName}'`)) {
      btn.classList.add("active");
    }
  });

  // Load content based on tab
  switch (tabName) {
    case "courses":
      loadCourses();
      break;
    case "materials":
      loadMaterials();
      break;
    case "assignments":
      loadAssignments();
      break;
    case "notifications":
      loadNotifications();
      break;
    case "profile":
      fillProfileForm();
      break;
    case "studentLists":
      loadStudentLists();
      break;
  }
}

// Load courses
async function loadCourses() {
  try {
    console.log("Đang tải khóa học của giáo viên...");

    const response = await fetch("/teachers/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API response error:", errorText);
      throw new Error(
        `Failed to load courses: ${response.status} ${errorText}`
      );
    }

    const courses = await response.json();
    console.log("Loaded courses:", courses);

    const container = document.getElementById("myCourses");

    if (!courses || courses.length === 0) {
      container.innerHTML = "<p>Bạn chưa có khóa học nào.</p>";
      return;
    }

    // Process each course to add pending students counts
    console.log("Getting student details for each course...");
    const coursesWithDetails = await Promise.all(
      courses.map(async (course) => {
        try {
          console.log(
            `Fetching students for course ${course._id} (${
              course.title || course.courseName
            })...`
          );
          const studentRes = await fetch(
            `/teachers/courses/${course._id}/students`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log(
            `Student API response for course ${course._id}:`,
            studentRes.status
          );

          if (studentRes.ok) {
            const studentData = await studentRes.json();
            console.log(`Student data for course ${course._id}:`, studentData);
            course.pendingCount = studentData.pendingStudents
              ? studentData.pendingStudents.length
              : 0;
            course.approvedCount = studentData.approvedStudents
              ? studentData.approvedStudents.length
              : 0;
            console.log(
              `Course ${course._id} has ${course.pendingCount} pending and ${course.approvedCount} approved students`
            );
          } else {
            course.pendingCount = 0;
            course.approvedCount = 0;
            console.error(`Failed to get students for course ${course._id}`);
          }

          // As a fallback, also check the course's students array directly
          if (
            !course.approvedCount &&
            course.students &&
            Array.isArray(course.students)
          ) {
            course.approvedCount = course.students.length;
            console.log(
              `Using fallback count: ${course.approvedCount} students from course.students array`
            );
          }
        } catch (err) {
          console.error(
            `Error fetching students for course ${course._id}:`,
            err
          );
          course.pendingCount = 0;
          course.approvedCount = 0;

          // As a fallback, also check the course's students array directly
          if (course.students && Array.isArray(course.students)) {
            course.approvedCount = course.students.length;
            console.log(
              `Using fallback count after error: ${course.approvedCount} students from course.students array`
            );
          }
        }
        return course;
      })
    );

    console.log("Courses with student counts:", coursesWithDetails);

    container.innerHTML = coursesWithDetails
      .map(
        (course) => `
      <div class="course-item" data-id="${course._id}">
        <h3>${course.title || course.courseName || "Khóa học không tên"}</h3>
        
        <div style="margin-bottom: 10px; display: flex; gap: 10px;">
          ${
            course.pendingCount > 0
              ? `<div style="display: inline-block; background-color: #ff7675; color: white; padding: 5px 10px; border-radius: 20px; font-weight: bold; font-size: 13px;">
                <i class="fas fa-user-clock"></i> ${course.pendingCount} học viên chờ duyệt
              </div>`
              : ""
          }
          <div style="display: inline-block; background-color: #55efc4; color: #333; padding: 5px 10px; border-radius: 20px; font-size: 13px;">
            <i class="fas fa-user-check"></i> ${
              course.approvedCount
            } học viên đã duyệt
          </div>
        </div>

        <p>${course.description || ""}</p>
        <p><strong>Thời gian:</strong> 
          ${
            course.startDate
              ? new Date(course.startDate).toLocaleDateString()
              : "N/A"
          } - 
          ${
            course.endDate
              ? new Date(course.endDate).toLocaleDateString()
              : "N/A"
          }
        </p>
        ${
          course.schedule
            ? `
          <p><strong>Lịch học:</strong></p>
          <ul>
            ${
              Array.isArray(course.schedule)
                ? course.schedule
                    .map(
                      (s) =>
                        `<li>${
                          typeof s === "object" ? `${s.day}: ${s.time}` : s
                        }</li>`
                    )
                    .join("")
                : ""
            }
          </ul>
        `
            : ""
        }
        ${
          course.meetLink
            ? `
          <p><strong>Link Meet:</strong> 
            <a href="${course.meetLink}" target="_blank">${course.meetLink}</a>
          </p>
        `
            : ""
        }
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="viewStudents('${
            course._id
          }')">
            Xem học viên
          </button>
          ${
            course.pendingCount > 0
              ? `<button class="btn" style="background-color: #ff7675; color: white;" onclick="viewStudents('${course._id}')">
                <i class="fas fa-user-check"></i> Duyệt học viên
              </button>`
              : ""
          }
          <button class="btn btn-secondary" onclick="editCourse('${
            course._id
          }')">
            <i class="fas fa-edit"></i> Chỉnh sửa
          </button>
        </div>
        <div id="students-${course._id}" style="margin-top:10px;"></div>
      </div>
    `
      )
      .join("");

    console.log("Course HTML rendered");
  } catch (error) {
    console.error("Error loading courses:", error);
    document.getElementById(
      "myCourses"
    ).innerHTML = `<p>Lỗi tải khóa học: ${error.message}</p>`;
  }
}

// Load student payment lists
async function loadStudentLists() {
  try {
    const response = await fetch("/files/student-lists", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to load student lists");

    const files = await response.json();

    if (files.length === 0) {
      studentListFilesEl.innerHTML =
        "<p>Chưa có file danh sách học viên nào được upload.</p>";
      return;
    }

    studentListFilesEl.innerHTML = files
      .map(
        (file) => `
      <div class="file-item">
        <div class="item-header">
          <h4>${file.originalName}</h4>
          <span>${new Date(file.uploadedAt).toLocaleString()}</span>
        </div>
        <p>${file.description || "Không có mô tả"}</p>
        <div class="item-actions">
          <button class="btn btn-primary" onclick="downloadStudentList('${
            file._id
          }')">Tải xuống</button>
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading student lists:", error);
    studentListFilesEl.innerHTML = "<p>Lỗi tải danh sách học viên.</p>";
  }
}

// Fill profile form
function fillProfileForm() {
  if (!currentUser) return;

  document.getElementById("fullName").value =
    currentUser.fullName || currentUser.name || "";
  document.getElementById("email").value = currentUser.email || "";
  document.getElementById("phone").value = currentUser.phone || "";
  document.getElementById("address").value = currentUser.address || "";

  if (currentUser.dateOfBirth) {
    const date = new Date(currentUser.dateOfBirth);
    document.getElementById("dateOfBirth").value = date
      .toISOString()
      .split("T")[0];
  }
}

// Setup profile form
function setupProfileForm() {
  document
    .getElementById("profileForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = {
        fullName: document.getElementById("fullName").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        dateOfBirth: document.getElementById("dateOfBirth").value,
      };

      try {
        const response = await fetch("/users/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          alert("Cập nhật thông tin thành công!");
          currentUser = result.user;
          teacherNameEl.textContent =
            currentUser.fullName || currentUser.name || "Giảng viên";
        } else {
          alert(result.error || "Lỗi cập nhật thông tin");
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Lỗi cập nhật thông tin");
      }
    });
}

// Setup password form
function setupPasswordForm() {
  document
    .getElementById("passwordForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        alert("Mật khẩu mới và xác nhận mật khẩu không khớp");
        return;
      }

      try {
        const response = await fetch("/users/password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          alert("Đổi mật khẩu thành công!");
          document.getElementById("passwordForm").reset();
        } else {
          alert(result.error || "Lỗi đổi mật khẩu");
        }
      } catch (error) {
        console.error("Error changing password:", error);
        alert("Lỗi đổi mật khẩu");
      }
    });
}

// Hàm chung để tải xuống file với xử lý lỗi tốt hơn
async function downloadFileSecure(fileId, fileType) {
  try {
    // Lấy token mới nhất để đảm bảo không hết hạn
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      window.location.href = "/index.html";
      return;
    }

    // Kiểm tra token có hợp lệ không bằng cách gọi API me
    try {
      const checkResponse = await fetch("/users/me", {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      if (!checkResponse.ok) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem("token");
        window.location.href = "/index.html";
        return;
      }

      // Lấy thông tin người dùng để xác nhận token hợp lệ
      const userData = await checkResponse.json();
      console.log(`Xác thực người dùng thành công: ${userData.email}`);
    } catch (authError) {
      console.error("Lỗi xác thực:", authError);
      alert("Không thể xác thực phiên làm việc. Vui lòng đăng nhập lại.");
      localStorage.removeItem("token");
      window.location.href = "/index.html";
      return;
    }

    // Thêm timestamp để tránh cache
    const timestamp = new Date().getTime();

    console.log(`Tải xuống file ${fileType} với ID: ${fileId}`);

    // Tạo một thẻ a tạm thời để tải xuống
    const downloadLink = document.createElement("a");
    downloadLink.href = `/files/${fileId}/download?token=${currentToken}&_t=${timestamp}`;
    downloadLink.target = "_blank"; // Mở trong tab mới
    downloadLink.download = ""; // Để trình duyệt tự xác định tên file

    // Thêm vào DOM, click và sau đó xóa
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Thông báo thành công
    console.log(`Đã bắt đầu tải xuống file ${fileType}`);
  } catch (error) {
    console.error(`Lỗi tải xuống ${fileType}:`, error);
    alert(`Lỗi tải xuống ${fileType}: ${error.message}`);
  }
}

// Download student list
async function downloadStudentList(fileId) {
  return downloadFileSecure(fileId, "danh sách học viên");
}

// Download file
async function downloadFile(fileId) {
  return downloadFileSecure(fileId, "tài liệu dạy học");
}

// Show profile function to be called from the header button
function showProfile() {
  showTab("profile");
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/index.html";
}

// Placeholder functions for other tabs
async function loadMaterials() {
  try {
    // Set up the materials tab content
    const container = document.getElementById("materialsList");

    // Add file upload button and materials list
    container.innerHTML = "<div id='materials-content'></div>";

    // Load course materials
    await loadCourseMaterials();
  } catch (error) {
    console.error("Error loading materials:", error);
    document.getElementById(
      "materialsList"
    ).innerHTML = `<p>Lỗi tải tài liệu: ${error.message}</p>`;
  }
}

// Function to show the upload material form
function showUploadMaterialForm() {
  // First populate the course dropdown
  populateCoursesForMaterials();

  // Show the upload modal
  document.getElementById("uploadFileModal").style.display = "block";

  // Set up form submission
  const form = document.getElementById("uploadFileForm");
  form.onsubmit = handleMaterialUpload;
}

// Populate courses dropdown for material uploads
async function populateCoursesForMaterials() {
  try {
    const response = await fetch("/teachers/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch courses");

    const courses = await response.json();
    const dropdown = document.getElementById("fileCourse");

    if (courses && courses.length > 0) {
      dropdown.innerHTML = courses
        .map(
          (course) =>
            `<option value="${course._id}">${
              course.title || course.courseName || "Khóa học không tên"
            }</option>`
        )
        .join("");
    } else {
      dropdown.innerHTML = "<option value=''>Không có khóa học nào</option>";
    }
  } catch (error) {
    console.error("Error loading courses for dropdown:", error);
  }
}

// Handle material upload submission
async function handleMaterialUpload(e) {
  e.preventDefault();

  try {
    const courseId = document.getElementById("fileCourse").value;
    const fileInput = document.getElementById("fileInput");
    const description = document.getElementById("fileDescription").value;

    if (!courseId) {
      alert("Vui lòng chọn khóa học");
      return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
      alert("Vui lòng chọn file để upload");
      return;
    }

    console.log(`Uploading file for course: ${courseId}`);
    console.log(`Description: ${description}`);
    console.log(`File name: ${fileInput.files[0].name}`);

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `/files/upload/course-material?courseId=${courseId}&description=${encodeURIComponent(
        description
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    console.log("Upload response status:", response.status);

    if (!response.ok) {
      let errorMessage = "Failed to upload material";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log("Upload result:", result);

    alert("Tải lên tài liệu thành công!");
    closeModal("uploadFileModal");
    document.getElementById("uploadFileForm").reset();

    // Reload materials list
    loadCourseMaterials();
  } catch (error) {
    console.error("Error uploading material:", error);
    alert(`Lỗi tải lên tài liệu: ${error.message}`);
  }
}

// Load course materials for the teacher
async function loadCourseMaterials() {
  try {
    // Get teacher's courses
    const coursesResponse = await fetch("/teachers/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!coursesResponse.ok) throw new Error("Failed to load courses");
    const courses = await coursesResponse.json();

    if (courses.length === 0) {
      document.getElementById("materials-content").innerHTML =
        "<p>Bạn chưa có khóa học nào.</p>";
      return;
    }

    // Container for all materials
    let allMaterialsHTML = "";

    // For each course, get materials
    for (const course of courses) {
      try {
        const materialsResponse = await fetch(
          `/files/course/${course._id}/materials`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (materialsResponse.ok) {
          const materials = await materialsResponse.json();

          if (materials && materials.length > 0) {
            // Add course title and materials
            allMaterialsHTML += `
              <div class="course-materials">
                <h3>${
                  course.title || course.courseName || "Khóa học không tên"
                }</h3>
                <div class="materials-list">
                  ${materials
                    .map(
                      (material) => `
                    <div class="file-item">
                      <div class="item-header">
                        <h4>${material.originalName}</h4>
                        <span>${new Date(
                          material.uploadedAt
                        ).toLocaleString()}</span>
                      </div>
                      <p>${material.description || "Không có mô tả"}</p>
                      <div class="item-actions">
                        <button class="btn btn-primary" onclick="downloadFile('${
                          material._id
                        }')">Tải xuống</button>
                        <button class="btn btn-danger" onclick="deleteFile('${
                          material._id
                        }')">Xóa</button>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error(
          `Error loading materials for course ${course._id}:`,
          error
        );
      }
    }

    // Update the materials container
    if (allMaterialsHTML) {
      document.getElementById("materials-content").innerHTML = allMaterialsHTML;
    } else {
      document.getElementById("materials-content").innerHTML =
        "<p>Chưa có tài liệu nào cho các khóa học của bạn.</p>";
    }
  } catch (error) {
    console.error("Error loading course materials:", error);
    document.getElementById(
      "materials-content"
    ).innerHTML = `<p>Lỗi tải tài liệu: ${error.message}</p>`;
  }
}

// Delete a file
async function deleteFile(fileId) {
  if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;

  try {
    const response = await fetch(`/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete file");
    }

    alert("Xóa tài liệu thành công!");
    loadCourseMaterials();
  } catch (error) {
    console.error("Error deleting file:", error);
    alert(`Lỗi xóa tài liệu: ${error.message}`);
  }
}

// Load assignments
async function loadAssignments() {
  try {
    const container = document.getElementById("assignments-tab");
    container.innerHTML = `
      <div class="file-actions">
        <button class="btn btn-primary" onclick="showCreateAssignmentModal()">Thêm bài tập mới</button>
      </div>
      <div id="assignmentsList"></div>

      <!-- Modal tạo bài tập -->
      <div id="createAssignmentModal" class="modal">
        <div class="modal-content">
          <h3>Tạo bài tập mới</h3>
          <form id="createAssignmentForm" onsubmit="createAssignment(event)">
            <div class="form-group">
              <label for="assignmentTitle">Tên bài tập</label>
              <input type="text" class="form-control" id="assignmentTitle" required>
            </div>
            <div class="form-group">
              <label for="assignmentDescription">Mô tả bài tập</label>
              <textarea class="form-control" id="assignmentDescription" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="assignmentCourse">Khóa học</label>
              <select class="form-control" id="assignmentCourse" required></select>
            </div>
            <div class="form-group">
              <label for="assignmentDueDate">Hạn nộp bài</label>
              <input type="datetime-local" class="form-control" id="assignmentDueDate" required>
            </div>
            <div class="form-group">
              <label for="assignmentMaxScore">Điểm tối đa</label>
              <input type="number" class="form-control" id="assignmentMaxScore" min="1" value="100">
            </div>
            <div class="form-group">
              <label for="assignmentInstructions">Hướng dẫn chi tiết</label>
              <textarea class="form-control" id="assignmentInstructions" rows="5"></textarea>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <button type="button" class="btn btn-danger" onclick="closeModal('createAssignmentModal')">Hủy</button>
              <button type="submit" class="btn btn-primary">Tạo bài tập</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal chỉnh sửa bài tập -->
      <div id="editAssignmentModal" class="modal">
        <div class="modal-content">
          <h3>Chỉnh sửa bài tập</h3>
          <form id="editAssignmentForm" onsubmit="updateAssignment(event)">
            <input type="hidden" id="editAssignmentId">
            <div class="form-group">
              <label for="editAssignmentTitle">Tên bài tập</label>
              <input type="text" class="form-control" id="editAssignmentTitle" required>
            </div>
            <div class="form-group">
              <label for="editAssignmentDescription">Mô tả bài tập</label>
              <textarea class="form-control" id="editAssignmentDescription" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label for="editAssignmentDueDate">Hạn nộp bài</label>
              <input type="datetime-local" class="form-control" id="editAssignmentDueDate" required>
            </div>
            <div class="form-group">
              <label for="editAssignmentMaxScore">Điểm tối đa</label>
              <input type="number" class="form-control" id="editAssignmentMaxScore" min="1">
            </div>
            <div class="form-group">
              <label for="editAssignmentInstructions">Hướng dẫn chi tiết</label>
              <textarea class="form-control" id="editAssignmentInstructions" rows="5"></textarea>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <button type="button" class="btn btn-danger" onclick="closeModal('editAssignmentModal')">Hủy</button>
              <button type="submit" class="btn btn-primary">Cập nhật</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal xem bài nộp -->
      <div id="viewSubmissionsModal" class="modal">
        <div class="modal-content" style="max-width: 700px;">
          <h3>Các bài đã nộp</h3>
          <div id="submissionsList"></div>
          <button class="btn btn-secondary" onclick="closeModal('viewSubmissionsModal')">Đóng</button>
        </div>
      </div>
    `;

    await populateCoursesDropdown();
    await loadTeacherAssignments();
  } catch (error) {
    console.error("Error setting up assignments tab:", error);
    document.getElementById(
      "assignments-tab"
    ).innerHTML = `<p>Lỗi tải bài tập: ${error.message}</p>`;
  }
}

// Populate courses dropdown for assignment creation
async function populateCoursesDropdown() {
  try {
    const response = await fetch("/teachers/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch courses");

    const courses = await response.json();
    const dropdown = document.getElementById("assignmentCourse");

    if (courses && courses.length > 0) {
      dropdown.innerHTML = courses
        .map(
          (course) =>
            `<option value="${course._id}">${
              course.title || course.courseName || "Khóa học không tên"
            }</option>`
        )
        .join("");
    } else {
      dropdown.innerHTML = "<option value=''>Không có khóa học nào</option>";
    }
  } catch (error) {
    console.error("Error loading courses for dropdown:", error);
  }
}

// Load teacher's assignments
async function loadTeacherAssignments() {
  try {
    const response = await fetch("/assignments/teacher/my-assignments", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to load assignments");

    const assignments = await response.json();
    const container = document.getElementById("assignmentsList");

    if (!assignments || assignments.length === 0) {
      container.innerHTML = "<p>Bạn chưa tạo bài tập nào.</p>";
      return;
    }

    container.innerHTML = assignments
      .map(
        (assignment) => `
      <div class="assignment-item">
        <div class="item-header">
          <h4>${assignment.title}</h4>
          <div class="item-actions">
            <button class="btn btn-info" onclick="viewAssignmentSubmissions('${
              assignment._id
            }')">Xem bài nộp</button>
            <button class="btn btn-primary" onclick="editAssignment('${
              assignment._id
            }')">Sửa</button>
            <button class="btn btn-danger" onclick="deleteAssignment('${
              assignment._id
            }')">Xóa</button>
          </div>
        </div>
        <p>${assignment.description || ""}</p>
        <div>
          <strong>Khóa học:</strong> ${assignment.courseName || "N/A"}
        </div>
        <div>
          <strong>Hạn nộp:</strong> ${new Date(
            assignment.dueDate
          ).toLocaleString()}
        </div>
        <div>
          <strong>Điểm tối đa:</strong> ${assignment.maxScore || 100}
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading assignments:", error);
    document.getElementById(
      "assignmentsList"
    ).innerHTML = `<p>Lỗi tải bài tập: ${error.message}</p>`;
  }
}

// Show create assignment modal
function showCreateAssignmentModal() {
  // Reset form
  document.getElementById("createAssignmentForm").reset();

  // Set default due date to 1 week from now
  const oneWeekLater = new Date();
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  // Format for datetime-local input
  const formattedDate = oneWeekLater.toISOString().slice(0, 16);
  document.getElementById("assignmentDueDate").value = formattedDate;

  // Show modal
  document.getElementById("createAssignmentModal").style.display = "block";
}

// Create assignment
async function createAssignment(e) {
  e.preventDefault();

  try {
    const courseId = document.getElementById("assignmentCourse").value;
    const title = document.getElementById("assignmentTitle").value;
    const description = document.getElementById("assignmentDescription").value;
    const dueDate = document.getElementById("assignmentDueDate").value;
    const maxScore =
      parseInt(document.getElementById("assignmentMaxScore").value) || 100;
    const instructions = document.getElementById(
      "assignmentInstructions"
    ).value;

    // Validate required fields
    if (!courseId) {
      alert("Vui lòng chọn khóa học");
      return;
    }

    if (!title) {
      alert("Vui lòng nhập tiêu đề bài tập");
      return;
    }

    if (!dueDate) {
      alert("Vui lòng chọn hạn nộp bài");
      return;
    }

    console.log("Creating assignment:", {
      courseId,
      title,
      description,
      dueDate,
      maxScore,
      instructions,
    });

    const assignmentData = {
      title,
      description,
      courseId,
      dueDate,
      maxScore,
      instructions,
    };

    const response = await fetch("/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(assignmentData),
    });

    console.log("Assignment creation response status:", response.status);

    let responseData;
    try {
      responseData = await response.json();
      console.log("Response data:", responseData);
    } catch (jsonError) {
      console.error("Error parsing response JSON:", jsonError);
      throw new Error("Server returned an invalid response");
    }

    if (!response.ok) {
      throw new Error(responseData.error || "Lỗi tạo bài tập");
    }

    alert("Tạo bài tập thành công!");
    // Close modal and reload assignments
    closeModal("createAssignmentModal");
    loadTeacherAssignments();
  } catch (error) {
    console.error("Error creating assignment:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Edit assignment
async function editAssignment(assignmentId) {
  try {
    const response = await fetch(`/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to load assignment details");

    const assignment = await response.json();

    // Populate form
    document.getElementById("editAssignmentId").value = assignmentId;
    document.getElementById("editAssignmentTitle").value = assignment.title;
    document.getElementById("editAssignmentDescription").value =
      assignment.description || "";

    // Format date for datetime-local input
    const dueDate = new Date(assignment.dueDate);
    const formattedDate = dueDate.toISOString().slice(0, 16);
    document.getElementById("editAssignmentDueDate").value = formattedDate;

    document.getElementById("editAssignmentMaxScore").value =
      assignment.maxScore || 100;
    document.getElementById("editAssignmentInstructions").value =
      assignment.instructions || "";

    // Show modal
    document.getElementById("editAssignmentModal").style.display = "block";
  } catch (error) {
    console.error("Error loading assignment details:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Update assignment
async function updateAssignment(e) {
  e.preventDefault();

  try {
    const assignmentId = document.getElementById("editAssignmentId").value;

    const assignmentData = {
      title: document.getElementById("editAssignmentTitle").value,
      description: document.getElementById("editAssignmentDescription").value,
      dueDate: document.getElementById("editAssignmentDueDate").value,
      maxScore:
        parseInt(document.getElementById("editAssignmentMaxScore").value) ||
        100,
      instructions: document.getElementById("editAssignmentInstructions").value,
    };

    const response = await fetch(`/assignments/${assignmentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(assignmentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Lỗi cập nhật bài tập");
    }

    // Close modal and reload assignments
    closeModal("editAssignmentModal");
    loadTeacherAssignments();
  } catch (error) {
    console.error("Error updating assignment:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// Delete assignment
async function deleteAssignment(assignmentId) {
  if (!confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;

  try {
    const response = await fetch(`/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Lỗi xóa bài tập");
    }

    // Reload assignments
    loadTeacherAssignments();
  } catch (error) {
    console.error("Error deleting assignment:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

// View submissions for an assignment
async function viewAssignmentSubmissions(assignmentId) {
  try {
    console.log(`Loading submissions for assignment: ${assignmentId}`);
    const response = await fetch(`/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load submissions");
    }

    // Lấy dữ liệu phản hồi
    const result = await response.json();
    console.log("Submission response:", result);

    // Chuẩn bị modal để hiển thị kết quả
    document.getElementById("viewSubmissionsModal").style.display = "block";
    const container = document.getElementById("submissionsList");

    // Kiểm tra cấu trúc dữ liệu
    if (!result || !result.submissions || result.submissions.length === 0) {
      container.innerHTML = "<p>Chưa có học viên nào nộp bài.</p>";
      return;
    }

    const submissions = result.submissions;
    console.log(`Found ${submissions.length} submissions`);

    // Truy vấn thông tin tên học viên cho mỗi bài nộp
    const studentInfo = {};
    try {
      for (const submission of submissions) {
        if (submission.studentId && !studentInfo[submission.studentId]) {
          const studentResponse = await fetch(
            `/students/${submission.studentId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ).catch((err) =>
            console.error(
              `Error fetching student ${submission.studentId}:`,
              err
            )
          );

          if (studentResponse && studentResponse.ok) {
            const student = await studentResponse.json();
            studentInfo[submission.studentId] =
              student.name || student.fullName || "Học viên không xác định";
          } else {
            studentInfo[submission.studentId] = "Học viên không xác định";
          }
        }
      }
    } catch (studentErr) {
      console.warn("Error fetching student info:", studentErr);
    }

    // Hiển thị danh sách bài nộp
    container.innerHTML = submissions
      .map((sub) => {
        const studentName =
          studentInfo[sub.studentId] || "Học viên không xác định";
        return `
            <div class="submission-item" style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
              <h5>Học viên: ${studentName}</h5>
              <p>${sub.content || "Không có nội dung"}</p>
              
              ${
                sub.fileUrls && sub.fileUrls.length
                  ? `<div>
                    <strong>File đính kèm:</strong>
                    <ul>
                      ${sub.fileUrls
                        .map(
                          (url) => `
                        <li><a href="${url}" target="_blank">${url
                            .split("/")
                            .pop()}</a></li>
                      `
                        )
                        .join("")}
                    </ul>
                  </div>`
                  : ""
              }
              
              <div style="margin-top: 10px;">
                <form onsubmit="gradeSubmission(event, '${assignmentId}', '${
          sub.studentId
        }')">
                  <div class="form-group">
                    <label>Điểm số:</label>
                    <input type="number" class="form-control" name="grade" min="0" max="100" value="${
                      sub.grade || 0
                    }" style="width: 100px;">
                  </div>
                  <div class="form-group">
                    <label>Nhận xét:</label>
                    <textarea class="form-control" name="feedback" rows="2">${
                      sub.feedback || ""
                    }</textarea>
                  </div>
                  <button type="submit" class="btn btn-primary">Chấm điểm</button>
                </form>
              </div>
            </div>
          `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading submissions:", error);
    alert(`Lỗi tải bài nộp: ${error.message}`);
  }
}

// Grade a submission
async function gradeSubmission(e, assignmentId, studentId) {
  e.preventDefault();

  try {
    const form = e.target;
    const grade = parseInt(form.grade.value);
    const feedback = form.feedback.value;

    const response = await fetch(`/assignments/${assignmentId}/grade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId, grade, feedback }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Lỗi chấm điểm");
    }

    alert("Chấm điểm thành công!");
  } catch (error) {
    console.error("Error grading submission:", error);
    alert(`Lỗi: ${error.message}`);
  }
}

async function loadNotifications() {
  try {
    const container = document.getElementById("notificationsList");
    container.innerHTML = "<p>Đang tải thông báo...</p>";

    console.log("DEBUG - Loading notifications");

    // Get last created notification ID if any
    const lastCreatedNotification = localStorage.getItem(
      "lastCreatedNotification"
    );
    if (lastCreatedNotification) {
      console.log(
        "DEBUG - Will highlight notification:",
        lastCreatedNotification
      );
      // Clear it immediately to avoid highlighting on subsequent loads
      localStorage.removeItem("lastCreatedNotification");
    }

    // Fetch teacher's notifications with a cache-busting param
    const timestamp = new Date().getTime();
    const response = await fetch(
      `/notifications/my-notifications?_t=${timestamp}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store", // Try to prevent caching
      }
    );

    if (!response.ok) throw new Error("Failed to load notifications");

    const notifications = await response.json();
    console.log("DEBUG - Loaded notifications count:", notifications.length);

    if (notifications.length > 0) {
      console.log("DEBUG - Most recent notification:", notifications[0]);
    }

    if (notifications.length === 0) {
      container.innerHTML = "<p>Chưa có thông báo nào.</p>";
      return;
    }

    // Populate course dropdown for notification creation
    populateNotificationCourseDropdown();

    // Display notifications with edit/delete options
    container.innerHTML = notifications
      .map((notification) => {
        const createdAt = new Date(notification.createdAt).toLocaleString();
        const priorityClass =
          notification.priority === "urgent"
            ? "text-danger"
            : notification.priority === "high"
            ? "text-warning"
            : "";

        // Check if this is the newly created notification to highlight it
        const isNew =
          lastCreatedNotification &&
          notification._id === lastCreatedNotification;
        const highlightClass = isNew ? "new-notification" : "";

        return `
        <div class="notification-item ${highlightClass}" id="notification-${
          notification._id
        }">
          <div class="item-header">
            <h4 class="${priorityClass}">${notification.title} ${
          isNew ? '<span class="badge bg-success">Mới</span>' : ""
        }</h4>
            <span>${createdAt}</span>
          </div>
          <p>${notification.content}</p>
          <div class="item-info">
            ${
              notification.courseId
                ? `<span class="badge bg-primary">Khóa học cụ thể</span>`
                : `<span class="badge bg-success">Thông báo chung</span>`
            }
            ${
              notification.priority === "urgent"
                ? `<span class="badge bg-danger">Khẩn cấp</span>`
                : notification.priority === "high"
                ? `<span class="badge bg-warning">Quan trọng</span>`
                : `<span class="badge bg-info">Thông thường</span>`
            }
          </div>
          <div class="item-actions">
            <button class="btn btn-primary" onclick="editNotification('${
              notification._id
            }')">Sửa</button>
            <button class="btn btn-danger" onclick="deleteNotification('${
              notification._id
            }')">Xóa</button>
          </div>
        </div>
      `;
      })
      .join("");

    // Add CSS for highlighting the new notification
    const style = document.createElement("style");
    style.textContent = `
      .new-notification {
        animation: highlight 2s ease-in-out;
        border: 2px solid #28a745 !important;
      }
      @keyframes highlight {
        0% { background-color: rgba(40, 167, 69, 0.3); }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(style);

    // Scroll to the highlighted notification if exists
    if (lastCreatedNotification) {
      setTimeout(() => {
        const newNotification = document.getElementById(
          `notification-${lastCreatedNotification}`
        );
        if (newNotification) {
          newNotification.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 500);
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    document.getElementById(
      "notificationsList"
    ).innerHTML = `<p>Lỗi tải thông báo: ${error.message}</p>`;
  }
}

// Hiển thị danh sách học viên
async function viewStudents(courseId) {
  const container = document.getElementById(`students-${courseId}`);
  container.innerHTML = "Đang tải danh sách học viên...";

  try {
    const res = await fetch(`/teachers/courses/${courseId}/students`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Tải danh sách thất bại");

    const pending = data.pendingStudents || [];
    const approved = data.approvedStudents || [];

    let html = "";

    // Pending students section with improved styling
    html += `
      <div style="margin-top: 15px; margin-bottom: 15px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <h4 style="color: #e74c3c; margin: 0; font-size: 18px;">
            <i class="fas fa-user-clock"></i> Học viên chờ duyệt
          </h4>
          <div style="margin-left: 10px; background: #e74c3c; color: white; border-radius: 15px; padding: 2px 10px; font-size: 14px; font-weight: bold;">
            ${pending.length}
          </div>
        </div>
        
        <div class="pending-students" style="max-height: 400px; overflow-y: auto; border-radius: 8px; border: ${
          pending.length > 0 ? "1px dashed #e74c3c" : "none"
        }; padding: ${pending.length > 0 ? "10px" : "0"};">
    `;

    if (pending.length === 0) {
      html +=
        "<p style='font-style: italic; color: #7f8c8d;'>Không có học viên chờ duyệt.</p>";
    } else {
      html += "<div style='display: grid; gap: 10px;'>";
      pending.forEach((s) => {
        html += `
          <div class="student-item" style="background: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div>
              <strong style="font-size: 15px;">${
                s.name || s.fullName || "Học viên"
              }</strong>
              <div style="font-size: 12px; color: #666;">Email: ${
                s.email || "Không có email"
              }</div>
              <div style="font-size: 11px; color: #999;">ID: ${s._id}</div>
            </div>
            <button class="btn" 
                    style="background: #2ecc71; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s ease;" 
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
                    onclick="approveStudent('${courseId}', '${s._id}', '${
          s.name || s.fullName || "Học viên"
        }')">
              <i class="fas fa-check-circle"></i> Duyệt học viên
            </button>
          </div>
        `;
      });
      html += "</div>";
    }

    html += `
        </div>
      </div>
    `;

    // Approved students section
    html += `
      <div style="margin-top: 20px;">
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
          <h4 style="color: #2ecc71; margin: 0; font-size: 18px;">
            <i class="fas fa-user-check"></i> Học viên đã duyệt
          </h4>
          <div style="margin-left: 10px; background: #2ecc71; color: white; border-radius: 15px; padding: 2px 10px; font-size: 14px; font-weight: bold;">
            ${approved.length}
          </div>
        </div>
        
        <div class="approved-students" style="max-height: 300px; overflow-y: auto;">
    `;

    if (approved.length === 0) {
      html +=
        "<p style='font-style: italic; color: #7f8c8d;'>Chưa có học viên nào được duyệt.</p>";
    } else {
      html += "<div style='display: grid; gap: 10px;'>";
      approved.forEach((s) => {
        html += `
          <div class="student-item" style="background: #eafaf1; border-left: 4px solid #2ecc71; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <strong style="font-size: 15px;">${
              s.name || s.fullName || "Học viên"
            }</strong>
            <div style="font-size: 12px; color: #666;">Email: ${
              s.email || "Không có email"
            }</div>
            <div style="font-size: 11px; color: #999;">ID: ${s._id}</div>
          </div>
        `;
      });
      html += "</div>";
    }

    html += `
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: right;">
        <button class="btn" 
                style="background: #7f8c8d; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;"
                onclick="document.getElementById('students-${courseId}').innerHTML = ''">
          <i class="fas fa-times"></i> Đóng danh sách
        </button>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div style="color: #e74c3c; padding: 15px; border: 1px solid #e74c3c; border-radius: 5px; background: #ffe9e8;">
        <strong>Lỗi:</strong> Không thể tải danh sách học viên. ${err.message}
      </div>
    `;
  }
}

// Duyệt học viên
async function approveStudent(courseId, studentId, studentName = "học viên") {
  if (!confirm(`Xác nhận duyệt học viên "${studentName}" vào khóa học?`))
    return;

  try {
    // Hiển thị trạng thái đang xử lý
    const studentElements = document.querySelectorAll(
      `.student-item button[onclick*="${studentId}"]`
    );
    if (studentElements.length > 0) {
      const originalText = studentElements[0].innerHTML;
      studentElements[0].innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      studentElements[0].disabled = true;
    }

    // Also update any pending badges on the course item
    const courseElements = document.querySelectorAll(
      `.course-item[onclick*="${courseId}"]`
    );
    if (courseElements.length > 0) {
      const pendingBadges = courseElements[0].querySelectorAll(
        '[style*="background-color: #ff7675"]'
      );
      if (pendingBadges.length > 0 && pendingStudentsTotal > 0) {
        pendingStudentsTotal--;

        // If there's only one student left, remove the badge after approval
        if (pendingBadges[0].textContent.includes("1 học viên")) {
          pendingBadges[0].style.display = "none";
        } else {
          // Otherwise update the count
          const countMatch = pendingBadges[0].textContent.match(/(\d+)/);
          if (countMatch && parseInt(countMatch[1]) > 1) {
            const newCount = parseInt(countMatch[1]) - 1;
            pendingBadges[0].innerHTML = `<i class="fas fa-user-clock"></i> ${newCount} học viên chờ duyệt`;
          }
        }
      }
    }

    const res = await fetch(`/teachers/courses/${courseId}/approve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Duyệt thất bại");

    // Hiển thị thông báo thành công
    const successNotification = document.createElement("div");
    successNotification.className = "notification-alert";
    successNotification.style = `
      position: fixed; 
      top: 20px; 
      right: 20px; 
      background: #d4edda; 
      color: #155724; 
      padding: 15px 20px; 
      border-radius: 5px; 
      box-shadow: 0 4px 8px rgba(0,0,0,0.1); 
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

    successNotification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="font-size: 20px;">✅</div>
        <div>
          <strong>Thành công!</strong>
          <div>Đã duyệt ${studentName} vào khóa học.</div>
        </div>
      </div>
    `;

    document.body.appendChild(successNotification);
    setTimeout(() => {
      successNotification.style.opacity = "0";
      successNotification.style.transition = "opacity 0.5s";
      setTimeout(() => successNotification.remove(), 500);
    }, 3000);

    // Tạo thông báo cho học viên
    await createEnrollmentNotification(courseId, studentId);

    // Cập nhật lại danh sách học viên
    viewStudents(courseId);

    // Update pending enrollments count
    pendingStudentsTotal--;
    updatePendingEnrollmentsUI();
  } catch (err) {
    console.error(err);
    alert("Lỗi khi duyệt học viên: " + err.message);
  }
}

// Tạo thông báo cho học viên khi được duyệt vào khóa học
async function createEnrollmentNotification(courseId, studentId) {
  try {
    // Sử dụng endpoint chuyên biệt cho thông báo duyệt đăng ký
    const notificationResponse = await fetch("/notifications/enrollment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        courseId: courseId,
        studentId: studentId,
      }),
    });

    if (!notificationResponse.ok) {
      console.error(
        "Không thể tạo thông báo cho học viên:",
        await notificationResponse.text()
      );
      return false;
    }

    console.log("Đã tạo thông báo duyệt đăng ký thành công");
    return true;
  } catch (error) {
    console.error("Lỗi khi tạo thông báo enrollment:", error);
    return false;
  }
}

const showCreateFormBtn = document.getElementById("showCreateFormBtn");
const createCourseModal = document.getElementById("createCourseModal");

showCreateFormBtn.addEventListener("click", () => {
  createCourseModal.style.display = "block";
});

// Xử lý thêm và xóa lịch học
document
  .getElementById("addScheduleBtn")
  .addEventListener("click", addScheduleRow);

function addScheduleRow() {
  const container = document.getElementById("scheduleContainer");
  const row = document.createElement("div");
  row.className = "schedule-row";

  row.innerHTML = `
    <select class="schedule-day form-control">
      <option value="Thứ 2">Thứ 2</option>
      <option value="Thứ 3">Thứ 3</option>
      <option value="Thứ 4">Thứ 4</option>
      <option value="Thứ 5">Thứ 5</option>
      <option value="Thứ 6">Thứ 6</option>
      <option value="Thứ 7">Thứ 7</option>
      <option value="Chủ Nhật">Chủ Nhật</option>
    </select>
    <input type="time" class="schedule-start-time form-control" value="18:00" required />
    <span>-</span>
    <input type="time" class="schedule-end-time form-control" value="20:00" required />
    <button type="button" class="btn btn-sm btn-danger remove-schedule">X</button>
  `;

  container.appendChild(row);

  row.querySelector(".remove-schedule").addEventListener("click", function () {
    container.removeChild(row);
  });
}

// Add event handler for initial remove buttons
document.querySelectorAll(".remove-schedule").forEach((button) => {
  button.addEventListener("click", function () {
    const row = this.closest(".schedule-row");
    const container = document.getElementById("scheduleContainer");
    if (container.children.length > 1) {
      container.removeChild(row);
    } else {
      alert("Phải có ít nhất một lịch học");
    }
  });
});

// Xử lý tạo khóa học
createCourseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("courseName").value;
  const description = document.getElementById("courseDescription").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const maxStudents = document.getElementById("maxStudents").value;
  const meetLink = document.getElementById("meetLink").value;

  // Get schedule data from form
  const scheduleRows = document.querySelectorAll(
    "#scheduleContainer .schedule-row"
  );
  const schedule = Array.from(scheduleRows).map((row) => {
    const day = row.querySelector(".schedule-day").value;
    const startTime = row.querySelector(".schedule-start-time").value;
    const endTime = row.querySelector(".schedule-end-time").value;
    return {
      day: day,
      time: `${startTime} - ${endTime}`,
    };
  });

  // Calculate duration in weeks
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const durationInDays = (endDateObj - startDateObj) / (1000 * 60 * 60 * 24);
  const duration = Math.ceil(durationInDays / 7) + " tuần";

  fetch("/teachers/courses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description,
      startDate,
      endDate,
      maxStudents,
      schedule,
      duration,
      meetLink,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Tạo thất bại");
      return res.json();
    })
    .then((data) => {
      alert("Tạo khóa học thành công!");
      createCourseForm.reset();
      closeModal("createCourseModal");
      loadCourses();
    })
    .catch((err) => {
      alert("Lỗi khi tạo khóa học.");
      console.error(err);
    });
});

function closeModal(modalId) {
  if (modalId) {
    document.getElementById(modalId).style.display = "none";

    // Handle special cases for specific modals
    if (modalId === "createNotificationModal") {
      document.getElementById("createNotificationForm").reset();
      document.getElementById("createNotificationForm").onsubmit =
        createNotification;
      document
        .getElementById("createNotificationForm")
        .querySelector("button[type='submit']").textContent = "Tạo thông báo";
      if (typeof currentEditNotificationId !== "undefined") {
        currentEditNotificationId = null;
      }
    }
  } else {
    // For backward compatibility
    createCourseModal.style.display = "none";
  }
}

// Populate notification course dropdown
async function populateNotificationCourseDropdown() {
  try {
    const response = await fetch("/courses/teacher/my-courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to load courses");
    }

    const courses = await response.json();
    const select = document.getElementById("notificationCourse");

    // Clear existing options
    select.innerHTML = "";

    // Add "All Courses" option (global notification)
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Tất cả khóa học (Thông báo toàn cục)";
    select.appendChild(allOption);

    // Add course options
    courses.forEach((course) => {
      const option = document.createElement("option");
      option.value = course._id;
      option.textContent =
        course.courseName || course.title || `Course ${course._id}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading courses for dropdown:", error);
  }
}

// Show create notification form
function showCreateNotificationForm() {
  // Reset the form in case it was used before
  document.getElementById("createNotificationForm").reset();

  // Clear any previously set handlers to avoid duplicates
  const form = document.getElementById("createNotificationForm");
  form.onsubmit = null;

  document.getElementById("createNotificationModal").style.display = "block";

  // Populate dropdown with fresh course data
  populateNotificationCourseDropdown();

  // Set up form submission
  form.onsubmit = createNotification;
}

// Create notification
async function createNotification(e) {
  e.preventDefault();

  try {
    const courseId = document.getElementById("notificationCourse").value;
    const title = document.getElementById("notificationTitle").value;
    const content = document.getElementById("notificationContent").value;
    const priority = document.getElementById("notificationPriority").value;

    // Validation - ensure title and content are provided
    if (!title.trim() || !content.trim()) {
      alert("Vui lòng nhập tiêu đề và nội dung thông báo.");
      return;
    }

    const notificationData = {
      title,
      content,
      priority,
    };

    // Add courseId only if selected and not the default "all courses" option
    if (courseId && courseId !== "all") {
      // Verify that this course belongs to the current teacher
      const belongsToTeacher = await verifyCourseOwnership(courseId);

      if (!belongsToTeacher) {
        alert("Bạn không có quyền tạo thông báo cho khóa học này.");
        return;
      }

      notificationData.courseId = courseId;
    } else {
      notificationData.isGlobal = true;
    }

    console.log(
      "DEBUG - Sending notification data:",
      JSON.stringify(notificationData)
    );

    const response = await fetch("/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(notificationData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create notification");
    }

    const result = await response.json();
    console.log("DEBUG - Notification created successfully:", result);

    alert("Thông báo đã được tạo thành công!");
    closeModal("createNotificationModal");
    document.getElementById("createNotificationForm").reset();

    // Store the new notification ID in localStorage to ensure it's highlighted when page reloads
    if (result && result.notificationId) {
      localStorage.setItem("lastCreatedNotification", result.notificationId);
    }

    // Force a complete page reload with a cache-busting parameter
    window.location.href =
      window.location.href.split("?")[0] + "?refresh=" + new Date().getTime();
  } catch (error) {
    console.error("Error creating notification:", error);
    alert(`Lỗi tạo thông báo: ${error.message}`);
  }
}

// Helper function to verify course ownership
async function verifyCourseOwnership(courseId) {
  try {
    const response = await fetch(`/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return false;

    const course = await response.json();
    return course && course.teacherId === getUserIdFromToken();
  } catch (error) {
    console.error("Error verifying course ownership:", error);
    return false;
  }
}

// Get user ID from token
function getUserIdFromToken() {
  if (!token) return null;

  try {
    // Decode JWT token (simple decode, not verification)
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload)._id;
  } catch (e) {
    console.error("Error decoding token:", e);
    return null;
  }
}

// Global variable to store notification being edited
let currentEditNotificationId = null;

// Edit notification
async function editNotification(notificationId) {
  try {
    // Fetch notification details
    const response = await fetch(`/notifications/${notificationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to load notification details");

    const notification = await response.json();

    // Store current notification ID
    currentEditNotificationId = notificationId;

    // Populate form with notification details
    document.getElementById("notificationTitle").value = notification.title;
    document.getElementById("notificationContent").value = notification.content;
    document.getElementById("notificationPriority").value =
      notification.priority || "normal";

    // Set course if applicable
    const courseSelect = document.getElementById("notificationCourse");
    if (notification.courseId) {
      // Try to select the course if it exists in dropdown
      for (let i = 0; i < courseSelect.options.length; i++) {
        if (courseSelect.options[i].value === notification.courseId) {
          courseSelect.selectedIndex = i;
          break;
        }
      }
    } else {
      courseSelect.selectedIndex = 0; // Select "All courses"
    }

    // Show modal
    document.getElementById("createNotificationModal").style.display = "block";

    // Change form submission to update instead of create
    const form = document.getElementById("createNotificationForm");
    form.onsubmit = updateNotification;

    // Change button text
    form.querySelector("button[type='submit']").textContent =
      "Cập nhật thông báo";
  } catch (error) {
    console.error("Error loading notification for edit:", error);
    alert(`Lỗi tải thông báo: ${error.message}`);
  }
}

// Update notification
async function updateNotification(e) {
  e.preventDefault();

  if (!currentEditNotificationId) {
    alert("Không tìm thấy ID thông báo để cập nhật");
    return;
  }

  try {
    const title = document.getElementById("notificationTitle").value;
    const content = document.getElementById("notificationContent").value;
    const priority = document.getElementById("notificationPriority").value;

    const updateData = {
      title,
      content,
      priority,
    };

    const response = await fetch(
      `/notifications/${currentEditNotificationId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update notification");
    }

    alert("Thông báo đã được cập nhật thành công!");
    closeModal("createNotificationModal");
    document.getElementById("createNotificationForm").reset();

    // Reset form to create mode
    document.getElementById("createNotificationForm").onsubmit =
      createNotification;
    document
      .getElementById("createNotificationForm")
      .querySelector("button[type='submit']").textContent = "Tạo thông báo";

    // Clear edit notification ID
    currentEditNotificationId = null;

    // Reload notifications
    loadNotifications();
  } catch (error) {
    console.error("Error updating notification:", error);
    alert(`Lỗi cập nhật thông báo: ${error.message}`);
  }
}

// Delete notification
async function deleteNotification(notificationId) {
  if (!confirm("Bạn có chắc chắn muốn xóa thông báo này?")) {
    return;
  }

  try {
    const response = await fetch(`/notifications/${notificationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete notification");
    }

    alert("Thông báo đã được xóa thành công!");

    // Remove from UI
    const notificationElement = document.getElementById(
      `notification-${notificationId}`
    );
    if (notificationElement) {
      notificationElement.remove();
    }

    // If no notifications left, show message
    const container = document.getElementById("notificationsList");
    if (container.children.length === 0) {
      container.innerHTML = "<p>Chưa có thông báo nào.</p>";
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    alert(`Lỗi xóa thông báo: ${error.message}`);
  }
}

// Initialize WebSocket connection
function initializeWebSocket() {
  // Check if WebSocket is supported
  if (!window.WebSocket) {
    console.error("WebSocket is not supported by this browser");
    return;
  }

  // Create WebSocket connection
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

  socket = new WebSocket(wsUrl);

  // Connection opened
  socket.addEventListener("open", (event) => {
    console.log("WebSocket connection established");
  });

  // Listen for messages
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    handleWebSocketMessage(data);
  });

  // Connection closed
  socket.addEventListener("close", (event) => {
    console.log("WebSocket connection closed");
    // Try to reconnect after 5 seconds
    setTimeout(initializeWebSocket, 5000);
  });

  // Connection error
  socket.addEventListener("error", (event) => {
    console.error("WebSocket error:", event);
  });
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
  console.log("Received WebSocket message:", data);

  switch (data.type) {
    case "notification":
      // Show notification
      showNotificationAlert(data.notification);

      // If on notifications tab, refresh the list
      if (currentTab === "notifications") {
        loadNotifications();
      }
      break;

    case "notification_update":
      // If on notifications tab, refresh the list
      if (currentTab === "notifications") {
        loadNotifications();
      }
      break;

    case "notification_delete":
      // If on notifications tab, refresh the list or remove the specific notification
      if (currentTab === "notifications") {
        const notificationElement = document.getElementById(
          `notification-${data.notificationId}`
        );
        if (notificationElement) {
          notificationElement.remove();
        }
      }
      break;
  }
}

// Show notification alert
function showNotificationAlert(notification) {
  // Create notification element
  const notificationDiv = document.createElement("div");
  notificationDiv.className = "notification-alert";
  notificationDiv.innerHTML = `
    <div class="notification-alert-content">
      <h4>${notification.title}</h4>
      <p>${notification.content}</p>
      <button onclick="this.parentElement.parentElement.remove()">Đóng</button>
    </div>
  `;

  // Add styles
  notificationDiv.style.position = "fixed";
  notificationDiv.style.top = "20px";
  notificationDiv.style.right = "20px";
  notificationDiv.style.backgroundColor = "#fff";
  notificationDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  notificationDiv.style.borderRadius = "5px";
  notificationDiv.style.padding = "15px";
  notificationDiv.style.zIndex = "1000";
  notificationDiv.style.maxWidth = "300px";

  // Add to document
  document.body.appendChild(notificationDiv);

  // Remove after 10 seconds
  setTimeout(() => {
    if (notificationDiv.parentElement) {
      notificationDiv.remove();
    }
  }, 10000);
}

// Add edit schedule row function for the edit modal
document
  .getElementById("editAddScheduleBtn")
  .addEventListener("click", addEditScheduleRow);

function addEditScheduleRow() {
  const container = document.getElementById("editScheduleContainer");
  const row = document.createElement("div");
  row.className = "schedule-row";

  row.innerHTML = `
    <select class="schedule-day form-control">
      <option value="Thứ 2">Thứ 2</option>
      <option value="Thứ 3">Thứ 3</option>
      <option value="Thứ 4">Thứ 4</option>
      <option value="Thứ 5">Thứ 5</option>
      <option value="Thứ 6">Thứ 6</option>
      <option value="Thứ 7">Thứ 7</option>
      <option value="Chủ Nhật">Chủ Nhật</option>
    </select>
    <input type="time" class="schedule-start-time form-control" value="18:00" required />
    <span>-</span>
    <input type="time" class="schedule-end-time form-control" value="20:00" required />
    <button type="button" class="btn btn-sm btn-danger remove-schedule">X</button>
  `;

  container.appendChild(row);

  row.querySelector(".remove-schedule").addEventListener("click", function () {
    container.removeChild(row);
  });
}

// Edit course function
async function editCourse(courseId) {
  try {
    // Fetch the course details
    const response = await fetch(`/teachers/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to load course details");
    }

    const course = await response.json();

    // Populate form fields
    document.getElementById("editCourseId").value = course._id;
    document.getElementById("editCourseName").value =
      course.title || course.courseName || "";
    document.getElementById("editCourseDescription").value =
      course.description || "";

    // Format dates for input fields (YYYY-MM-DD)
    if (course.startDate) {
      const startDate = new Date(course.startDate);
      document.getElementById("editStartDate").value = startDate
        .toISOString()
        .split("T")[0];
    }

    if (course.endDate) {
      const endDate = new Date(course.endDate);
      document.getElementById("editEndDate").value = endDate
        .toISOString()
        .split("T")[0];
    }

    document.getElementById("editMaxStudents").value = course.maxStudents || 50;
    document.getElementById("editMeetLink").value = course.meetLink || "";

    // Clear existing schedule rows
    const scheduleContainer = document.getElementById("editScheduleContainer");
    scheduleContainer.innerHTML = "";

    // Add schedule rows based on course data
    if (Array.isArray(course.schedule) && course.schedule.length > 0) {
      course.schedule.forEach((scheduleItem) => {
        const row = document.createElement("div");
        row.className = "schedule-row";

        // Parse time format "HH:MM - HH:MM"
        let startTime = "18:00";
        let endTime = "20:00";

        if (scheduleItem.time) {
          const timeParts = scheduleItem.time.split(" - ");
          if (timeParts.length === 2) {
            startTime = timeParts[0];
            endTime = timeParts[1];
          }
        }

        row.innerHTML = `
          <select class="schedule-day form-control">
            <option value="Thứ 2" ${
              scheduleItem.day === "Thứ 2" ? "selected" : ""
            }>Thứ 2</option>
            <option value="Thứ 3" ${
              scheduleItem.day === "Thứ 3" ? "selected" : ""
            }>Thứ 3</option>
            <option value="Thứ 4" ${
              scheduleItem.day === "Thứ 4" ? "selected" : ""
            }>Thứ 4</option>
            <option value="Thứ 5" ${
              scheduleItem.day === "Thứ 5" ? "selected" : ""
            }>Thứ 5</option>
            <option value="Thứ 6" ${
              scheduleItem.day === "Thứ 6" ? "selected" : ""
            }>Thứ 6</option>
            <option value="Thứ 7" ${
              scheduleItem.day === "Thứ 7" ? "selected" : ""
            }>Thứ 7</option>
            <option value="Chủ Nhật" ${
              scheduleItem.day === "Chủ Nhật" ? "selected" : ""
            }>Chủ Nhật</option>
          </select>
          <input type="time" class="schedule-start-time form-control" value="${startTime}" required />
          <span>-</span>
          <input type="time" class="schedule-end-time form-control" value="${endTime}" required />
          <button type="button" class="btn btn-sm btn-danger remove-schedule">X</button>
        `;

        scheduleContainer.appendChild(row);

        row
          .querySelector(".remove-schedule")
          .addEventListener("click", function () {
            if (scheduleContainer.children.length > 1) {
              scheduleContainer.removeChild(row);
            } else {
              alert("Phải có ít nhất một lịch học");
            }
          });
      });
    } else {
      // Add a default schedule row if none exists
      addEditScheduleRow();
    }

    // Show the modal
    document.getElementById("editCourseModal").style.display = "block";

    // Set up form submission
    const form = document.getElementById("editCourseForm");
    form.onsubmit = updateCourse;
  } catch (error) {
    console.error("Error loading course details:", error);
    alert("Không thể tải thông tin khóa học. Vui lòng thử lại.");
  }
}

// Update course function
async function updateCourse(e) {
  e.preventDefault();

  const courseId = document.getElementById("editCourseId").value;
  const title = document.getElementById("editCourseName").value;
  const description = document.getElementById("editCourseDescription").value;
  const startDate = document.getElementById("editStartDate").value;
  const endDate = document.getElementById("editEndDate").value;
  const maxStudents = document.getElementById("editMaxStudents").value;
  const meetLink = document.getElementById("editMeetLink").value;

  // Get schedule data from form
  const scheduleRows = document.querySelectorAll(
    "#editScheduleContainer .schedule-row"
  );
  const schedule = Array.from(scheduleRows).map((row) => {
    const day = row.querySelector(".schedule-day").value;
    const startTime = row.querySelector(".schedule-start-time").value;
    const endTime = row.querySelector(".schedule-end-time").value;
    return {
      day: day,
      time: `${startTime} - ${endTime}`,
    };
  });

  // Calculate duration in weeks
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const durationInDays = (endDateObj - startDateObj) / (1000 * 60 * 60 * 24);
  const duration = Math.ceil(durationInDays / 7) + " tuần";

  try {
    const response = await fetch(`/teachers/courses/${courseId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate,
        maxStudents,
        schedule,
        duration,
        meetLink,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Cập nhật thất bại");
    }

    alert("Cập nhật khóa học thành công!");
    closeModal("editCourseModal");
    loadCourses(); // Reload courses to show changes
  } catch (error) {
    console.error("Error updating course:", error);
    alert(`Lỗi khi cập nhật khóa học: ${error.message}`);
  }
}
