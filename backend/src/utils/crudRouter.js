const express = require('express');
const { z } = require('zod');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('./validation');
const makeRecordController = require('../controllers/recordController');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'must be a valid id');
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    status: z.string().optional()
  }), body: z.any(), params: z.any()
});

function makeCrudRouter({ Model, bodySchema, searchFields = [], populate = '', adminOnly = false, canDelete = false }) {
  const router = express.Router();
  const controller = makeRecordController(Model, { searchFields, populate });
  const createBody = bodySchema.strict();
  const updateBody = bodySchema.partial().strict().refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.');
  const writeAccess = adminOnly ? authorize('admin') : authorize('admin', 'staff');
  router.use(authenticate);
  router.get('/', validate(listSchema), controller.list);
  router.post('/', writeAccess, validate(z.object({ body: createBody, query: z.any(), params: z.any() })), controller.create);
  router.get('/:id', validate(z.object({ body: z.any(), query: z.any(), params: z.object({ id: objectId }) })), controller.get);
  router.patch('/:id', writeAccess, validate(z.object({ body: updateBody, query: z.any(), params: z.object({ id: objectId }) })), controller.update);
  if (canDelete) router.delete('/:id', authorize('admin'), validate(z.object({ body: z.any(), query: z.any(), params: z.object({ id: objectId }) })), controller.remove);
  return router;
}

module.exports = makeCrudRouter;
