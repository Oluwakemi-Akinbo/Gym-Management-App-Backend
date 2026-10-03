const express = require('express');
const { z } = require('zod');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const httpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validation');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
const credentials = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});
const registration = credentials.extend({ name: z.string().trim().min(2).max(100) });
const tokenFor = (user) => jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

router.post('/register', validate(z.object({ body: registration, query: z.any(), params: z.any() })), asyncHandler(async (req, res) => {
  const accountCount = await User.countDocuments();
  if (accountCount > 0) throw httpError(403, 'Public registration is closed. Ask an administrator to create your account.');
  const { name, email, password } = req.validated.body;
  const user = await User.create({ name, email, password, role: 'admin' });
  res.status(201).json({ success: true, message: 'Administrator account created.', data: { user: publicUser(user), token: tokenFor(user) } });
}));

router.post('/login', validate(z.object({ body: credentials.pick({ email: true, password: true }), query: z.any(), params: z.any() })), asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.active || !(await user.comparePassword(password))) throw httpError(401, 'Invalid email or password.');
  res.json({ success: true, message: 'Logged in successfully.', data: { user: publicUser(user), token: tokenFor(user) } });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Account retrieved successfully.', data: { user: publicUser(req.user) } });
}));

router.post('/staff', authenticate, require('../middleware/authorize')('admin'), validate(z.object({ body: registration, query: z.any(), params: z.any() })), asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const user = await User.create({ name, email, password, role: 'staff' });
  res.status(201).json({ success: true, message: 'Staff account created.', data: { user: publicUser(user) } });
}));

module.exports = router;
