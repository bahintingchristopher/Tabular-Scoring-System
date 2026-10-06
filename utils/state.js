const pool = require('../config/db');
const { computeAudienceImpact, computeFinalScore, JUDGE_WEIGHT } = require('./scoring');

async function getSettings() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM event_settings');
  const map = {};
  for (const r of rows) map[r.setting_key] = r.setting_value;
  return map;
}

async function getVoteTotals() {
  const [rows] = await pool.query('SELECT contestant_id, COUNT(*) AS votes FROM audience_votes GROUP BY contestant_id');
  const votesByContestant = {};
  let totalVotes = 0;
  for (const r of rows) {
    const n = Number(r.votes || 0);
    votesByContestant[r.contestant_id] = n;
    totalVotes += n;
  }
  return { votesByContestant, totalVotes };
}

async function buildState() {
  const [contestants] = await pool.query(
    'SELECT id, name, display_order FROM contestants ORDER BY display_order, id'
  );
  const [judges] = await pool.query('SELECT id, label, code FROM judges ORDER BY id');
  const [scores] = await pool.query('SELECT contestant_id, judge_id, choice, score_value FROM scores');
  const { votesByContestant, totalVotes } = await getVoteTotals();
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
      jScores[j.id] = scoreMap[k] || { choice: null, score_value: null };
    }

    // judges subtotal
    let total = 0;
    let submittedCount = 0;
    for (const j of judges) {
      const sv = jScores[j.id].score_value;
      if (sv !== null && !isNaN(sv)) {
        total += Number(sv);
        submittedCount += 1;
      }
    }
    const avg = submittedCount > 0 ? (total / submittedCount) : 0;

    // audience impact (0 when there are no valid votes)
    const audienceVotes = votesByContestant[c.id] || 0;
    const impact = computeAudienceImpact(audienceVotes, totalVotes);
    const judgesWeighted = avg * JUDGE_WEIGHT;
    const final = computeFinalScore(avg, impact);

    return {
      ...c,
      scores: jScores,
      total,
      avg,
      submittedCount,
      audienceVotes,
      audienceImpact: impact,
      judgesWeighted,
      finalScore: final
    };
  });

  return { contestants: contestantsWithScores, judges, settings, totalVotes };
}

module.exports = { buildState, getSettings, getVoteTotals };