const express = require('express');
const { z } = require('zod');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../utils/validation');
const controller = require('../controllers/userController');

const router = express.Router();
const id = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');
const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false']).optional()
});
router.use(authenticate, authorize('admin'));
router.get('/', validate(z.object({ body: z.any(), query, params: z.any() })), controller.list);
router.get('/:id', validate(z.object({ body: z.any(), query: z.any(), params: z.object({ id }) })), controller.get);
router.patch('/:id/active', validate(z.object({ body: z.object({ active: z.boolean() }), query: z.any(), params: z.object({ id }) })), controller.setActive);

module.exports = router;
