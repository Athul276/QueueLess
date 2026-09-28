const express = require('express');
const router = express.Router();
const {
  generateToken,
  getMyTokens,
  getTokenLiveStatus,
  callNextToken,
  skipToken,
  cancelToken,
  completeToken,
  getAdminMonitoring,
  getQueueHistory,
} = require('../controllers/tokenController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public/User status
router.get('/live-status/:id', getTokenLiveStatus);

// Authenticated User routes
router.post('/generate', protect, generateToken);
router.get('/my-tokens', protect, getMyTokens);
router.post('/:id/cancel', protect, cancelToken);
router.get('/history', protect, getQueueHistory);

// Admin-only operations
router.post('/call-next', protect, adminOnly, callNextToken);
router.post('/:id/skip', protect, adminOnly, skipToken);
router.post('/:id/complete', protect, adminOnly, completeToken);
router.get('/admin/monitoring', protect, adminOnly, getAdminMonitoring);

module.exports = router;
