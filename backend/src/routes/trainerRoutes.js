const { z } = require('zod');
const Trainer = require('../models/Trainer');
const makeCrudRouter = require('../utils/crudRouter');

const schema = z.object({
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(30).optional(),
  specialties: z.array(z.string().trim().max(60)).max(20).optional(), active: z.boolean().optional(), notes: z.string().max(1000).optional()
});
module.exports = makeCrudRouter({ Model: Trainer, bodySchema: schema, searchFields: ['firstName', 'lastName', 'email', 'specialties'], canDelete: true });
