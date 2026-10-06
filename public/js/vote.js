(function () {
  const list = document.getElementById('vote-list');
  const lockedNote = document.getElementById('locked-note');

  let submitting = false;
  if (list) {
    list.addEventListener('submit', function (e) {
      if (submitting) { e.preventDefault(); return; }
      submitting = true;
      list.style.pointerEvents = 'none';
      const btn = e.target.querySelector('.vote-btn');
      if (btn) {
        const mark = btn.querySelector('.v-mark');
        if (mark) { mark.textContent = 'Recording...'; mark.style.display = 'inline-block'; }
      }
    });
  }

  function setLocked(locked) {
    if (lockedNote) lockedNote.style.display = locked ? '' : 'none';
    const buttons = document.querySelectorAll('.vote-btn');
    for (let i = 0; i < buttons.length; i++) buttons[i].disabled = locked;
    if (locked && list) list.style.pointerEvents = 'none';
  }

  try {
    const socket = typeof window.io === 'function' ? window.io() : null;
    if (socket && typeof socket.on === 'function') {
      socket.on('event_locked', function () { setLocked(true); });
      socket.on('event_unlocked', function () { setLocked(false); submitting = false; if (list) list.style.pointerEvents = ''; });
    }
  } catch (err) {
    console.error('Realtime updates unavailable:', err);
  }
})();