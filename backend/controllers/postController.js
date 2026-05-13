const Post = require('../models/Post');
const { deleteFile } = require('../config/upload');
const socketModule = require('../socket');

// ══════════════════════════════════════════════════════
// Post Controller
// ══════════════════════════════════════════════════════

// ──────────────────────────────────────────
// @desc    Create a new post (with optional image)
// @route   POST /api/posts
// @access  Private
// ──────────────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      // Clean up uploaded file if content is missing
      if (req.file) deleteFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      });
    }

    if (content.length > 2200) {
      if (req.file) deleteFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Post content cannot exceed 2200 characters',
      });
    }

    const postData = {
      author: req.user._id,
      content: content.trim(),
    };

    // Attach image filename if uploaded
    if (req.file) {
      postData.image = req.file.filename;
    }

    const post = await Post.create(postData);

    // Populate author info for the response
    const populatedPost = await Post.findById(post._id).populate(
      'author',
      'username fullName profileImage'
    );

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: populatedPost,
    });
  } catch (error) {
    if (req.file) deleteFile(req.file.filename);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    console.error('CreatePost Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating post',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Get all posts (feed) with pagination
// @route   GET /api/posts?page=1&limit=10
// @access  Public (optionalAuth)
// ──────────────────────────────────────────
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.user) {
      filter.author = req.query.user;
    }

    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username fullName profileImage');

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts,
    });
  } catch (error) {
    console.error('GetPosts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public (optionalAuth)
// ──────────────────────────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username fullName profileImage');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }
    console.error('GetPost Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching post',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Edit a post (update caption only)
// @route   PUT /api/posts/:id
// @access  Private (author only)
// ──────────────────────────────────────────
exports.editPost = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      });
    }

    if (content.length > 2200) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot exceed 2200 characters',
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Only author can edit
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own posts',
      });
    }

    post.content = content.trim();
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    console.error('EditPost Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error editing post',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (author only)
// ──────────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Only author can delete
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own posts',
      });
    }

    // Delete attached image file
    if (post.image) {
      deleteFile(post.image);
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('DeletePost Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Like / Unlike a post (toggle)
// @route   PUT /api/posts/:id/like
// @access  Private
// ──────────────────────────────────────────
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      // Unlike
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();

    // Emit live update to all clients
    const io = socketModule.getIO();
    io.emit('like_update', {
      postId: post._id,
      likesCount: post.likes.length
    });

    // Send notification to author if someone else liked it
    if (!alreadyLiked && post.author.toString() !== userId) {
      io.to(post.author.toString()).emit('new_notification', {
        type: 'like',
        message: `@${req.user.username} liked your post.`,
        postId: post._id
      });
    }

    res.status(200).json({
      success: true,
      message: alreadyLiked ? 'Post unliked' : 'Post liked',
      likesCount: post.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error('LikePost Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking post',
    });
  }
};

