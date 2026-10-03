const httpError = require('../utils/httpError');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listRecords(Model, { page, limit, search, status }, { searchFields = [], populate = '' } = {}) {
  const filter = {};
  if (status && Model.schema.path('status')) filter.status = status;
  else if (status && Model.schema.path('active')) filter.active = status === 'active';
  if (search && searchFields.length) {
    const safeSearch = escapeRegex(search);
    filter.$or = searchFields.map((field) => ({ [field]: { $regex: safeSearch, $options: 'i' } }));
  }
  const recordsQuery = Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
  if (populate) recordsQuery.populate(populate);
  const [items, total] = await Promise.all([
    recordsQuery,
    Model.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getRecord(Model, id, populate = '') {
  const query = Model.findById(id);
  if (populate) query.populate(populate);
  const item = await query;
  if (!item) throw httpError(404, 'Record not found.');
  return item;
}

async function validateReferences(Model, data) {
  if (Model.modelName === 'Member') {
    const Plan = require('../models/Plan');
    const Trainer = require('../models/Trainer');
    if (data.plan && !await Plan.exists({ _id: data.plan, active: true })) throw httpError(404, 'Active membership plan not found.');
    if (data.trainer && !await Trainer.exists({ _id: data.trainer, active: true })) throw httpError(404, 'Active trainer not found.');
    if (data.membershipStart && data.membershipEnd && data.membershipEnd <= data.membershipStart) throw httpError(400, 'Membership end date must be after the start date.');
    if (data.dateOfBirth && data.dateOfBirth > new Date()) throw httpError(400, 'Date of birth cannot be in the future.');
  }
}

async function createRecord(Model, data) {
  await validateReferences(Model, data);
  return Model.create(data);
}

async function updateRecord(Model, id, data, populate = '') {
  await validateReferences(Model, data);
  if (Model.modelName === 'Member' && (data.membershipStart || data.membershipEnd)) {
    const current = await Model.findById(id).select('membershipStart membershipEnd');
    if (!current) throw httpError(404, 'Record not found.');
    const start = data.membershipStart || current.membershipStart;
    const end = data.membershipEnd || current.membershipEnd;
    if (start && end && end <= start) throw httpError(400, 'Membership end date must be after the start date.');
  }
  const query = Model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (populate) query.populate(populate);
  const item = await query;
  if (!item) throw httpError(404, 'Record not found.');
  return item;
}

async function deleteRecord(Model, id) {
  const update = Model.modelName === 'Member' ? { status: 'inactive' } : { active: false };
  const item = await Model.findByIdAndUpdate(id, update, { new: true });
  if (!item) throw httpError(404, 'Record not found.');
  return item;
}

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
