const { z } = require('zod');
const Plan = require('../models/Plan');
const makeCrudRouter = require('../utils/crudRouter');

const schema = z.object({
  name: z.string().trim().min(2).max(80), description: z.string().max(500).optional(),
  durationDays: z.coerce.number().int().min(1), price: z.coerce.number().min(0), active: z.boolean().optional()
});
module.exports = makeCrudRouter({ Model: Plan, bodySchema: schema, searchFields: ['name', 'description'], adminOnly: true, canDelete: true });
