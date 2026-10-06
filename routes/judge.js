const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { buildState } = require('../utils/state');

router.get('/:judgeId', async (req, res) => {
  try {
    const judgeId = parseInt(req.params.judgeId);
    if (isNaN(judgeId)) return res.status(400).send('Invalid judge');
    const { contestants, judges, settings } = await buildState();
    const judge = judges.find((j) => j.id === judgeId);
    if (!judge) return res.status(404).send('Judge not found');
    res.render('judge_home', { judge, contestants, judges, settings });
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
    const myScore = contestant.scores[judge] || { choice: null };
    res.render('judge_scoring', { judge, contestant, myScore, settings });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading scoring');
  }
});

module.exports = router;
