const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  checkInAt: { type: Date, default: Date.now, required: true },
  checkOutAt: Date,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true });

attendanceSchema.index({ member: 1, checkInAt: -1 });
attendanceSchema.index({ member: 1 }, { unique: true, partialFilterExpression: { checkOutAt: { $exists: false } } });
module.exports = mongoose.model('Attendance', attendanceSchema);
