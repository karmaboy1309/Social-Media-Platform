const express = require('express');
const router = express.Router();
const { addComment, getComments, deleteComment } = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/post/:postId', optionalAuth, getComments);
router.post('/', protect, addComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
