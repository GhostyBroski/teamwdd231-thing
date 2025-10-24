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

  // ---- Review toggle ----
const reviewBtn = document.getElementById('review-btn');
const reviewPanel = document.getElementById('review-panel');
const overlay = document.getElementById('review-overlay');
const closeReview = document.getElementById('close-review');
const resetBtn = document.getElementById('reset-btn');

// Toggle review panel visibility
reviewBtn.addEventListener('click', () => {
  reviewPanel.style.display = 'block';
  overlay.style.display = 'block';
});

closeReview.addEventListener('click', () => {
  reviewPanel.style.display = 'none';
  overlay.style.display = 'none';
});

// Close when clicking the backdrop
overlay.addEventListener('click', () => {
  reviewPanel.style.display = 'none';
  overlay.style.display = 'none';
});

// Reset clears localStorage (except theme maybe)
resetBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset your progress?")) {
    localStorage.clear();
    location.reload();
  }
});

(function () {
  const COMPACT_BREAK = 600; // px height threshold

  function applyCompactIfNeeded() {
    if (window.innerHeight <= COMPACT_BREAK) {
      document.body.classList.add('compact');
    } else {
      document.body.classList.remove('compact');
    }
  }

  // apply on load
  window.addEventListener('load', applyCompactIfNeeded);

  // apply on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    // throttle
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(applyCompactIfNeeded, 120);
  });

  // also run once to be safe (if script is added at end)
  applyCompactIfNeeded();
})();

function checkCompactMode() {
  const isCompact = window.innerHeight <= 700; // adjust threshold to what you like
  document.body.classList.toggle("compact", isCompact);
}

window.addEventListener("load", checkCompactMode);
window.addEventListener("resize", checkCompactMode);

// Force "Show Less" text on page load
window.addEventListener("load", function() {
  const toggleBtn = document.getElementById("toggle-genres");
  if (toggleBtn) {
    toggleBtn.textContent = "Show Less";
  }
});