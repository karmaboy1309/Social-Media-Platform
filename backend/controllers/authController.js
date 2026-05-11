const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ══════════════════════════════════════════════════════
// Authentication Controller
// ══════════════════════════════════════════════════════

// ── Helper: Generate JWT Token ──
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// ── Helper: Send token response ──
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);

  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userObj,
  });
};

// ──────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ──────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // ── Validation ──
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Username format check
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // Email format check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // ── Check for duplicate email ──
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // ── Check for duplicate username ──
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken',
      });
    }

    // ── Create user (password hashed via pre-save hook) ──
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      fullName: fullName || '',
    });

    // ── Send response with token ──
    sendTokenResponse(user, 201, res, 'Account created successfully');
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    // Handle duplicate key errors (race condition safety)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `This ${field} is already registered`,
      });
    }

    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Login user & return token
// @route   POST /api/auth/login
// @access  Public
// ──────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validation ──
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // ── Find user by email (explicitly include password field) ──
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ── Compare passwords ──
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // ── Send response with token ──
    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private (requires token)
// ──────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('followers', 'username fullName profileImage')
      .populate('following', 'username fullName profileImage');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};

// ──────────────────────────────────────────
// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
// ──────────────────────────────────────────
exports.logout = async (req, res) => {
  // JWT is stateless — logout is handled client-side by deleting the token.
  // This endpoint exists for API consistency and future token blacklisting.
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};
