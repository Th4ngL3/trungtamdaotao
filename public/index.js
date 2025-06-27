const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function toggleForm() {
  loginForm.classList.toggle("hidden");
  registerForm.classList.toggle("hidden");
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  // Gửi yêu cầu POST lên server tại endpoint /users/login với dữ liệu email và password
  try {
    console.log("Attempting login for:", email);

    const res = await fetch("/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log("Login response status:", res.status);
    const result = await res.json();
    console.log("Login result:", result);

    if (res.ok && result.token) {
      // Lưu token vào localStorage
      localStorage.setItem("token", result.token);
      console.log("Token saved to localStorage");

      // Lưu thông tin user để tham chiếu sau này
      if (result.user) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: result.user._id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
          })
        );
      }

      // Chuyển hướng dựa trên vai trò người dùng
      if (result.user && result.user.role) {
        console.log("User role:", result.user.role);
        switch (result.user.role) {
          case "student":
            window.location.href = "/student-home.html";
            break;
          case "teacher":
            window.location.href = "/teacher-home.html";
            break;
          case "admin":
            window.location.href = "/admin.html";
            break;
          default:
            alert("Vai trò không hợp lệ!");
        }
      } else {
        alert("Không xác định được vai trò người dùng!");
      }
    } else {
      alert(result.error || "Đăng nhập thất bại!");
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    alert("Lỗi kết nối đến máy chủ. Vui lòng thử lại sau!");
  }
}

async function handleRegister() {
  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  const res = await fetch("/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const result = await res.json();
  alert(result.success ? "Đăng ký thành công!" : result.error || "Lỗi!");
}
