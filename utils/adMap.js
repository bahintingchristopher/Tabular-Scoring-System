exports.mapChoiceToValue = function (choice) {
  if (choice === 'A') return 100;
  if (choice === 'B') return 95;
  if (choice === 'C') return 90;
  if (choice === 'D') return 85;
  return null;
};

exports.mapValueToChoice = function (value) {
  const v = Number(value);
  if (v === 100) return 'A';
  if (v === 95) return 'B';
  if (v === 90) return 'C';
  if (v === 85) return 'D';
  return null;
};
