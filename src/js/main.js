// ------------------- Genre Toggle -------------------
window.addEventListener('load', () => {
  const toggleBtn = document.getElementById('toggle-genres');
  const divider = document.getElementById('divider1');
  const containers = document.querySelectorAll('.genre-container');

  // --- Initial state ---
  divider.classList.remove('collapsed'); // genres visible
  containers.forEach(container => container.classList.remove('hidden'));
  toggleBtn.textContent = '▲ Show Less';

  // --- Click toggle handler ---
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = divider.classList.contains('collapsed');

    // Toggle collapsed state
    divider.classList.toggle('collapsed', !isCollapsed);

    // Hide or show genre containers
    containers.forEach(container =>
      container.classList.toggle('hidden', !isCollapsed)
    );

    // Update button text
    toggleBtn.textContent = isCollapsed ? '▲ Show Less' : '▼ Show More';
  });
});

// ------------------- Review Panel -------------------
const reviewBtn = document.getElementById('review-btn');
const reviewPanel = document.getElementById('review-panel');
const overlay = document.getElementById('review-overlay');
const closeReview = document.getElementById('close-review');
const resetBtn = document.getElementById('reset-btn');

reviewBtn.addEventListener('click', () => {
  reviewPanel.style.display = 'block';
  overlay.style.display = 'block';
});

closeReview.addEventListener('click', () => {
  reviewPanel.style.display = 'none';
  overlay.style.display = 'none';
});

overlay.addEventListener('click', () => {
  reviewPanel.style.display = 'none';
  overlay.style.display = 'none';
});

resetBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset your progress?")) {
    localStorage.clear();
    location.reload();
  }
});

// ------------------- Compact Mode -------------------
(function () {
  const COMPACT_BREAK_HEIGHT = 600; // px
  const COMPACT_BREAK_WIDTH = 768;  // optional for mobile width

  function checkCompactMode() {
    const isCompact = window.innerHeight <= COMPACT_BREAK_HEIGHT || window.innerWidth <= COMPACT_BREAK_WIDTH;
    document.body.classList.toggle("compact", isCompact);
    console.log("Compact mode:", isCompact, "Height:", window.innerHeight, "Width:", window.innerWidth);
  }

  // Run on load and resize
  window.addEventListener("load", () => setTimeout(checkCompactMode, 100)); // small delay to avoid layout glitches
  window.addEventListener("resize", () => {
    clearTimeout(window._resizeTimeout);
    window._resizeTimeout = setTimeout(checkCompactMode, 150);
  });
})();

// ------------------- Force "Show Less" -------------------
window.addEventListener("load", () => {
  const toggleBtn = document.getElementById("toggle-genres");
  if (toggleBtn) toggleBtn.textContent = "Show Less";
});

// ------------------- Login Redirect -------------------
const form = document.getElementById("login-register");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter both username and password.");
    return;
  }

  // Get saved users from localStorage (or empty object if none)
  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (users[username]) {
    // User exists → check password
    if (users[username] === password) {
      alert("Login successful!");
    } else {
      alert("Incorrect password.");
      return;
    }
  } else {
    // New user → register
    users[username] = password;
    localStorage.setItem("users", JSON.stringify(users));
    alert("Account registered successfully!");
  }

  // Save logged-in user
  localStorage.setItem("loggedInUser", username);

  // Redirect to main page
  window.location.href = "index.html";
});

const userMenu = document.getElementById("user-menu");
if (userMenu) {
  const username = localStorage.getItem("loggedInUser");
  const greeting = document.getElementById("user-greeting");
  const dropdown = document.getElementById("user-dropdown");
  const hamburger = document.getElementById("hamburger");
  const logoutBtn = document.getElementById("logout-btn");

  greeting.textContent = username ? `Hi, ${username}` : "Hi, Guest";

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", () => {
    dropdown.style.display = "none";
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
  });
}