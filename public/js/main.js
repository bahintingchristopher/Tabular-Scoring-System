(function () {
  const boxName = document.getElementById('box-name');
  const currentScore = document.getElementById('current-score');
  const currentCount = document.getElementById('current-count');
  const listDiv = document.getElementById('list');
  const banner = document.getElementById('locked-banner');
  const nextBtn = document.getElementById('next-btn');
  const judges = Number(document.body.dataset.judges || '0');

  let contestants = [];
  let currentIndex = 0;
  let done = [];

  function formatScore(total, submitted) {
    if (submitted === 0 && (total === 0 || total === '0')) return '--';
    return total;
  }

  function renderList() {
    if (!listDiv) return;
    const items = listDiv.querySelectorAll('.list-item');
    if (items.length !== contestants.length) {
      listDiv.innerHTML = '';
      if (contestants.length === 0) return;
      for (let i = 0; i < contestants.length; i++) {
        const c = contestants[i];
        const item = document.createElement('div');
        item.className = 'list-item';
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = c.name || '';
        item.appendChild(name);
        listDiv.appendChild(item);
      }
    }
    const newItems = listDiv.querySelectorAll('.list-item');
    for (let i = 0; i < newItems.length; i++) {
      newItems[i].classList.toggle('current', i === currentIndex);
      const c = contestants[i];
      newItems[i].classList.toggle('done', c ? (done.indexOf(c.id) !== -1) : false);
    }
  }

  function renderCurrent() {
    if (contestants.length === 0) {
      if (boxName) boxName.textContent = '--';
      if (currentScore) currentScore.textContent = '--';
      if (currentCount) currentCount.textContent = '0/' + judges + ' judges';
      return;
    }
    const c = contestants[currentIndex % contestants.length];
    if (boxName) boxName.textContent = c.name || '--';
    const submitted = Number(c.submittedCount || 0);
    const total = Number(c.total || 0);
    if (currentScore) currentScore.textContent = formatScore(total, submitted);
    if (currentCount) currentCount.textContent = submitted + '/' + judges + ' judges';
  }

  function render() {
    renderList();
    renderCurrent();
  }

  async function fetchState() {
    try {
      const res = await fetch('/api/state', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.contestants) {
          contestants = data.contestants;
          render();
        }
      }
    } catch (e) {}
  }

 if (nextBtn) {
  nextBtn.addEventListener('click', async function () {
    if (contestants.length === 0) return;

    // 1. Mark current contestant as done locally
    const prev = contestants[currentIndex % contestants.length];
    if (done.indexOf(prev.id) === -1) done.push(prev.id);

    // 2. Advance index locally and render immediately
    currentIndex = (currentIndex + 1) % contestants.length;
    render();

    // 3. Sync state with backend server
    try {
      const res = await fetch('/main/next', { method: 'POST' });
      
      // If your server uses standard form redirects instead of JSON
      if (res.redirected) {
        window.location.href = res.url;
      }
    } catch (err) {
      console.error('Failed to update next contestant on server:', err);
    }
  });
}

  const socket = window.io;
  if (socket) {
    socket.on('score_updated', function (payload) {
      if (payload && payload.contestants) contestants = payload.contestants;
      render();
    });
    socket.on('event_locked', function () { if (banner) banner.classList.remove('hidden'); });
    socket.on('event_unlocked', function () { if (banner) banner.classList.add('hidden'); });
  }

  fetchState();
  setInterval(fetchState, 2000);
})();