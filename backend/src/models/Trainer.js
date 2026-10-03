const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 60 },
  lastName: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, trim: true, maxlength: 30 },
  specialties: [{ type: String, trim: true, maxlength: 60 }],
  active: { type: Boolean, default: true },
  notes: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });

trainerSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });
module.exports = mongoose.model('Trainer', trainerSchema);
