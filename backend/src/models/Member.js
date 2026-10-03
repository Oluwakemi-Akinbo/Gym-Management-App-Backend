const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 60 },
  lastName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, trim: true, maxlength: 30 },
  dateOfBirth: Date,
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  membershipStart: Date,
  membershipEnd: Date,
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  notes: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

memberSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
memberSchema.virtual('membershipCurrent').get(function membershipCurrent() {
  return this.status === 'active' && Boolean(this.membershipEnd) && this.membershipEnd >= new Date();
});
memberSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('Member', memberSchema);
