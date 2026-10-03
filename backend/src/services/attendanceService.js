const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const httpError = require('../utils/httpError');

async function listAttendance({ page, limit, member, from, to, openOnly }) {
  const filter = {};
  if (member) filter.member = member;
  if (openOnly) filter.checkOutAt = { $exists: false };
  if (from || to) {
    filter.checkInAt = {};
    if (from) filter.checkInAt.$gte = from;
    if (to) filter.checkInAt.$lte = to;
  }
  const [items, total] = await Promise.all([
    Attendance.find(filter).populate('member', 'firstName lastName email membershipStart membershipEnd status').populate('recordedBy', 'name').sort({ checkInAt: -1 }).skip((page - 1) * limit).limit(limit),
    Attendance.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function checkIn({ member: memberId, checkInAt, notes }, userId) {
  const member = await Member.findById(memberId);
  if (!member) throw httpError(404, 'Member not found.');
  if (member.status !== 'active') throw httpError(409, 'This member is inactive or suspended.');
  const visitTime = checkInAt || new Date();
  if (!member.membershipStart || !member.membershipEnd || visitTime < member.membershipStart || visitTime >= member.membershipEnd) {
    throw httpError(403, 'This member does not have a valid membership at the check-in time.');
  }
  const openVisit = await Attendance.findOne({ member: memberId, checkOutAt: { $exists: false } });
  if (openVisit) throw httpError(409, 'This member already has an open check-in.');
  return Attendance.create({ member: memberId, checkInAt: visitTime, notes, recordedBy: userId });
}

async function checkOut(id) {
  const record = await Attendance.findById(id);
  if (!record) throw httpError(404, 'Attendance record not found.');
  if (record.checkOutAt) throw httpError(409, 'This visit has already been checked out.');
  record.checkOutAt = new Date();
  if (record.checkOutAt < record.checkInAt) throw httpError(400, 'Check-out cannot be earlier than check-in.');
  await record.save();
  return record;
}

async function getAttendance(id) {
  const record = await Attendance.findById(id).populate('member', 'firstName lastName email').populate('recordedBy', 'name');
  if (!record) throw httpError(404, 'Attendance record not found.');
  return record;
}

async function deleteAttendance(id) {
  const record = await Attendance.findByIdAndDelete(id);
  if (!record) throw httpError(404, 'Attendance record not found.');
}

module.exports = { listAttendance, checkIn, checkOut, getAttendance, deleteAttendance };
