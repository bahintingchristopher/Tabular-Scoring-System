// Scoring weights: judges cover 80%, audience covers 20% (expressed in points).
const JUDGE_WEIGHT = 0.8;
const AUDIENCE_MAX = 20;

// Audience Impact = (Contestant Valid Votes / Total Valid Audience Votes) * 20
// Returns 0 when there are no valid audience votes (avoids divide by zero).
function computeAudienceImpact(contestantVotes, totalVotes) {
  const votes = Number(contestantVotes || 0);
  const total = Number(totalVotes || 0);
  if (total <= 0) return 0;
  if (votes <= 0) return 0;
  return (votes / total) * AUDIENCE_MAX;
}

// Final Score = (Judges Score * 0.80) + Audience Impact
function computeFinalScore(judgesScore, audienceImpact) {
  return Number(judgesScore || 0) * JUDGE_WEIGHT + Number(audienceImpact || 0);
}

module.exports = { JUDGE_WEIGHT, AUDIENCE_MAX, computeAudienceImpact, computeFinalScore };