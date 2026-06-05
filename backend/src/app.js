const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiResponse = require('./middlewares/responseHandler');
const { enforceMinAppVersion } = require('./middlewares/appVersion.middleware');
const { sanitizeInput } = require('./middlewares/security.middleware');
const { auditMiddleware } = require('./middlewares/audit.middleware');
const { protectUploads } = require('./middlewares/uploads.middleware');

const app = express();

app.use(helmet());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));
app.use(helmet.xssFilter());

app.use(enforceMinAppVersion);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests', data: null },
});
app.use('/api', apiLimiter);

app.use(apiResponse);

app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Info'],
}));

// S3 fix: auth-gate private uploads while keeping public assets
// (banners, logos) world-readable. See middlewares/uploads.middleware.js
app.use('/uploads', protectUploads);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(sanitizeInput);
app.use(auditMiddleware);

app.get('/', (req, res) => res.send('API is running...'));

app.use('/api/app', require('./routes/appVersion.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/banners', require('./routes/banner.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/elite-pass', require('./routes/elitePass.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/webhooks', require('./routes/webhook.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/friends', require('./routes/friend.routes'));
app.use('/api/partner', require('./routes/partner.routes'));
app.use('/api/partners', require('./routes/partner-subscription.routes'));
app.use('/api/sse', require('./routes/sse.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/achievements', require('./routes/achievements.routes'));
app.use('/api/support', require('./routes/support.routes'));

// NOTE: rewardsRoutes was auto-added but require was misplaced - fixed by CTOAgent
// If rewards feature is needed, uncomment below:
// const rewardsRoutes = require('./routes/rewards.routes');
// app.use('/api/rewards', rewardsRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;
