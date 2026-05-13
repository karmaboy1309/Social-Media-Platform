const User = require('../models/User');
const Post = require('../models/Post');
const socketModule = require('../socket');

// ══════════════════════════════════════════════════════
// User / Profile Controller
// ══════════════════════════════════════════════════════

// ──────────────────────────────────────────
// @desc    Get user profile by ID or username
// @route   GET /api/users/:id
// @access  Public
// ──────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Support lookup by MongoDB _id or by username
    let user;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(id)
        .select('-password')
        .populate('followers', 'username fullName profileImage')
        .populate('following', 'username fullName profileImage');
    } else {
      user = await User.findOne({ username: id.toLowerCase() })
        .select('-password')
        .populate('followers', 'username fullName profileImage')
        .populate('following', 'username fullName profileImage');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get post count for this user
    const postCount = await Post.countDocuments({ author: user._id });

    res.status(200).json({
      success: true,
      user: {
        ...user.toObject(),
        postCount,
      },
    });
  } catch (error) {
    console.error('GetProfile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
// ──────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow users to edit their own profile
    if (req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    const { username, fullName, bio } = req.body;
    const updateFields = {};

    // ── Validate & set username ──
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();

      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Username must be between 3 and 30 characters',
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({
          success: false,
          message:
            'Username can only contain letters, numbers, and underscores',
        });
      }

      // Check if username is taken (by another user)
      const existing = await User.findOne({
        username: cleanUsername,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken',
        });
      }

      updateFields.username = cleanUsername;
    }

    // ── Validate & set fullName ──
    if (fullName !== undefined) {
      if (fullName.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Full name cannot exceed 50 characters',
        });
      }
      updateFields.fullName = fullName.trim();
    }

    // ── Validate & set bio ──
    if (bio !== undefined) {
      if (bio.length > 160) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 160 characters',
        });
      }
      updateFields.bio = bio.trim();
    }

    // Check at least one field to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update',
      });
    }

    const user = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    }).select('-password');

    const postCount = await Post.countDocuments({ author: user._id });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        ...user.toObject(),
        postCount,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken',
      });
    }
    console.error('UpdateProfile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Upload / update profile picture
// @route   PUT /api/users/:id/avatar
// @access  Private
// ──────────────────────────────────────────
exports.uploadProfileImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow users to update their own avatar
    if (req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile picture',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file',
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { profileImage: req.file.filename },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      user,
    });
  } catch (error) {
    console.error('UploadProfileImage Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error uploading profile picture',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Follow a user
// @route   PUT /api/users/:id/follow
// @access  Private
// ──────────────────────────────────────────
exports.followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    // Can't follow yourself
    if (currentUserId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already following
    if (targetUser.followers.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this user',
      });
    }

    // Add to target's followers & current user's following
    await User.findByIdAndUpdate(id, {
      $push: { followers: currentUserId },
    });
    await User.findByIdAndUpdate(currentUserId, {
      $push: { following: id },
    });

    const io = socketModule.getIO();
    io.to(id.toString()).emit('new_notification', {
      type: 'follow',
      message: `@${req.user.username} started following you.`,
      userId: currentUserId
    });

    res.status(200).json({
      success: true,
      message: `You are now following @${targetUser.username}`,
    });
  } catch (error) {
    console.error('FollowUser Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error following user',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Unfollow a user
// @route   PUT /api/users/:id/unfollow
// @access  Private
// ──────────────────────────────────────────
exports.unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot unfollow yourself',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!targetUser.followers.includes(currentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this user',
      });
    }

    await User.findByIdAndUpdate(id, {
      $pull: { followers: currentUserId },
    });
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: id },
    });

    res.status(200).json({
      success: true,
      message: `You have unfollowed @${targetUser.username}`,
    });
  } catch (error) {
    console.error('UnfollowUser Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unfollowing user',
    });
  }
};
