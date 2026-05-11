// ══════════════════════════════════════════════════════
// Environment Variable Validator
// ══════════════════════════════════════════════════════
// Validates all required environment variables are set
// before the application boots. Fails fast with clear
// error messages if anything is missing.
// ══════════════════════════════════════════════════════

const REQUIRED_VARS = [
  {
    name: 'MONGO_URI',
    message: 'MongoDB connection string (e.g. mongodb://localhost:27017/social_media_platform)',
  },
  {
    name: 'JWT_SECRET',
    message: 'Secret key for signing JSON Web Tokens',
    validate: (val) => val !== 'your_jwt_secret_key_here',
    warnOnly: true,
    warning: 'Using default JWT_SECRET — change this before deploying to production!',
  },
];

const OPTIONAL_VARS = [
  { name: 'PORT', default: '5000' },
  { name: 'NODE_ENV', default: 'development' },
  { name: 'JWT_EXPIRE', default: '30d' },
  { name: 'MAX_FILE_SIZE', default: '5242880' },
];

/**
 * Validates required env vars exist and applies defaults for optional ones.
 * Throws on missing required vars. Warns on insecure defaults.
 */
const validateEnv = () => {
  const missing = [];
  const warnings = [];

  // Check required variables
  REQUIRED_VARS.forEach(({ name, message, validate, warnOnly, warning }) => {
    if (!process.env[name] || process.env[name].trim() === '') {
      missing.push(`  • ${name} — ${message}`);
    } else if (validate && !validate(process.env[name])) {
      if (warnOnly) {
        warnings.push(`  ⚠️  ${warning}`);
      } else {
        missing.push(`  • ${name} — ${message}`);
      }
    }
  });

  // Apply defaults for optional variables
  OPTIONAL_VARS.forEach(({ name, default: defaultVal }) => {
    if (!process.env[name]) {
      process.env[name] = defaultVal;
    }
  });

  // Report missing
  if (missing.length > 0) {
    console.error('\n  ╔══════════════════════════════════════════╗');
    console.error('  ║   ❌ MISSING ENVIRONMENT VARIABLES        ║');
    console.error('  ╚══════════════════════════════════════════╝\n');
    missing.forEach((m) => console.error(m));
    console.error('\n  💡 Copy .env.example to .env and fill in the values.\n');
    process.exit(1);
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('');
    warnings.forEach((w) => console.warn(w));
  }

  return {
    PORT: parseInt(process.env.PORT, 10),
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: process.env.JWT_EXPIRE,
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10),
  };
};

module.exports = validateEnv;
