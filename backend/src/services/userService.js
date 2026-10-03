const User = require('../models/User');
const httpError = require('../utils/httpError');

async function listUsers({ page, limit, search, active }) {
  const filter = {};
  if (active !== undefined) filter.active = active === 'true';
  if (search) filter.$or = ['name', 'email'].map((field) => ({ [field]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }));
  const [items, total] = await Promise.all([
    User.find(filter).select('name email role active createdAt updatedAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getUser(id) {
  const user = await User.findById(id).select('name email role active createdAt updatedAt');
  if (!user) throw httpError(404, 'User not found.');
  return user;
}

async function setUserActive(id, active, currentUserId) {
  if (id === currentUserId) throw httpError(400, 'You cannot deactivate your own account.');
  const existing = await User.findById(id).select('role');
  if (!existing) throw httpError(404, 'User not found.');
  if (existing.role === 'admin' && !active) throw httpError(400, 'Administrator accounts cannot be deactivated through this endpoint.');
  const user = await User.findByIdAndUpdate(id, { active }, { new: true, runValidators: true }).select('name email role active createdAt updatedAt');
  if (!user) throw httpError(404, 'User not found.');
  return user;
}

module.exports = { listUsers, getUser, setUserActive };
