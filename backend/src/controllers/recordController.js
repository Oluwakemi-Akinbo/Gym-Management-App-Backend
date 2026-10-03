const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/recordService');

function makeRecordController(Model, { searchFields = [], populate = '' } = {}) {
  return {
    list: asyncHandler(async (req, res) => {
      const data = await service.listRecords(Model, req.validated.query, { searchFields, populate });
      res.json({ success: true, message: 'Records retrieved successfully.', data });
    }),
    get: asyncHandler(async (req, res) => {
      const item = await service.getRecord(Model, req.validated.params.id, populate);
      res.json({ success: true, message: 'Record retrieved successfully.', data: item });
    }),
    create: asyncHandler(async (req, res) => {
      const item = await service.createRecord(Model, req.validated.body);
      res.status(201).json({ success: true, message: 'Record created successfully.', data: item });
    }),
    update: asyncHandler(async (req, res) => {
      const item = await service.updateRecord(Model, req.validated.params.id, req.validated.body, populate);
      res.json({ success: true, message: 'Record updated successfully.', data: item });
    }),
    remove: asyncHandler(async (req, res) => {
      await service.deleteRecord(Model, req.validated.params.id);
      res.json({ success: true, message: 'Record archived successfully.', data: null });
    })
  };
}

module.exports = makeRecordController;
