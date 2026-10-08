exports.publicBase = function (req) {
  const configured = (process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return (req.protocol + '://' + req.get('host')).replace(/\/+$/, '');
};

exports.publicVoteUrl = function (req) {
  return exports.publicBase(req) + '/vote';
};
