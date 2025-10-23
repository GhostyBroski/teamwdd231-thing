const toggleBtn = document.getElementById('toggle-genres');
  const divider = document.getElementById('divider1');
  const containers = document.querySelectorAll('.genre-container');

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = divider.classList.contains('collapsed');

    divider.classList.toggle('collapsed', !isCollapsed);

    containers.forEach(container => {
      container.classList.toggle('hidden', !isCollapsed);
    });

    toggleBtn.textContent = isCollapsed ? '▲ Show Less' : '▼ Show More';
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