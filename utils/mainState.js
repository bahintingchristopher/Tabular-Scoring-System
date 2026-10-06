// Shared in-memory state for the main screen: single source of truth for which
// contestant is currently on display and which ones were already shown.

const state = {
  currentIndex: 0,
  history: []
};

function get() {
  return state;
}

// Records the contestant being left behind and loops to the next index.
// `prev` is the contestant object at the current index.
function advance(total, prev, judgesCount) {
  if (total <= 0 || !prev) {
    return reset();
  }

  state.history.push({
    id: prev.id,
    name: prev.name,
    total: Number(prev.total || 0),
    submittedCount: Number(prev.submittedCount || 0),
    judgesCount: judgesCount
  });

  state.currentIndex = (state.currentIndex + 1) % total;
  return state.currentIndex;
}

function reset() {
  state.currentIndex = 0;
  state.history = [];
  return state.currentIndex;
}

module.exports = { get, advance, reset };