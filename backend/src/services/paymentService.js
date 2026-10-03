const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Plan = require('../models/Plan');
const httpError = require('../utils/httpError');

function plusDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function applyMembership(payment, member, plan) {
  const now = payment.paidAt || new Date();
  const hasCurrentMembership = member.status === 'active' && member.membershipEnd && member.membershipEnd > now;
  const start = hasCurrentMembership ? member.membershipEnd : now;
  const end = plusDays(start, plan.durationDays);
  payment.previousMembership = {
    plan: member.plan || null,
    start: member.membershipStart || null,
    end: member.membershipEnd || null,
    status: member.status
  };
  payment.appliedMembershipStart = start;
  payment.appliedMembershipEnd = end;
  payment.membershipApplied = true;
  member.plan = plan._id;
  if (!hasCurrentMembership) member.membershipStart = start;
  member.membershipEnd = end;
  member.status = 'active';
  await member.save();
  await payment.save();
}

async function recordPayment(values, userId) {
  const [member, plan] = await Promise.all([
    Member.findById(values.member),
    values.plan ? Plan.findById(values.plan) : null
  ]);
  if (!member) throw httpError(404, 'Member not found.');
  if (values.plan && !plan) throw httpError(404, 'Membership plan not found.');
  if (plan && !plan.active) throw httpError(400, 'This plan is inactive and cannot be purchased.');
  const payment = await Payment.create({
    ...values,
    amount: values.amount ?? plan?.price,
    paidAt: values.status === 'paid' ? (values.paidAt || new Date()) : values.paidAt,
    recordedBy: userId
  });
  if (payment.status === 'paid' && plan) await applyMembership(payment, member, plan);
  return Payment.findById(payment.id).populate('member plan', 'firstName lastName name email price durationDays').populate('recordedBy', 'name email');
}

async function markPaid(id) {
  const payment = await Payment.findById(id);
  if (!payment) throw httpError(404, 'Payment not found.');
  if (payment.status === 'paid') throw httpError(409, 'This payment is already marked as paid.');
  if (payment.status === 'refunded') throw httpError(409, 'A refunded payment cannot be marked as paid.');
  const [member, plan] = await Promise.all([Member.findById(payment.member), payment.plan ? Plan.findById(payment.plan) : null]);
  if (!member) throw httpError(404, 'Member not found.');
  if (payment.plan && !plan) throw httpError(404, 'Membership plan not found.');
  payment.status = 'paid';
  payment.paidAt = new Date();
  if (plan) await applyMembership(payment, member, plan);
  else await payment.save();
  return payment.populate('member plan', 'firstName lastName name email price durationDays');
}

async function refundPayment(id) {
  const payment = await Payment.findById(id);
  if (!payment) throw httpError(404, 'Payment not found.');
  if (payment.status !== 'paid') throw httpError(409, 'Only paid payments can be refunded.');
  if (payment.membershipApplied) {
    const member = await Member.findById(payment.member);
    if (!member) throw httpError(404, 'Member not found.');
    const currentEndMatches = member.membershipEnd?.getTime() === payment.appliedMembershipEnd?.getTime();
    if (!currentEndMatches) throw httpError(409, 'This payment has a later membership renewal. Resolve later renewals before refunding this payment.');
    member.plan = payment.previousMembership?.plan || undefined;
    member.membershipStart = payment.previousMembership?.start || undefined;
    member.membershipEnd = payment.previousMembership?.end || undefined;
    member.status = payment.previousMembership?.status || 'inactive';
    await member.save();
    payment.membershipApplied = false;
  }
  payment.status = 'refunded';
  await payment.save();
  return payment.populate('member plan', 'firstName lastName name email price durationDays');
}

module.exports = { recordPayment, markPaid, refundPayment };
