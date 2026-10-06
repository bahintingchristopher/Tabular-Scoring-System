// routes/api_state.js
const express = require('express');
const router = express.Router();
const { buildState } = require('../utils/state');

// Import or reference shared state index
// If your app uses state from routes/main.js, keep index sync here
router.get('/state', async (req, res) => {
  try {
    const { contestants, judges, settings } = await buildState();
    
    // Retrieve global currentIndex if attached to app, or default to 0
    const currentIndex = req.app.get('currentIndex') || 0;
    const done = req.app.get('doneContestants') || [];

    res.json({
      contestants,
      currentIndex,
      done,
      judgesCount: judges.length,
      scores_locked: settings.scores_locked || '0'
    });
  } catch (err) {
    console.error('Failed to load state:', err);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

module.exports = router;