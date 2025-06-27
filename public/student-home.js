const token = localStorage.getItem("token");
if (!token) {
  window.location.href = "/index.html";
}

// Global variables
let currentUser = null;
let currentTab = "courses";

// DOM elements
const studentNameEl = document.getElementById("studentName");
const unreadCountEl = document.getElementById("unreadCount");

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  // Initialize each functionality independently with try-catch blocks
  // so one error doesn't prevent other parts from loading

  // Load user info
  try {
    console.log("Initializing user info...");
    loadUserInfo();
  } catch (error) {
    console.error("Error initializing user info:", error);
  }

  // Load unread notifications
  try {
    console.log("Initializing notifications count...");
    loadUnreadNotifications();
  } catch (error) {
    console.error("Error initializing notifications count:", error);
    // Set a default value
    unreadCountEl.textContent = "0";
  }

  // Show default tab
  try {
    console.log("Setting up default tab...");
    showTab("courses");
  } catch (error) {
    console.error("Error setting up default tab:", error);
  }

  // Setup form handlers
  try {
    console.log("Setting up form handlers...");
    setupProfileForm();
    setupPasswordForm();

    // Add submission form handler if it exists
    const submitForm = document.getElementById("assignmentSubmitForm");
    if (submitForm) {
      submitForm.addEventListener("submit", handleAssignmentSubmit);
    }
  } catch (error) {
    console.error("Error setting up forms:", error);
  }
});

// Load user info
async function loadUserInfo() {
  try {
    console.log("Loading user information...");
    studentNameEl.textContent = "Đang tải...";

    const response = await fetch("/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("User info API response status:", response.status);

    if (!response.ok) {
      console.error("Failed to load user info, status:", response.status);

      if (response.status === 401) {
        // Token invalid or expired - redirect to login
        console.log("Authentication failed, redirecting to login");
        localStorage.removeItem("token");
        window.location.href = "/index.html";
        return;
      }

      studentNameEl.textContent = "Học viên";
      throw new Error("Failed to load user info");
    }

    try {
      currentUser = await safeJsonParse(response);
      console.log("User info loaded successfully");

      // Display user name
      studentNameEl.textContent = `Xin chào, ${
        currentUser.fullName || currentUser.name || "Học viên"
      }`;

      // Fill profile form if on profile tab
      if (currentTab === "profile") {
        fillProfileForm();
      }
    } catch (jsonError) {
      console.error("Error parsing user info JSON:", jsonError);
      studentNameEl.textContent = "Học viên";
      throw jsonError;
    }
  } catch (error) {
    console.error("Error in loadUserInfo:", error);

    // Don't automatically remove token and redirect unless it's an auth error
    // This allows the page to at least partially load with other content
    studentNameEl.textContent = "Học viên";
  }
}

// Tab management
function showTab(tabName) {
  try {
    console.log(`Switching to tab: ${tabName}`);
    currentTab = tabName;

    // Hide all tabs
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.classList.remove("active");
    });

    // Remove active class from all buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Show selected tab
    const tabElement = document.getElementById(`${tabName}-tab`);
    if (!tabElement) {
      console.error(`Tab element not found: ${tabName}-tab`);
      return;
    }
    tabElement.classList.add("active");

    // Add active class to clicked button
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn.textContent.includes(getTabDisplayName(tabName))) {
        btn.classList.add("active");
      }
    });

    // Load content based on tab
    try {
      switch (tabName) {
        case "courses":
          loadMyCourses();
          break;
        case "available-courses":
          loadAvailableCourses();
          break;
        case "assignments":
          loadMyAssignments();
          break;
        case "notifications":
          loadNotifications();
          break;
        case "profile":
          fillProfileForm();
          break;
        default:
          console.warn(`Unknown tab: ${tabName}`);
          break;
      }
    } catch (contentError) {
      console.error(`Error loading content for tab ${tabName}:`, contentError);
      // Display error message in the tab content area
      const tabContent = document.getElementById(`${tabName}-tab`);
      if (tabContent) {
        tabContent.innerHTML = `<p class="error">Lỗi tải dữ liệu. Vui lòng thử làm mới trang.</p>`;
      }
    }
  } catch (error) {
    console.error("Error in showTab:", error);
  }
}

function getTabDisplayName(tabName) {
  const names = {
    courses: "Khóa học của tôi",
    "available-courses": "Khóa học có sẵn",
    assignments: "Bài tập",
    notifications: "Thông báo",
    profile: "Thông tin cá nhân",
  };
  return names[tabName] || tabName;
}

// Load my courses
async function loadMyCourses() {
  try {
    console.log("Đang tải khóa học của học viên...");
    const container = document.getElementById("myCourses");
    container.innerHTML = "<p>Đang tải khóa học...</p>";

    // Fetch enrolled courses
    const responseEnrolled = await fetch("/courses/student/my-courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!responseEnrolled.ok) {
      console.error(
        "API error (enrolled courses), status:",
        responseEnrolled.status
      );
      try {
        const errorData = await safeJsonParse(responseEnrolled);
        throw new Error(errorData.error || "Không thể tải khóa học");
      } catch (jsonError) {
        throw new Error("Không thể tải khóa học");
      }
    }

    // Fetch all courses to check pending enrollments
    const responseAllCourses = await fetch("/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!responseAllCourses.ok) {
      console.error(
        "API error (all courses), status:",
        responseAllCourses.status
      );
      try {
        const errorData = await safeJsonParse(responseAllCourses);
        throw new Error(errorData.error || "Không thể tải tất cả khóa học");
      } catch (jsonError) {
        throw new Error("Không thể tải tất cả khóa học");
      }
    }

    const enrolledCourses = await safeJsonParse(responseEnrolled);
    const allCourses = await safeJsonParse(responseAllCourses);

    console.log(
      `Đã tải ${
        enrolledCourses ? enrolledCourses.length : 0
      } khóa học đã đăng ký`
    );

    // Debug log để kiểm tra khóa học đã đăng ký
    if (enrolledCourses && enrolledCourses.length > 0) {
      console.log(
        "Khóa học đã đăng ký:",
        JSON.stringify(
          enrolledCourses.map((c) => ({
            id: c._id,
            name: c.courseName || c.title,
            teacherId: c.teacherId,
            students: Array.isArray(c.students)
              ? c.students.length
              : "không phải mảng",
          })),
          null,
          2
        )
      );
    }

    // Get current user ID from token
    const userId = currentUser._id || JSON.parse(atob(token.split(".")[1]))._id;
    console.log("User ID hiện tại:", userId);

    // Find courses where the user is in pendingStudents
    const pendingCourses = allCourses.filter(
      (course) =>
        course.pendingStudents &&
        Array.isArray(course.pendingStudents) &&
        course.pendingStudents.some(
          (id) => id === userId || id.toString() === userId.toString()
        )
    );

    console.log(`Tìm thấy ${pendingCourses.length} khóa học đang chờ duyệt`);

    // If no courses at all, show empty state
    if (
      (!enrolledCourses || enrolledCourses.length === 0) &&
      (!pendingCourses || pendingCourses.length === 0)
    ) {
      container.innerHTML = `
        <div style="margin-top: 30px; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 10px;">📚</div>
          <h4>Bạn chưa đăng ký khóa học nào</h4>
          <p>Hãy xem các khóa học có sẵn và đăng ký để bắt đầu học!</p>
          <button onclick="showTab('available-courses')" class="btn btn-success" style="margin-top: 10px;">
            <i class="fas fa-plus-circle"></i> Xem khóa học có sẵn
          </button>
        </div>
      `;
      return;
    }

    // Create container for all courses
    let html = '<div class="course-list">';

    // Add approved courses
    if (enrolledCourses && enrolledCourses.length > 0) {
      enrolledCourses.forEach((course) => {
        html += `
          <div class="course-item" onclick="viewCourseDetails('${
            course._id
          }')" style="border-left: 4px solid #2ecc71;">
            <span class="status-badge status-approved">Đã duyệt</span>
            <h4>${
              course.courseName || course.title || "Khóa học không tên"
            }</h4>
            <p><strong>Giảng viên:</strong> ${
              course.teacherName || "Không xác định"
            }</p>
            <p><strong>Thời gian:</strong> ${
              course.startDate
                ? new Date(course.startDate).toLocaleDateString("vi-VN")
                : "N/A"
            } - ${
          course.endDate
            ? new Date(course.endDate).toLocaleDateString("vi-VN")
            : "N/A"
        }</p>
            <p><strong>Trạng thái:</strong> ${
              course.isActive
                ? '<span style="color: #2ecc71">Đang hoạt động</span>'
                : '<span style="color: #e74c3c">Đã kết thúc</span>'
            }</p>
          </div>
        `;
      });
    } else {
      console.log("Không tìm thấy khóa học đã đăng ký");
    }

    // Add pending courses
    if (pendingCourses && pendingCourses.length > 0) {
      pendingCourses.forEach((course) => {
        html += `
          <div class="course-item" onclick="viewCourseDetails('${
            course._id
          }')" style="border-left: 4px solid #f39c12; background: #fffbf0;">
            <span class="status-badge status-pending">Chờ duyệt</span>
            <h4>${
              course.courseName || course.title || "Khóa học không tên"
            }</h4>
            <p><strong>Giảng viên:</strong> ${
              course.teacherName || "Không xác định"
            }</p>
            <p><strong>Thời gian:</strong> ${
              course.startDate
                ? new Date(course.startDate).toLocaleDateString("vi-VN")
                : "N/A"
            } - ${
          course.endDate
            ? new Date(course.endDate).toLocaleDateString("vi-VN")
            : "N/A"
        }</p>
            <p style="color: #f39c12; font-style: italic;">Đang chờ giảng viên duyệt</p>
          </div>
        `;
      });
    }

    html += "</div>";
    container.innerHTML = html;
  } catch (error) {
    console.error("Lỗi tải khóa học:", error);
    document.getElementById("myCourses").innerHTML = `
      <div style="padding: 20px; background: #ffe9e8; border-radius: 8px; border-left: 5px solid #e74c3c;">
        <h4 style="color: #e74c3c;">Đã xảy ra lỗi</h4>
        <p>Không thể tải khóa học: ${error.message}</p>
        <button onclick="loadMyCourses()" class="btn btn-primary">Thử lại</button>
      </div>
    `;
  }
}

// Load available courses
async function loadAvailableCourses() {
  try {
    console.log("Đang tải danh sách khóa học có sẵn...");
    const container = document.getElementById("availableCourses");
    container.innerHTML = "<p>Đang tải khóa học...</p>";

    // First get all courses
    const allCoursesResponse = await fetch("/courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!allCoursesResponse.ok) {
      console.error("API error, status:", allCoursesResponse.status);
      try {
        const errorData = await safeJsonParse(allCoursesResponse);
        throw new Error(errorData.error || "Không thể tải danh sách khóa học");
      } catch (jsonError) {
        throw new Error("Không thể tải danh sách khóa học");
      }
    }

    // Then get my courses to filter out ones I'm already enrolled in
    const myCoursesResponse = await fetch("/courses/student/my-courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!myCoursesResponse.ok) {
      console.error("API error, status:", myCoursesResponse.status);
      try {
        const errorData = await safeJsonParse(myCoursesResponse);
        throw new Error(errorData.error || "Không thể tải khóa học của bạn");
      } catch (jsonError) {
        throw new Error("Không thể tải khóa học của bạn");
      }
    }

    const allCourses = await safeJsonParse(allCoursesResponse);
    const myCourses = await safeJsonParse(myCoursesResponse);

    console.log(`Đã tải ${allCourses ? allCourses.length : 0} khóa học có sẵn`);
    console.log(
      `Đã tải ${myCourses ? myCourses.length : 0} khóa học đã đăng ký`
    );

    // Filter out courses I'm already enrolled in
    const myCoursesIds = myCourses.map((course) => course._id);

    // Get current user information to check pending enrollments
    const userId = JSON.parse(atob(token.split(".")[1]))._id;

    // Filter out courses I'm already enrolled in or have pending enrollment
    const availableCourses = allCourses.filter((course) => {
      // Skip courses I'm already enrolled in
      if (myCoursesIds.includes(course._id)) return false;

      // Skip courses I have pending enrollment
      if (course.pendingStudents && Array.isArray(course.pendingStudents)) {
        if (
          course.pendingStudents.some(
            (id) => id === userId || id.toString() === userId.toString()
          )
        ) {
          console.log(
            `Course ${course.courseName} has pending enrollment, skipping`
          );
          return false;
        }
      }

      // Skip courses that are already full
      if (
        course.students &&
        course.maxStudents &&
        course.students.length >= course.maxStudents
      ) {
        console.log(
          `Course ${course.courseName} is full (${course.students.length}/${course.maxStudents}), skipping`
        );
        return false;
      }

      return true;
    });

    if (!availableCourses || availableCourses.length === 0) {
      container.innerHTML = "<p>Không có khóa học mới nào có sẵn.</p>";
      return;
    }

    container.innerHTML = '<div class="course-list">';
    availableCourses.forEach((course) => {
      container.innerHTML += `
        <div class="course-item" onclick="viewAvailableCourseDetails('${
          course._id
        }')" style="border-left: 4px solid #3498db;">
          <h4>${course.courseName || course.title || "Khóa học không tên"}</h4>
          <p><strong>Giảng viên:</strong> ${
            course.teacherName || "Không xác định"
          }</p>
          <p><strong>Thời gian:</strong> ${
            course.startDate
              ? new Date(course.startDate).toLocaleDateString("vi-VN")
              : "N/A"
          } - ${
        course.endDate
          ? new Date(course.endDate).toLocaleDateString("vi-VN")
          : "N/A"
      }</p>
          <button class="register-button" onclick="event.stopPropagation(); registerForCourse('${
            course._id
          }')">
            <i class="fas fa-plus-circle"></i> Đăng ký khóa học
          </button>
        </div>
      `;
    });
    container.innerHTML += "</div>";
  } catch (error) {
    console.error("Lỗi tải khóa học có sẵn:", error);
    document.getElementById("availableCourses").innerHTML = `
      <div style="padding: 20px; background: #ffe9e8; border-radius: 8px; border-left: 5px solid #e74c3c;">
        <h4 style="color: #e74c3c;">Đã xảy ra lỗi</h4>
        <p>Không thể tải khóa học có sẵn: ${error.message}</p>
        <button onclick="loadAvailableCourses()" class="btn btn-primary">Thử lại</button>
      </div>
    `;
  }
}

// Load my assignments
async function loadMyAssignments() {
  try {
    console.log("Đang tải bài tập của học viên...");
    const container = document.getElementById("assignmentsList");
    container.innerHTML = "<p>Đang tải bài tập...</p>";

    // First get my courses
    const coursesResponse = await fetch("/courses/student/my-courses", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Phản hồi từ API khóa học:", coursesResponse.status);

    if (!coursesResponse.ok) {
      console.error("Course API error, status:", coursesResponse.status);
      try {
        const errorData = await safeJsonParse(coursesResponse);
        throw new Error(errorData.error || "Không thể tải khóa học");
      } catch (jsonError) {
        throw new Error("Không thể tải khóa học");
      }
    }

    const courses = await safeJsonParse(coursesResponse);
    console.log(`Đã tải ${courses ? courses.length : 0} khóa học`);

    if (!courses || courses.length === 0) {
      container.innerHTML = "<p>Bạn chưa có khóa học nào.</p>";
      return;
    }

    let allAssignments = [];

    // Get assignments for each course
    for (const course of courses) {
      try {
        if (!course._id) {
          console.error("Khóa học không có ID:", course);
          continue;
        }

        console.log(`Đang tải bài tập cho khóa học: ${course._id}`);
        const assignmentsResponse = await fetch(
          `/assignments/course/${course._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (assignmentsResponse.ok) {
          const assignments = await safeJsonParse(assignmentsResponse);
          if (assignments && Array.isArray(assignments)) {
            console.log(
              `Đã tải ${assignments.length} bài tập cho khóa học ${course._id}`
            );

            allAssignments = allAssignments.concat(
              assignments.map((a) => ({
                ...a,
                courseName:
                  course.courseName || course.title || "Khóa học không tên",
                courseId: course._id,
              }))
            );
          } else {
            console.error("Invalid assignments data for course:", course._id);
          }
        } else {
          console.error(
            `Lỗi tải bài tập cho khóa học ${course._id}: ${assignmentsResponse.status}`
          );
          try {
            const errorData = await safeJsonParse(assignmentsResponse).catch(
              () => ({})
            );
            console.error("Chi tiết lỗi:", errorData);
          } catch (jsonError) {
            console.error("Không thể phân tích dữ liệu lỗi");
          }
        }
      } catch (error) {
        console.error(`Lỗi tải bài tập cho khóa học ${course._id}:`, error);
      }
    }

    console.log(`Tổng số bài tập đã tải: ${allAssignments.length}`);

    if (allAssignments.length === 0) {
      container.innerHTML = "<p>Chưa có bài tập nào.</p>";
      return;
    }

    // Sort assignments by due date (newest first)
    allAssignments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

    container.innerHTML = allAssignments
      .map((assignment) => {
        try {
          const dueDate = new Date(assignment.dueDate);
          const isOverdue = dueDate < new Date();

          // Safely check submissions
          let hasSubmission = false;
          let mySubmission = null;

          if (assignment.submissions && Array.isArray(assignment.submissions)) {
            hasSubmission = assignment.submissions.some(
              (s) =>
                (s.studentId &&
                  currentUser &&
                  s.studentId === currentUser._id) ||
                (s.studentId &&
                  currentUser &&
                  s.studentId.toString &&
                  currentUser._id &&
                  s.studentId.toString() === currentUser._id.toString())
            );

            if (hasSubmission) {
              mySubmission = assignment.submissions.find(
                (s) =>
                  (s.studentId &&
                    currentUser &&
                    s.studentId === currentUser._id) ||
                  (s.studentId &&
                    currentUser &&
                    s.studentId.toString &&
                    currentUser._id &&
                    s.studentId.toString() === currentUser._id.toString())
              );
            }
          }

          let statusClass = "status-pending";
          let statusText = "Chưa nộp";

          if (hasSubmission && mySubmission) {
            if (mySubmission.grade !== undefined) {
              statusClass = "status-graded";
              statusText = `Đã chấm điểm: ${mySubmission.grade}/${
                assignment.maxScore || 100
              }`;
            } else {
              statusClass = "status-submitted";
              statusText = "Đã nộp";
            }
          }

          return `
            <div class="assignment-item">
              <div class="assignment-header">
                <h4>${assignment.title || "Bài tập không tên"}</h4>
                <span class="assignment-status ${statusClass}">${statusText}</span>
              </div>
              <p><strong>Khóa học:</strong> ${
                assignment.courseName || "Không xác định"
              }</p>
              <p>${assignment.description || "Không có mô tả"}</p>
              <p><strong>Hạn nộp:</strong> ${dueDate.toLocaleString("vi-VN")} 
                ${
                  isOverdue && !hasSubmission
                    ? '<span style="color: red;">(Đã quá hạn)</span>'
                    : ""
                }
              </p>
              <div style="text-align: right; margin-top: 10px;">
                <button class="btn btn-primary" onclick="viewAssignment('${
                  assignment._id
                }')">
                  Xem chi tiết
                </button>
                ${
                  !hasSubmission
                    ? `
                  <button class="btn btn-primary" onclick="submitAssignment('${assignment._id}')">
                    Nộp bài
                  </button>
                `
                    : ""
                }
              </div>
            </div>
          `;
        } catch (itemError) {
          console.error("Error rendering assignment item:", itemError);
          return `<div class="assignment-item">
            <p>Lỗi hiển thị bài tập</p>
          </div>`;
        }
      })
      .join("");
  } catch (error) {
    console.error("Lỗi tải bài tập:", error);
    document.getElementById(
      "assignmentsList"
    ).innerHTML = `<p>Lỗi tải bài tập: ${error.message}</p>
       <button onclick="loadMyAssignments()" class="btn btn-primary">Thử lại</button>`;
  }
}

// Load notifications
async function loadNotifications() {
  try {
    console.log("Đang tải thông báo...");
    const container = document.getElementById("notificationsList");
    container.innerHTML = "<p>Đang tải thông báo...</p>";

    const response = await fetch("/notifications/my-notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Notification API response status:", response.status);

    if (!response.ok) {
      console.error("Notification API error, status:", response.status);
      container.innerHTML = "<p>Lỗi tải thông báo. Vui lòng thử lại sau.</p>";
      return;
    }

    try {
      const notifications = await safeJsonParse(response);
      console.log(`Loaded ${notifications.length} notifications`);

      if (!notifications || notifications.length === 0) {
        container.innerHTML = "<p>Không có thông báo nào.</p>";
        return;
      }

      container.innerHTML = notifications
        .map((notification) => {
          const isUnread =
            !notification.readBy ||
            (Array.isArray(notification.readBy) &&
              !notification.readBy.includes(currentUser._id) &&
              !notification.readBy.some(
                (id) => id.toString() === currentUser._id.toString()
              ));

          return `
          <div class="notification-item ${
            isUnread ? "unread" : ""
          }" onclick="markNotificationRead('${notification._id}')">
            <div class="notification-header">
              <h4 class="notification-title">${
                notification.title || "Không có tiêu đề"
              }</h4>
              <span class="notification-time">${new Date(
                notification.createdAt
              ).toLocaleString("vi-VN")}</span>
            </div>
            <p>${notification.content || ""}</p>
            ${
              notification.priority === "urgent"
                ? '<span class="badge badge-danger">Khẩn cấp</span>'
                : ""
            }
          </div>
        `;
        })
        .join("");
    } catch (jsonError) {
      console.error("Error parsing notification JSON:", jsonError);
      container.innerHTML = "<p>Lỗi xử lý dữ liệu thông báo.</p>";
    }
  } catch (error) {
    console.error("Error loading notifications:", error);
    document.getElementById("notificationsList").innerHTML =
      "<p>Lỗi tải thông báo. Vui lòng thử lại sau.</p>";
  }
}

// Load unread notifications count
async function loadUnreadNotifications() {
  try {
    const response = await fetch("/notifications/unread", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.log(
        "Failed to load unread notifications, status:",
        response.status
      );
      // Set count to 0 and don't throw error to prevent page load failure
      unreadCountEl.textContent = "0";
      return;
    }

    try {
      const unreadNotifications = await safeJsonParse(response);
      unreadCountEl.textContent = unreadNotifications.length || "0";
    } catch (error) {
      console.error("Error parsing unread notifications response:", error);
      unreadCountEl.textContent = "0";
    }
  } catch (error) {
    console.error("Error loading unread notifications:", error);
    // Set count to 0 to prevent UI issues
    unreadCountEl.textContent = "0";
  }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
  try {
    console.log(`Marking notification ${notificationId} as read...`);

    const response = await fetch(`/notifications/${notificationId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(
        `Failed to mark notification ${notificationId} as read, status:`,
        response.status
      );
      return;
    }

    console.log(`Notification ${notificationId} marked as read successfully`);

    // Reload notifications and unread count
    loadNotifications();
    loadUnreadNotifications();
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  try {
    console.log("Marking all notifications as read...");

    const response = await fetch("/notifications/mark-all-read", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(
        "Failed to mark all notifications as read, status:",
        response.status
      );
      alert(
        "Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại sau."
      );
      return;
    }

    console.log("All notifications marked as read successfully");

    // Reload notifications and unread count
    loadNotifications();
    loadUnreadNotifications();
    alert("Đã đánh dấu tất cả thông báo là đã đọc");
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    alert("Lỗi đánh dấu thông báo");
  }
}

// Fill profile form
function fillProfileForm() {
  if (!currentUser) return;

  document.getElementById("fullName").value = currentUser.fullName || "";
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
          studentNameEl.textContent = `Xin chào, ${
            currentUser.fullName || currentUser.name || "Học viên"
          }`;
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

// View assignment details
async function viewAssignment(assignmentId) {
  try {
    console.log(`Loading assignment details: ${assignmentId}`);

    // Show loading state
    document.getElementById("overlay").style.display = "block";
    document.getElementById("assignmentDetailModal").style.display = "block";
    document.getElementById("viewAssignmentTitle").textContent = "Đang tải...";

    const response = await fetch(`/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(`Assignment API error, status: ${response.status}`);
      throw new Error("Không thể tải thông tin bài tập");
    }

    const assignment = await safeJsonParse(response);
    if (!assignment) {
      throw new Error("Không thể tải thông tin bài tập");
    }

    console.log("Assignment details loaded");

    // Get my submission if any
    let submission = null;
    try {
      const submissionResponse = await fetch(
        `/assignments/${assignmentId}/my-submission`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (submissionResponse.ok) {
        const submissionData = await safeJsonParse(submissionResponse);
        if (
          submissionData &&
          submissionData.submissions &&
          submissionData.submissions.length > 0
        ) {
          submission = submissionData.submissions[0];
          console.log("Submission found:", submission);
        }
      } else {
        console.log("No submission found or error getting submission");
      }
    } catch (submissionError) {
      console.error("Error getting submission:", submissionError);
      // Continue without submission data
    }

    // Fill in assignment details
    document.getElementById("viewAssignmentTitle").textContent =
      assignment.title || "Bài tập không tên";
    document.getElementById("viewAssignmentCourse").textContent =
      assignment.courseName || "Không xác định";
    document.getElementById("viewAssignmentDescription").textContent =
      assignment.description || "Không có mô tả";
    document.getElementById("viewAssignmentInstructions").textContent =
      assignment.instructions || "Không có hướng dẫn";

    try {
      document.getElementById("viewAssignmentDueDate").textContent =
        assignment.dueDate
          ? new Date(assignment.dueDate).toLocaleString("vi-VN")
          : "Không xác định";
    } catch (dateError) {
      console.error("Error formatting due date:", dateError);
      document.getElementById("viewAssignmentDueDate").textContent =
        "Không xác định";
    }

    document.getElementById("viewAssignmentMaxScore").textContent =
      assignment.maxScore || 100;

    // Show submission if exists
    const submissionDetailEl = document.getElementById("submissionDetail");
    const submitBtn = document.getElementById("submitAssignmentBtn");

    if (submission) {
      submissionDetailEl.style.display = "block";
      submitBtn.style.display = "none";

      try {
        document.getElementById("submissionDate").textContent =
          submission.submittedAt
            ? new Date(submission.submittedAt).toLocaleString("vi-VN")
            : "Không xác định";
      } catch (dateError) {
        console.error("Error formatting submission date:", dateError);
        document.getElementById("submissionDate").textContent =
          "Không xác định";
      }

      document.getElementById("submissionContent").textContent =
        submission.content || "Không có nội dung";

      // Display files if any
      const filesEl = document.getElementById("submissionFiles");
      if (
        submission.fileUrls &&
        Array.isArray(submission.fileUrls) &&
        submission.fileUrls.length > 0
      ) {
        filesEl.innerHTML =
          "<p><strong>Tệp đính kèm:</strong></p><ul>" +
          submission.fileUrls
            .map(
              (url) => `<li><a href="${url}" target="_blank">${url}</a></li>`
            )
            .join("") +
          "</ul>";
      } else {
        filesEl.innerHTML = "<p>Không có tệp đính kèm</p>";
      }

      // Show grading info if graded
      const gradingInfoEl = document.getElementById("gradingInfo");
      if (submission.grade !== undefined) {
        gradingInfoEl.style.display = "block";
        document.getElementById("submissionGrade").textContent = `${
          submission.grade
        }/${assignment.maxScore || 100}`;
        document.getElementById("submissionFeedback").textContent =
          submission.feedback || "Không có nhận xét";
      } else {
        gradingInfoEl.style.display = "none";
      }
    } else {
      submissionDetailEl.style.display = "none";

      // Check if assignment is still open
      const isOverdue = new Date(assignment.dueDate) < new Date();
      if (!isOverdue) {
        submitBtn.style.display = "block";
        submitBtn.onclick = () => submitAssignment(assignmentId);
      } else {
        submitBtn.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error viewing assignment:", error);

    // Display error in modal
    document.getElementById("viewAssignmentTitle").textContent =
      "Lỗi tải bài tập";
    document.getElementById("viewAssignmentDescription").textContent =
      error.message || "Không thể tải thông tin bài tập";
    document.getElementById("viewAssignmentCourse").textContent = "";
    document.getElementById("viewAssignmentInstructions").textContent = "";
    document.getElementById("viewAssignmentDueDate").textContent = "";
    document.getElementById("viewAssignmentMaxScore").textContent = "";

    document.getElementById("submissionDetail").style.display = "none";
    document.getElementById("submitAssignmentBtn").style.display = "none";
  }
}

// Submit assignment
function submitAssignment(assignmentId) {
  // Get assignment details first to show in modal
  fetch(`/assignments/${assignmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải thông tin bài tập");
      return response.json();
    })
    .then((assignment) => {
      document.getElementById("assignmentTitle").textContent = assignment.title;
      document.getElementById("assignmentDescription").textContent =
        assignment.description || "Không có mô tả";
      document.getElementById("assignmentDueDate").textContent = new Date(
        assignment.dueDate
      ).toLocaleString("vi-VN");

      document.getElementById("submitAssignmentId").value = assignmentId;
      document.getElementById("assignmentContent").value = "";
      document.getElementById("assignmentFileUrls").value = "";

      // Show submission modal
      document.getElementById("overlay").style.display = "block";
      document.getElementById("assignmentSubmitModal").style.display = "block";
    })
    .catch((error) => {
      console.error("Lỗi tải thông tin bài tập:", error);
      alert("Không thể tải thông tin bài tập: " + error.message);
    });
}

// Setup assignment submission form handler
document.addEventListener("DOMContentLoaded", function () {
  // Existing event listeners...

  // Add submission form handler
  document
    .getElementById("assignmentSubmitForm")
    .addEventListener("submit", handleAssignmentSubmit);
});

async function handleAssignmentSubmit(e) {
  e.preventDefault();

  try {
    const assignmentId = document.getElementById("submitAssignmentId").value;
    const content = document.getElementById("assignmentContent").value;
    const fileUrlsInput = document.getElementById("assignmentFileUrls").value;

    // Process file URLs - split by line and filter out empty lines
    const fileUrls = fileUrlsInput
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url !== "");

    // Validate submission
    if (!content && fileUrls.length === 0) {
      alert(
        "Vui lòng nhập nội dung bài làm hoặc cung cấp ít nhất một đường dẫn tệp"
      );
      return;
    }

    // Send submission to server
    const response = await fetch(`/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        fileUrls,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Không thể nộp bài tập");
    }

    // Close modal and reload assignments
    closeAssignmentModal();
    loadMyAssignments();

    // Show success message
    alert("Nộp bài thành công!");
  } catch (error) {
    console.error("Lỗi khi nộp bài:", error);
    alert("Lỗi khi nộp bài: " + error.message);
  }
}

function closeAssignmentModal() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("assignmentSubmitModal").style.display = "none";
}

function closeAssignmentDetailModal() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("assignmentDetailModal").style.display = "none";
}

function closeModal() {
  document.getElementById("overlay").style.display = "none";
  document.getElementById("courseDetailModal").style.display = "none";
}

// View course details
async function viewCourseDetails(courseId) {
  try {
    const response = await fetch(`/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Không thể tải thông tin khóa học");

    const course = await response.json();

    // Store the course ID in the modal's dataset for later use
    document.getElementById("courseDetailModal").dataset.courseId = courseId;

    // Fill in course details
    document.getElementById("courseTitle").textContent =
      course.courseName || course.title || "Khóa học không tên";
    document.getElementById("courseDescription").textContent =
      course.description || "Không có mô tả";

    // Get teacher info if available
    if (course.teacherId) {
      try {
        // Set default value first in case the fetch fails
        document.getElementById("courseTeacher").textContent = "Không xác định";

        const teacherResponse = await fetch(`/teachers/${course.teacherId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (teacherResponse.ok) {
          const teacher = await teacherResponse.json();
          document.getElementById("courseTeacher").textContent =
            teacher.name || "Không xác định";
        } else {
          console.log(`Teacher not found: ${course.teacherId}`);
        }
      } catch (error) {
        console.error("Error fetching teacher info:", error);
      }
    } else {
      document.getElementById("courseTeacher").textContent = "Không xác định";
    }

    document.getElementById("courseDuration").textContent =
      course.duration || "Không xác định";
    document.getElementById("courseStart").textContent = course.startDate
      ? new Date(course.startDate).toLocaleDateString("vi-VN")
      : "Không xác định";
    document.getElementById("courseEnd").textContent = course.endDate
      ? new Date(course.endDate).toLocaleDateString("vi-VN")
      : "Không xác định";

    // Display schedule if available
    const scheduleEl = document.getElementById("courseSchedule");
    if (
      course.schedule &&
      Array.isArray(course.schedule) &&
      course.schedule.length > 0
    ) {
      scheduleEl.innerHTML = course.schedule
        .map((item) => {
          if (typeof item === "object" && item.day && item.time) {
            return `<li>${item.day}: ${item.time}</li>`;
          } else {
            return `<li>${item}</li>`;
          }
        })
        .join("");
    } else {
      scheduleEl.innerHTML = "<li>Không có thông tin lịch học</li>";
    }

    // Check if student is approved for this course
    const isApproved =
      course.students &&
      Array.isArray(course.students) &&
      course.students.some((student) => {
        if (typeof student === "object" && student.studentId) {
          return student.studentId.toString() === currentUser._id.toString();
        }
        return student.toString() === currentUser._id.toString();
      });

    // Only show Meet link if student is approved
    const meetLinkEl = document.getElementById("courseMeetLink");
    const meetLinkRow = document.getElementById("meetLinkRow");

    if (isApproved && course.meetLink) {
      meetLinkEl.href = course.meetLink;
      meetLinkEl.textContent = course.meetLink;
      meetLinkRow.style.display = "table-row";
    } else {
      meetLinkRow.style.display = "none";
      // If pending, show a message
      if (!isApproved) {
        const pendingNote = document.getElementById("pendingMeetLinkNote");
        if (!pendingNote) {
          const note = document.createElement("p");
          note.id = "pendingMeetLinkNote";
          note.style.color = "#f39c12";
          note.style.fontStyle = "italic";
          note.innerHTML =
            "Link Google Meet sẽ hiển thị sau khi bạn được duyệt vào khóa học";
          meetLinkRow.parentNode.parentNode.appendChild(note);
        }
      }
    }

    // Show QR code if available
    const qrCodeEl = document.getElementById("courseQrCode");
    if (qrCodeEl && course.qrCodeUrl) {
      qrCodeEl.src = course.qrCodeUrl;
      qrCodeEl.style.display = "block";
    } else if (qrCodeEl) {
      qrCodeEl.style.display = "none";
    }

    // Hide the register button since student is already enrolled
    const registerButton = document.querySelector(
      "#courseDetailModal .btn-primary"
    );
    if (registerButton) {
      registerButton.style.display = "none";
    }

    // Show the modal
    document.getElementById("overlay").style.display = "block";
    document.getElementById("courseDetailModal").style.display = "block";
  } catch (error) {
    console.error("Error viewing course details:", error);
    alert("Không thể tải thông tin khóa học: " + error.message);
  }
}

// Show notifications
function showNotifications() {
  showTab("notifications");
}

// Show profile
function showProfile() {
  showTab("profile");
}

// Logout
function logout() {
  localStorage.removeItem("token");
  window.location.href = "/index.html";
}

// Global error handler to catch SOURCE_LANG_VI errors
window.addEventListener("unhandledrejection", function (event) {
  // Check if it's the SOURCE_LANG_VI error
  console.log("Unhandled promise rejection:", event.reason);

  if (event.reason && event.reason.error === "SOURCE_LANG_VI") {
    // This is the specific error we're trying to handle
    console.log("Handling SOURCE_LANG_VI error");
    event.preventDefault(); // Prevent it from showing in console
  }
});

// Utility function to safely parse API responses
async function safeJsonParse(response) {
  try {
    return await response.json();
  } catch (error) {
    if (error.message && error.message.includes("JSON")) {
      console.error("Invalid JSON in API response:", error);
      throw new Error("Lỗi định dạng dữ liệu từ máy chủ");
    }
    throw error;
  }
}

// Function to register for a course
async function registerForCourse(courseId) {
  try {
    // First get course details to show info
    const courseResponse = await fetch(`/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!courseResponse.ok) {
      throw new Error("Không thể tải thông tin khóa học");
    }

    const course = await courseResponse.json();

    // Show confirmation dialog
    const confirmRegistration = confirm(
      `Xác nhận đăng ký khóa học: ${course.courseName || course.title}?\n\n` +
        `Sau khi đăng ký, giảng viên sẽ xem xét và duyệt yêu cầu của bạn.`
    );

    if (!confirmRegistration) return;

    console.log(`Sending enrollment request for course: ${courseId}`);

    const response = await fetch(`/courses/${courseId}/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId: currentUser._id }),
    });

    console.log(`Enrollment response status: ${response.status}`);

    // Log full response for debugging purposes
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    // Parse the response if it's JSON
    let errorMessage = "Không thể đăng ký khóa học";
    let errorData = null;

    try {
      if (responseText) {
        errorData = JSON.parse(responseText);
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      }
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
    }

    // Re-check if response was successful
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 400) {
        // Common enrollment issues
        if (errorMessage.includes("đã đăng ký")) {
          alert("Bạn đã đăng ký khóa học này rồi.");
          loadMyCourses(); // Reload courses to show enrollment
          showTab("courses");
          return;
        } else if (errorMessage.includes("chờ duyệt")) {
          alert(
            "Yêu cầu đăng ký của bạn đã được gửi và đang chờ giảng viên duyệt."
          );
          loadMyCourses(); // Reload courses to reflect pending status
          showTab("courses");
          return;
        } else if (errorMessage.includes("đầy")) {
          alert(
            "Khóa học đã đạt số lượng tối đa học viên. Vui lòng chọn khóa học khác."
          );
          return;
        } else {
          // For other 400 errors, provide a generic message
          alert(`Không thể đăng ký khóa học: ${errorMessage}`);
          return;
        }
      }

      throw new Error(errorMessage);
    }

    // If we successfully parsed a JSON response with success=true message
    if (errorData && errorData.success) {
      // Show success message
      alert(
        errorData.message ||
          "Đăng ký khóa học thành công! Vui lòng chờ giảng viên duyệt."
      );

      // Reload both course lists
      loadAvailableCourses();
      loadMyCourses();

      // Switch to my courses tab
      showTab("courses");
      return;
    }

    // Fallback success message (should rarely hit this)
    alert("Đăng ký khóa học thành công! Vui lòng chờ giảng viên duyệt.");

    // Reload both course lists
    loadAvailableCourses();
    loadMyCourses();

    // Switch to my courses tab
    showTab("courses");
  } catch (error) {
    console.error("Lỗi khi đăng ký khóa học:", error);
    alert("Lỗi khi đăng ký khóa học: " + (error.message || "Không xác định"));
  }
}

// View available course details - similar to viewCourseDetails but shows register button
async function viewAvailableCourseDetails(courseId) {
  try {
    const response = await fetch(`/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Không thể tải thông tin khóa học");

    const course = await response.json();

    // Store the course ID in the modal's dataset for later use
    document.getElementById("courseDetailModal").dataset.courseId = courseId;

    // Fill in course details
    document.getElementById("courseTitle").textContent =
      course.courseName || course.title || "Khóa học không tên";
    document.getElementById("courseDescription").textContent =
      course.description || "Không có mô tả";

    // Get teacher info if available
    if (course.teacherId) {
      try {
        // Set default value first in case the fetch fails
        document.getElementById("courseTeacher").textContent = "Không xác định";

        const teacherResponse = await fetch(`/teachers/${course.teacherId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (teacherResponse.ok) {
          const teacher = await teacherResponse.json();
          document.getElementById("courseTeacher").textContent =
            teacher.name || "Không xác định";
        } else {
          console.log(`Teacher not found: ${course.teacherId}`);
        }
      } catch (error) {
        console.error("Error fetching teacher info:", error);
      }
    } else {
      document.getElementById("courseTeacher").textContent = "Không xác định";
    }

    document.getElementById("courseDuration").textContent =
      course.duration || "Không xác định";
    document.getElementById("courseStart").textContent = course.startDate
      ? new Date(course.startDate).toLocaleDateString("vi-VN")
      : "Không xác định";
    document.getElementById("courseEnd").textContent = course.endDate
      ? new Date(course.endDate).toLocaleDateString("vi-VN")
      : "Không xác định";

    // Display schedule if available
    const scheduleEl = document.getElementById("courseSchedule");
    if (
      course.schedule &&
      Array.isArray(course.schedule) &&
      course.schedule.length > 0
    ) {
      scheduleEl.innerHTML = course.schedule
        .map((item) => `<li>${item}</li>`)
        .join("");
    } else {
      scheduleEl.innerHTML = "<li>Không có thông tin lịch học</li>";
    }

    // Display Meet link if available
    const meetLinkEl = document.getElementById("courseMeetLink");
    if (course.meetLink) {
      meetLinkEl.href = course.meetLink;
      meetLinkEl.textContent = course.meetLink;
    } else {
      meetLinkEl.href = "#";
      meetLinkEl.textContent = "Không có";
    }

    // Handle QR code if available
    const qrCodeEl = document.getElementById("courseQrCode");
    if (qrCodeEl && course.qrCodeUrl) {
      qrCodeEl.src = course.qrCodeUrl;
      qrCodeEl.style.display = "block";
    } else if (qrCodeEl) {
      qrCodeEl.style.display = "none";
    }

    // Hide payment information sections if they exist
    const paymentInfoEl = document.querySelector(".payment-info");
    if (paymentInfoEl) {
      paymentInfoEl.style.display = "none";
    }

    // Show the register button since this is an available course
    const registerButton = document.querySelector(
      "#courseDetailModal .btn-primary"
    );
    if (registerButton) {
      registerButton.style.display = "block";
      registerButton.textContent = "Đăng ký khóa học";
    }

    // Show the modal
    document.getElementById("overlay").style.display = "block";
    document.getElementById("courseDetailModal").style.display = "block";
  } catch (error) {
    console.error("Error viewing course details:", error);
    alert("Không thể tải thông tin khóa học: " + error.message);
  }
}
