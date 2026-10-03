const express = require('express');
const { z } = require('zod');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../utils/validation');
const controller = require('../controllers/attendanceController');

const router = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');
const params = z.object({ id });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  member: id.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  openOnly: z.enum(['true', 'false']).optional().transform((value) => value === 'true')
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'from must be before or equal to to.' });

router.use(authenticate);
router.get('/', validate(z.object({ body: z.any(), query: listQuery, params: z.any() })), controller.list);
router.post('/check-in', authorize('admin', 'staff'), validate(z.object({
  body: z.object({ member: id, checkInAt: z.coerce.date().optional(), notes: z.string().trim().max(300).optional() }),
  query: z.any(), params: z.any()
})), controller.checkIn);
router.patch('/:id/check-out', authorize('admin', 'staff'), validate(z.object({ body: z.any(), query: z.any(), params })), controller.checkOut);
router.get('/:id', validate(z.object({ body: z.any(), query: z.any(), params })), controller.get);
router.delete('/:id', authorize('admin'), validate(z.object({ body: z.any(), query: z.any(), params })), controller.remove);

module.exports = router;
