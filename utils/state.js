const pool = require('../config/db');

async function getSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM event_settings');
  const map = {};
  for (const r of rows) map[r.setting_key] = r.setting_value;
  return map;
}

async function buildState() {
  const [contestants] = await pool.query(
    'SELECT id, name, display_order FROM contestants ORDER BY display_order, id'
  );
  const [judges] = await pool.query('SELECT id, label, code FROM judges ORDER BY id');
  const [scores] = await pool.query('SELECT contestant_id, judge_id, choice, score_value FROM scores');
  const settings = await getSettings();

  const scoreMap = {};
  for (const s of scores) {
    scoreMap[`${s.contestant_id}:${s.judge_id}`] = {
      choice: s.choice,
      score_value: s.score_value === null ? null : Number(s.score_value)
    };
  }

  const contestantsWithScores = contestants.map((c) => {
    const jScores = {};
    for (const j of judges) {
      const k = `${c.id}:${j.id}`;
      jScores[judge] = scoreMap[k] || { choice: null, score_value: null };
    }

    // totals
    let total = 0;
    let submittedCount = 0;
    for (const j of judges) {
      const sv = jScores[judge].score_value;
      if (sv !== null && !isNaN(sv)) {
        total += Number(sv);
        submittedCount += 1;
      }
    }
    const avg = submittedCount > 0 ? (total / submittedCount) : 0;

    return {
      ...c,
      scores: jScores,
      total,
      avg,
      submittedCount
    };
  });

  return { contestants: contestantsWithScores, judges, settings };
}

module.exports = { buildState, getSettings };







