const Payment = require('../models/Payment');
const httpError = require('../utils/httpError');

async function listPayments({ page, limit, member, status, from, to }) {
  const filter = {};
  if (member) filter.member = member;
  if (status) filter.status = status;
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = from;
    if (to) filter.paidAt.$lte = to;
  }
  const [items, total] = await Promise.all([
    Payment.find(filter).populate('member plan', 'firstName lastName name email price durationDays').populate('recordedBy', 'name email').sort({ paidAt: -1 }).skip((page - 1) * limit).limit(limit),
    Payment.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getPayment(id) {
  const payment = await Payment.findById(id).populate('member plan', 'firstName lastName name email price durationDays').populate('recordedBy', 'name email');
  if (!payment) throw httpError(404, 'Payment not found.');
  return payment;
}

module.exports = { listPayments, getPayment };
