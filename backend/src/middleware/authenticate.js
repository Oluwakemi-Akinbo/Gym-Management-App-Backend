const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const httpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(httpError(401, 'Authentication is required.'));
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    return next(httpError(401, 'Your session is invalid or expired. Please log in again.'));
  }
  const user = await User.findById(payload.sub).select('_id name email role active');
  if (!user || !user.active) return next(httpError(401, 'This account is unavailable.'));
  req.user = user;
  next();
});

module.exports = authenticate;
