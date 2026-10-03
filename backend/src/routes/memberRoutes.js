const { z } = require('zod');
const Member = require('../models/Member');
const makeCrudRouter = require('../utils/crudRouter');

const schema = z.object({
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(), plan: z.string().regex(/^[a-f\d]{24}$/i).optional(), trainer: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  membershipStart: z.coerce.date().optional(), membershipEnd: z.coerce.date().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(), notes: z.string().max(1000).optional()
});
module.exports = makeCrudRouter({ Model: Member, bodySchema: schema, searchFields: ['firstName', 'lastName', 'email', 'phone'], populate: 'plan trainer', canDelete: true });
