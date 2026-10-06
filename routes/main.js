const express = require('express');
const router = express.Router();
const { buildState } = require('../utils/state');

// Maintain server-side active index and evaluation history
const state = {
  currentIndex: 0,
  history: []
};

// Endpoint to fetch current dynamic state as JSON
router.get('/state', async (req, res) => {
  try {
    const { contestants, judges } = await buildState();
    const total = contestants.length;
    const currentIndex = total === 0 ? 0 : (state.currentIndex % total);

    res.json({
      contestants,
      currentIndex,
      judgesCount: judges.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve state' });
  }
});

// Main Page View Render
router.get('/', async (req, res) => {
  try {
    const { contestants, judges, settings } = await buildState();
    const total = contestants.length;
    const currentIndex = total === 0 ? 0 : (state.currentIndex % total);
    const current = currentIndex >= 0 ? contestants[currentIndex] : null;

    res.render('main_screen', {
      contestants,
      judges,
      settings,
      current,
      currentIndex,
      history: state.history.slice(),
      total
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading main screen');
  }
});

// Handle NEXT button click from client
router.post('/next', async (req, res) => {
  try {
    const { contestants, judges } = await buildState();
    const total = contestants.length;

    if (total > 0) {
      const prevIndex = state.currentIndex % total;
      const prev = contestants[prevIndex];

      state.history.push({
        id: prev.id,
        name: prev.name,
        total: Number(prev.total || 0),
        submittedCount: Number(prev.submittedCount || 0),
        judgesCount: judges.length
      });

      // Loop to next index
      state.currentIndex = (state.currentIndex + 1) % total;
    } else {
      state.history = [];
      state.currentIndex = 0;
    }

    // Broadcast state update event across all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('state_changed');
    }

    res.json({ success: true, currentIndex: state.currentIndex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;