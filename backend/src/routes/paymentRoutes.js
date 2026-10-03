const express = require('express');
const { z } = require('zod');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../utils/validation');
const controller = require('../controllers/paymentController');

const router = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');
const params = z.object({ id });
const body = z.object({
  member: id,
  plan: id.optional(),
  amount: z.coerce.number().positive().optional(),
  method: z.enum(['cash', 'bank_transfer', 'card', 'other']),
  status: z.enum(['paid', 'pending']).default('paid'),
  paidAt: z.coerce.date().optional(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional()
}).strict().refine((value) => value.plan || value.amount, { message: 'Choose a plan or provide an amount.' });
const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  member: id.optional(),
  status: z.enum(['paid', 'pending', 'refunded']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'from must be before or equal to to.' });

router.use(authenticate);
router.get('/', validate(z.object({ body: z.any(), query, params: z.any() })), controller.list);
router.post('/', authorize('admin', 'staff'), validate(z.object({ body, query: z.any(), params: z.any() })), controller.create);
router.get('/:id', validate(z.object({ body: z.any(), query: z.any(), params })), controller.get);
router.patch('/:id/mark-paid', authorize('admin'), validate(z.object({ body: z.any(), query: z.any(), params })), controller.markPaid);
router.post('/:id/refund', authorize('admin'), validate(z.object({ body: z.any(), query: z.any(), params })), controller.refund);

module.exports = router;
