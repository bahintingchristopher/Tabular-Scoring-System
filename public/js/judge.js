const socket = io();

socket.on('score_updated', () => {
  location.reload();
});

socket.on('event_locked', () => {
  const note = document.getElementById('locked-note');
  if (note) note.style.display = '';
  const btn = document.getElementById('submit-btn');
  if (btn) { btn.disabled = true; }
});

socket.on('event_unlocked', () => {
  const note = document.getElementById('locked-note');
  if (note) note.style.display = 'none';
  const btn = document.getElementById('submit-btn');
  if (btn && document.getElementById('choice-input') && document.getElementById('choice-input').value) {
    btn.disabled = false;
  }
});

// A-D selection for scoring card
document.addEventListener('DOMContentLoaded', () => {
  const boxes = document.querySelectorAll('.ad-box');
  const input = document.getElementById('choice-input');
  const text = document.getElementById('selected-text');
  const btn = document.getElementById('submit-btn');
  if (!boxes.length) return;

  boxes.forEach((b) => {
    b.addEventListener('click', () => {
      boxes.forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const c = b.getAttribute('data-choice');
      if (input) input.value = c;
      if (text) text.textContent = c;
      if (btn) btn.disabled = false;
    });
  });

  // if already selected
  if (input && input.value) {
    const sel = document.querySelector(.ad-box[data-choice='']);
    if (sel) sel.classList.add('active');
    if (btn) btn.disabled = false;
  }
});
