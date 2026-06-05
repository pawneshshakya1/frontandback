const express = require('express');
const router = express.Router();
const { setupSSEConnection } = require('../utils/sse');
const jwt = require('jsonwebtoken');

const extractToken = (req) => {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  if (req.query && req.query.token) {
    return String(req.query.token);
  }
  return null;
};

router.get('/events', (req, res) => {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = String(decoded.id);
    } catch (err) {
      req.userId = null;
    }
  } else {
    req.userId = null;
  }
  if (!req.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required for SSE' });
  }
  setupSSEConnection(req, res);
});

module.exports = router;
