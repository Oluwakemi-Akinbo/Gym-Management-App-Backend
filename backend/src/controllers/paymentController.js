const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const queryService = require('../services/paymentQueryService');

module.exports = {
  list: asyncHandler(async (req, res) => res.json({ success: true, message: 'Payments retrieved successfully.', data: await queryService.listPayments(req.validated.query) })),
  get: asyncHandler(async (req, res) => res.json({ success: true, message: 'Payment retrieved successfully.', data: await queryService.getPayment(req.validated.params.id) })),
  create: asyncHandler(async (req, res) => {
    const payment = await paymentService.recordPayment(req.validated.body, req.user.id);
    res.status(201).json({ success: true, message: 'Payment recorded successfully.', data: payment });
  }),
  markPaid: asyncHandler(async (req, res) => res.json({ success: true, message: 'Payment marked paid and membership updated.', data: await paymentService.markPaid(req.validated.params.id) })),
  refund: asyncHandler(async (req, res) => res.json({ success: true, message: 'Payment refunded and membership updated.', data: await paymentService.refundPayment(req.validated.params.id) }))
};
