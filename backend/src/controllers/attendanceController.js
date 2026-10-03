const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/attendanceService');

module.exports = {
  list: asyncHandler(async (req, res) => res.json({ success: true, message: 'Attendance retrieved successfully.', data: await service.listAttendance(req.validated.query) })),
  checkIn: asyncHandler(async (req, res) => res.status(201).json({ success: true, message: 'Member checked in successfully.', data: await service.checkIn(req.validated.body, req.user.id) })),
  checkOut: asyncHandler(async (req, res) => res.json({ success: true, message: 'Member checked out successfully.', data: await service.checkOut(req.validated.params.id) })),
  get: asyncHandler(async (req, res) => res.json({ success: true, message: 'Attendance record retrieved successfully.', data: await service.getAttendance(req.validated.params.id) })),
  remove: asyncHandler(async (req, res) => {
    await service.deleteAttendance(req.validated.params.id);
    res.json({ success: true, message: 'Attendance record deleted successfully.', data: null });
  })
};
