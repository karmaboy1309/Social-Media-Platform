// @desc    Test API endpoint
// @route   GET /api/test
// @access  Public
exports.testRoute = (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Social Media Platform API is running!',
    timestamp: new Date().toISOString(),
  });
};

// @desc    Health check
// @route   GET /api/health
// @access  Public
exports.healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
};
