const express = require('express');
const router = express.Router();
const { buildState } = require('../utils/state');
const mainState = require('../utils/mainState');
const QRCode = require('qrcode');

// Endpoint to fetch current dynamic state as JSON
router.get('/state', async (req, res) => {
  try {
    const { contestants, judges } = await buildState();
    const total = contestants.length;
    const currentIndex = total === 0 ? 0 : (mainState.get().currentIndex % total);

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
    const { currentIndex, history } = mainState.get();
    const total = contestants.length;
    const idx = total === 0 ? 0 : (currentIndex % total);
    const current = idx >= 0 ? contestants[idx] : null;

    const voteUrl = req.protocol + '://' + req.get('host') + '/vote';
    const qrDataUrl = await QRCode.toDataURL(voteUrl, { width: 1000, margin: 2 });
    const finalScores = contestants.map(c => ({
    name: c.name,
    finalScore: Number(c.finalScore || 0)
    })).sort((a,b) => b.finalScore - a.finalScore);

    res.render('main_screen', {
    contestants,
    judges,
    settings,
    current,
    currentIndex: idx,
    history: history.slice(),
    total,
    voteUrl,
    qrDataUrl,
    finalScores
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
    const { currentIndex } = mainState.get();
    const prev = total > 0 ? contestants[currentIndex % total] : null;

    const nextIndex = mainState.advance(total, prev, judges.length);

    // Broadcast state update event across all connected clients
    const io = req.app.get('io');
    if (io) {
    io.emit('state_changed');
    }

    res.json({ success: true, currentIndex: nextIndex });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;