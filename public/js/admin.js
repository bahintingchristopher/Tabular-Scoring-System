const socket = io();

socket.on('score_updated', async () => {
  // simple reload for MVP; could rebuild DOM, but reload is fine
  location.reload();
});

socket.on('contestants_changed', () => {
  location.reload();
});

socket.on('event_locked', () => {
  const el = document.getElementById('locked-status');
  if (el) el.textContent = 'YES';
});

socket.on('event_unlocked', () => {
  const el = document.getElementById('locked-status');
  if (el) el.textContent = 'NO';
});
