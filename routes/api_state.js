// routes/api_state.js
const express = require('express');
const router = express.Router();
const { buildState } = require('../utils/state');
const mainState = require('../utils/mainState');

router.get('/state', async (req, res) => {
  try {
    const { contestants, judges, settings } = await buildState();
    const { currentIndex, history } = mainState.get();
    const total = contestants.length;
    const idx = total === 0 ? 0 : (currentIndex % total);

    res.json({
      contestants,
      currentIndex: idx,
      done: history.map((h) => h.id),
      judgesCount: judges.length,
      scores_locked: settings.scores_locked || '0'
    });
  } catch (err) {
    console.error('Failed to load state:', err);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

module.exports = router;