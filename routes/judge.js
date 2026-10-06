const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { buildState, getSettings } = require('../utils/state');
const { verifyPin, isValidPin } = require('../utils/pin');

const COOKIE_MAX_AGE = 12 * 60 * 60 * 1000;

function cookieName(judgeId) {
  return 'judge_session_' + judgeId;
}

function isAuthed(req, judgeId) {
  const c = req.signedCookies[cookieName(judgeId)];
  if (!c || typeof c.t !== 'number') return false;
  return Date.now() - c.t < COOKIE_MAX_AGE;
}

function publicJudge(j) {
  return { id: j.id, label: j.label };
}

router.post('/:judgeId/login', async (req, res) => {
  const judgeId = parseInt(req.params.judgeId);
  if (isNaN(judgeId)) return res.status(400).send('Invalid judge');

  const { judges } = await buildState();
  const judge = judges.find((j) => j.id === judgeId);
  if (!judge) return res.status(404).send('Judge not found');

  const settings = await getSettings();
  const pin = (req.body && req.body.pin) || '';

  if (!judge.code) {
    return res.status(403).render('judge_login', {
      judge: publicJudge(judge),
      settings,
      error: 'No PIN has been set for this judge. Ask the admin.'
    });
  }

  if (!isValidPin(pin) || !verifyPin(pin, judge.code)) {
    return res.status(401).render('judge_login', {
      judge: publicJudge(judge),
      settings,
      error: 'Wrong PIN.'
    });
  }

  res.cookie(cookieName(judgeId), { t: Date.now() }, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
  res.redirect('/judge/' + judgeId);
});

router.post('/:judgeId/logout', (req, res) => {
  const judgeId = parseInt(req.params.judgeId);
  if (!isNaN(judgeId)) {
    res.clearCookie(cookieName(judgeId), { path: '/' });
  }
  if (isNaN(judgeId)) return res.redirect('/');
  res.redirect('/judge/' + judgeId);
});

router.get('/:judgeId', async (req, res) => {
  try {
    const judgeId = parseInt(req.params.judgeId);
    if (isNaN(judgeId)) return res.status(400).send('Invalid judge');
    const { contestants, judges, settings } = await buildState();
    const judge = judges.find((j) => j.id === judgeId);
    if (!judge) return res.status(404).send('Judge not found');

    if (!judge.code) {
      return res.status(403).render('judge_login', {
        judge: publicJudge(judge),
        settings,
        error: 'No PIN has been set for this judge. Ask the admin.'
      });
    }

    if (!isAuthed(req, judgeId)) {
      return res.status(403).render('judge_login', {
        judge: publicJudge(judge),
        settings,
        error: null
      });
    }

    res.render('judge_home', { judge: publicJudge(judge), contestants, judges, settings });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading judge');
  }
});

router.get('/:judgeId/score/:contestantId', async (req, res) => {
  try {
    const judgeId = parseInt(req.params.judgeId);
    const contestantId = parseInt(req.params.contestantId);
    if (isNaN(judgeId) || isNaN(contestantId)) return res.status(400).send('Invalid params');
    const { contestants, judges, settings } = await buildState();
    const judge = judges.find((j) => j.id === judgeId);
    const contestant = contestants.find((c) => c.id === contestantId);
    if (!judge || !contestant) return res.status(404).send('Not found');

    if (!judge.code) {
      return res.status(403).render('judge_login', {
        judge: publicJudge(judge),
        settings,
        error: 'No PIN has been set for this judge. Ask the admin.'
      });
    }

    if (!isAuthed(req, judgeId)) {
      return res.status(403).render('judge_login', {
        judge: publicJudge(judge),
        settings,
        error: null
      });
    }

    const myScore = contestant.scores[judgeId] || { choice: null };
    res.render('judge_scoring', { judge: publicJudge(judge), contestant, myScore, settings });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading scoring');
  }
});

module.exports = router;
