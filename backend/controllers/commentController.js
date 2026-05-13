const Comment = require('../models/Comment');
const Post = require('../models/Post');
const socketModule = require('../socket');

// ──────────────────────────────────────────
// @desc    Add comment to a post
// @route   POST /api/comments
// @access  Private
// ──────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content: content.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'username fullName profileImage'
    );

    const io = socketModule.getIO();
    // Notify all clients to update comments for this post
    io.emit('new_comment', {
      postId,
      comment: populatedComment
    });

    // Notify post author
    if (post.author.toString() !== req.user._id.toString()) {
      io.to(post.author.toString()).emit('new_notification', {
        type: 'comment',
        message: `@${req.user.username} commented on your post.`,
        postId: post._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added',
      comment: populatedComment,
    });
  } catch (error) {
    console.error('AddComment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Get comments for a post
// @route   GET /api/comments/post/:postId
// @access  Public
// ──────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profileImage');

    res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error('GetComments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching comments',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (author only)
// ──────────────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments',
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    const io = socketModule.getIO();
    io.emit('delete_comment', {
      postId: comment.post,
      commentId: comment._id
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('DeleteComment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting comment',
    });
  }
};
