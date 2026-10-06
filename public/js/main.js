(function () {
  const boxName = document.getElementById('box-name');
  const currentScore = document.getElementById('current-score');
  const currentCount = document.getElementById('current-count');
  const listDiv = document.getElementById('list');
  const banner = document.getElementById('locked-banner');
  const nextBtn = document.getElementById('next-btn');

  let contestants = [];
  let currentIndex = 0;
  let judges = Number(document.body.dataset.judges || '0');

  function formatScore(c) {
    if (!c) return '--';
    if (Number(c.submittedCount || 0) === 0) return '--';
    return Number(c.avg || 0).toFixed(2);
  }

  function listLabel(c) {
    if (!c) return '';
    const name = c.name || '';
    if (Number(c.submittedCount || 0) === 0) return name;
    return name + ' - ' + Number(c.avg || 0).toFixed(2);
  }

  function currentContestant() {
    if (contestants.length === 0) return null;
    return contestants[currentIndex % contestants.length];
  }

  function renderCurrent() {
    const c = currentContestant();
    if (boxName) boxName.textContent = c ? (c.name || '--') : '--';
    if (currentScore) currentScore.textContent = formatScore(c);
    if (currentCount) {
      const submitted = c ? Number(c.submittedCount || 0) : 0;
      currentCount.textContent = submitted + '/' + judges + ' judges';
    }
  }

  function renderList() {
    try {
      if (!listDiv) return;
      const items = listDiv.querySelectorAll('.list-item');
      if (items.length !== contestants.length) {
        listDiv.innerHTML = '';
        for (let i = 0; i < contestants.length; i++) {
          const item = document.createElement('div');
          item.className = 'list-item';
          const name = document.createElement('span');
          name.className = 'name';
          item.appendChild(name);
          listDiv.appendChild(item);
        }
      }
      const newItems = listDiv.querySelectorAll('.list-item');
      for (let i = 0; i < newItems.length; i++) {
        newItems[i].classList.toggle('current', i === currentIndex);
        const c = contestants[i];
        const nameEl = newItems[i].querySelector('.name');
        if (nameEl) nameEl.textContent = listLabel(c);
      }
    } catch (err) {
      console.error('Failed to render contestant list:', err);
    }
  }

  function render() {
    renderCurrent();
    renderList();
  }

  function applyState(data) {
    if (!data) return false;
    if (Array.isArray(data.contestants)) contestants = data.contestants;
    if (typeof data.currentIndex === 'number') currentIndex = data.currentIndex;
    if (typeof data.judgesCount === 'number') judges = data.judgesCount;
    return true;
  }

  async function fetchState() {
    try {
      const res = await fetch('/api/state', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('state request failed with status ' + res.status);
      const data = await res.json();
      if (!applyState(data)) throw new Error('state payload missing');
      render();
    } catch (err) {
      console.error('Failed to load state:', err);
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async function () {
      if (contestants.length === 0) return;

      currentIndex = (currentIndex + 1) % contestants.length;
      render();

      try {
        const res = await fetch('/main/next', { method: 'POST' });
        if (res.redirected) {
          window.location.href = res.url;
          return;
        }
        const data = await res.json();
        if (applyState(data)) render();
        else await fetchState();
      } catch (err) {
        console.error('Failed to update next contestant on server:', err);
        fetchState();
      }
    });
  }

  // Poll first so realtime wiring can never block state loading.
  fetchState();
  setInterval(fetchState, 2000);

  try {
    const socket = typeof window.io === 'function' ? window.io() : null;
    if (socket && typeof socket.on === 'function') {
      socket.on('score_updated', function (payload) {
        if (applyState(payload)) render();
      });
      socket.on('state_changed', function () { fetchState(); });
      socket.on('event_locked', function () { if (banner) banner.classList.remove('hidden'); });
      socket.on('event_unlocked', function () { if (banner) banner.classList.add('hidden'); });
    }
  } catch (err) {
    console.error('Realtime updates unavailable:', err);
  }
})();