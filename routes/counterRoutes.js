const express = require('express');
const router = express.Router();
const {
  getCounters,
  createCounter,
  updateCounter,
  deleteCounter,
} = require('../controllers/counterController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', getCounters);
router.post('/', protect, adminOnly, createCounter);
router.put('/:id', protect, adminOnly, updateCounter);
router.delete('/:id', protect, adminOnly, deleteCounter);

module.exports = router;
