const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const supportUpload = require('../controllers/support-upload.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/security.middleware');

router.use(protect);

// User/Partner routes (any authenticated user)
router.post('/upload', (req, res, next) => {
  supportUpload.upload.array('files', 5)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Each file must be 1 MB or smaller.' });
      }
      if (err.code === 'UNSUPPORTED_TYPE') {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    supportUpload.uploadSupportFiles(req, res);
  });
});

router.post('/tickets', supportController.createTicket);
router.get('/tickets/mine', supportController.getMyTickets);
router.get('/tickets/:id', validateObjectId('id'), supportController.getTicketById);
router.post('/tickets/:id/reply', validateObjectId('id'), supportController.replyToTicket);
router.post('/tickets/:id/close', validateObjectId('id'), supportController.closeTicket);
router.post('/tickets/:id/reopen', validateObjectId('id'), supportController.reopenTicket);

// Admin routes
router.get('/admin/tickets', restrictTo('ADMIN'), supportController.getAllTickets);
router.get('/admin/tickets/stats', restrictTo('ADMIN'), supportController.getTicketStats);
router.post('/admin/tickets/:id/assign', restrictTo('ADMIN'), validateObjectId('id'), supportController.assignTicket);
router.patch('/admin/tickets/:id/status', restrictTo('ADMIN'), validateObjectId('id'), supportController.updateTicketStatus);

module.exports = router;
