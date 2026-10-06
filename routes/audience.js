const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../config/db');
const { buildState, getSettings } = require('../utils/state');

const COOKIE_NAME = 'audience_device';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

// Anonymous device token: one ballot per device, enforced by UNIQUE(device_token).
function deviceToken(req, res) {
  const existing = req.signedCookies[COOKIE_NAME];
  if (typeof existing === 'string' && /^[a-f0-9]{64}$/.test(existing)) return existing;

  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(COOKIE_NAME, token, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
  return token;
}

function errorMessage(code) {
  if (code === 'closed') return 'Voting is currently closed.';
  if (code === 'invalid') return 'That vote could not be recorded. Please try again.';
  if (code === 'server') return 'Something went wrong. Please try again.';
  return null;
}

// Audience voting page (no login)
router.get('/', async (req, res) => {
  try {
    const token = deviceToken(req, res);
    const { contestants, settings } = await buildState();
    const [rows] = await pool.query('SELECT contestant_id FROM audience_votes WHERE device_token = ?', [token]);
    const myVote = rows.length ? Number(rows[0].contestant_id) : null;

    res.render('vote', {
      contestants,
      settings,
      myVote,
      locked: settings.scores_locked === '1',
      ok: req.query.ok === '1',
      error: errorMessage(req.query.err)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading voting page');
  }
});

// Cast or change a vote
router.post('/', async (req, res) => {
  try {
    const token = deviceToken(req, res);
    const settings = await getSettings();
    if (settings.scores_locked === '1') return res.redirect('/vote?err=closed');

    const contestantId = parseInt(req.body && req.body.contestantId);
    if (isNaN(contestantId)) return res.redirect('/vote?err=invalid');

    const [found] = await pool.query('SELECT id FROM contestants WHERE id = ?', [contestantId]);
    if (found.length === 0) return res.redirect('/vote?err=invalid');

    await pool.query(
      'INSERT INTO audience_votes (device_token, contestant_id) VALUES (?, ?) ' +
      'ON DUPLICATE KEY UPDATE contestant_id = ?, voted_at = NOW()',
      [token, contestantId, contestantId]
    );

    // Same event the judge/admin screens already listen for, so they refresh live.
    const io = req.app.get('io');
    if (io) io.emit('score_updated', await buildState());

    res.redirect('/vote?ok=1');
  } catch (err) {
    console.error(err);
    res.redirect('/vote?err=server');
  }
});

module.exports = router;