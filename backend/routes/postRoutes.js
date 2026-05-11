const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPost,
  deletePost,
  likePost,
  commentOnPost,
} = require('../controllers/postController');

router.route('/').get(getPosts).post(createPost);
router.route('/:id').get(getPost).delete(deletePost);
router.put('/:id/like', likePost);
router.post('/:id/comment', commentOnPost);

module.exports = router;
