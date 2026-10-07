(function () {
  const boxName = document.getElementById('box-name');
  const currentScore = document.getElementById('current-score');
  const scoreBreakdown = document.getElementById('score-breakdown');
  const currentCount = document.getElementById('current-count');
  const listDiv = document.getElementById('list');
  const banner = document.getElementById('locked-banner');
  const nextBtn = document.getElementById('next-btn');

  let contestants = [];
  let currentIndex = 0;
  let judges = Number(document.body.dataset.judges || '0');
  let voteTimer = null;


  function hasAnyScore(c) {
    return !!c && (Number(c.submittedCount || 0) > 0 || Number(c.audienceVotes || 0) > 0);
  }

  function formatScore(c) {
    if (!hasAnyScore(c)) return '--';
    return Number(c.finalScore || 0).toFixed(2);
  }

  function breakdownText(c) {
    if (!c) return '--';
    const submitted = Number(c.submittedCount || 0);
    const votes = Number(c.audienceVotes || 0);
    if (submitted > 0) {
      return 'Judges ' + Number(c.avg || 0).toFixed(2) + ' x 0.80 = ' +
        Number(c.judgesWeighted || 0).toFixed(2) + ' + Audience ' +
        Number(c.audienceImpact || 0).toFixed(2);
    }
    if (votes > 0) return 'Judges -- + Audience ' + Number(c.audienceImpact || 0).toFixed(2);
    return '--';
  }

  function listLabel(c) {
    if (!c) return '';
    const name = c.name || '';
    if (!hasAnyScore(c)) return name;
    return name;
  }

  function currentContestant() {
    if (contestants.length === 0) return null;
    return contestants[currentIndex % contestants.length];
  }

  function renderCurrent() {
    const c = currentContestant();
    if (boxName) boxName.textContent = c ? (c.name || '--') : '--';
    if (currentScore) currentScore.textContent = formatScore(c);
    if (scoreBreakdown) scoreBreakdown.textContent = breakdownText(c);
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
        const nameEl = newItems[i].querySelector('.name');
        if (nameEl) nameEl.textContent = listLabel(contestants[i]);
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

  const audienceBtn = document.getElementById('audience-btn');
  const revealBtn = document.getElementById('reveal-btn');
  const stageMain = document.getElementById('stage-main');
  const stageQr = document.getElementById('stage-qr');
  const stageScores = document.getElementById('stage-scores');

  function hideAll() {
    if (stageMain) stageMain.classList.add('hidden');
    if (stageQr) stageQr.classList.add('hidden');
    if (stageScores) stageScores.classList.add('hidden');
  }

  if (audienceBtn && stageQr && stageMain) {
    audienceBtn.addEventListener('click', function () {
      const showQr = stageQr.classList.contains('hidden');
      hideAll();
      if (showQr) {
        stageQr.classList.remove('hidden');
        if (voteTimer) { voteTimer.stop(); voteTimer = null; }
        voteTimer = startVoteTimer(300);
      } else {
        stageMain.classList.remove('hidden');
        if (voteTimer) { voteTimer.stop(); voteTimer = null; }
      }
    });
  }

  if (revealBtn && stageScores && stageMain) {
    revealBtn.addEventListener('click', function () {
      const showScores = stageScores.classList.contains('hidden');
      hideAll();
      if (voteTimer) { voteTimer.stop(); voteTimer = null; }
      if (showScores) {
        stageScores.classList.remove('hidden');
        try { triggerGotTalentReveal(); } catch (e) {}
      } else {
        stageMain.classList.remove('hidden');
      }
    });
  }

  // Enhanced Got Talent Pyrotechnic & Sparkler Reveal

  function startVoteTimer(durationSec, onDone) {
    const t = document.getElementById("vote-timer");
    if (!t) return { stop: function(){} };
    let remain = durationSec;
    let iv;
    function fmt(m,s){ return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"); }
    function tick(){
      const m = Math.floor(remain/60); const sec = remain%60;
      t.textContent = fmt(m,sec);
      if (remain <= 10) t.classList.add("warn"); else t.classList.remove("warn");
      remain--;
      if (remain < 0){ clearInterval(iv); if (typeof onDone === "function") onDone(); }
    }
    t.classList.remove("hidden"); t.classList.remove("warn"); tick(); iv = setInterval(tick,1000);
    return { stop: function(){ clearInterval(iv); t.classList.add("hidden"); } };
  }
  function triggerGotTalentReveal() {
    if (typeof confetti !== 'function') return;
    const colors = ['#FFD700', '#FFC857', '#FFF2CC', '#FFDF80'];
    const end = Date.now() + 2500;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.9 },
        colors: colors,
        startVelocity: 70,
        gravity: 0.9,
        ticks: 180,
        zIndex: 99999
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.9 },
        colors: colors,
        startVelocity: 70,
        gravity: 0.9,
        ticks: 180,
        zIndex: 99999
      });
      confetti({
        particleCount: 30,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 1 },
        colors: colors,
        startVelocity: 40,
        gravity: 0.6,
        ticks: 200,
        zIndex: 99999
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // Poll first so realtime wiring can never block state loading.
  fetchState();
  setInterval(fetchState, 2000);

  // Realtime updates via Socket.IO
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