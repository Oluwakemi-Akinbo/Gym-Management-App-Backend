const httpError = require('../utils/httpError');

module.exports = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(httpError(403, 'You do not have permission to perform this action.'));
  next();
};
