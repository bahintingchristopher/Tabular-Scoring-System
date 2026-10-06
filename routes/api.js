const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { mapChoiceToValue } = require('../utils/adMap');
const { buildState, getSettings } = require('../utils/state');

router.post('/judge/submit-score', async (req, res) => {
  try {
    const { judgeId, contestantId, choice } = req.body;
    const j = parseInt(judgeId);
    const c = parseInt(contestantId);
    if (isNaN(j) || isNaN(c)) return res.redirect('back');
    if (choice !== 'A' && choice !== 'B' && choice !== 'C' && choice !== 'D') {
      return res.redirect(`/judge/${j}/score/${c}`);
    }
    const settings = await getSettings();
    if (settings.scores_locked === '1') {
      return res.redirect(`/judge/${j}`);
    }
    const sv = mapChoiceToValue(choice);
    const conn = await pool.getConnection();
    try {
      await conn.query(
        'INSERT INTO scores (contestant_id, judge_id, choice, score_value, submitted_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE choice=VALUES(choice), score_value=VALUES(score_value), submitted_at=NOW()',
        [c, j, choice, sv]
      );
    } finally {
      conn.release();
    }
    const io = req.app.get('io');
    if (io) io.emit('score_updated', await buildState());
    res.redirect(`/judge/${j}`);
  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});

module.exports = router;



