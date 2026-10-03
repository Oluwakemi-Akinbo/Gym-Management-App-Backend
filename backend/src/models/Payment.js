const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  amount: { type: Number, required: true, min: 0.01 },
  method: { type: String, enum: ['cash', 'bank_transfer', 'card', 'other'], required: true },
  status: { type: String, enum: ['paid', 'pending', 'refunded'], default: 'paid' },
  membershipApplied: { type: Boolean, default: false },
  previousMembership: {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    start: Date,
    end: Date,
    status: { type: String, enum: ['active', 'inactive', 'suspended'] }
  },
  appliedMembershipStart: Date,
  appliedMembershipEnd: Date,
  paidAt: Date,
  reference: { type: String, trim: true, maxlength: 100 },
  notes: { type: String, trim: true, maxlength: 500 },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

paymentSchema.index({ member: 1, paidAt: -1 });
module.exports = mongoose.model('Payment', paymentSchema);
