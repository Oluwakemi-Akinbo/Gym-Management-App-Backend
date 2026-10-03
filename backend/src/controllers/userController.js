const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/userService');

module.exports = {
  list: asyncHandler(async (req, res) => res.json({ success: true, message: 'Users retrieved successfully.', data: await service.listUsers(req.validated.query) })),
  get: asyncHandler(async (req, res) => res.json({ success: true, message: 'User retrieved successfully.', data: await service.getUser(req.validated.params.id) })),
  setActive: asyncHandler(async (req, res) => res.json({ success: true, message: 'User status updated successfully.', data: await service.setUserActive(req.validated.params.id, req.validated.body.active, req.user.id) }))
};
