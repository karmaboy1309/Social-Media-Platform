const User = require('../models/User');
const Post = require('../models/Post');

// ──────────────────────────────────────────
// @desc    Global search for users and posts
// @route   GET /api/search?q=keyword
// @access  Public
// ──────────────────────────────────────────
exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim() === '') {
      return res.status(200).json({
        success: true,
        users: [],
        posts: [],
      });
    }

    // Create a case-insensitive regex pattern
    // We escape special regex characters to prevent regex injection
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');

    // Search users by username or fullName
    const users = await User.find({
      $or: [{ username: { $regex: regex } }, { fullName: { $regex: regex } }],
    })
      .select('username fullName profileImage isVerified')
      .limit(20)
      .lean();

    // Search posts by content
    const posts = await Post.find({
      content: { $regex: regex },
    })
      .populate('author', 'username fullName profileImage isVerified')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      users,
      posts,
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search',
    });
  }
};
