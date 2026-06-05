const SecurityAudit = require('../models/security-audit.model');

const auditLog = async (req, res, originalNext) => {
  try {
    const userId = req.user?._id || null;
    const action = `${req.method} ${req.originalUrl}`;
    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers?.['user-agent'] || null;

    let riskLevel = 'LOW';
    let flagged = false;
    let flagReason = null;

    const sensitivePaths = ['/wallet', '/payment', '/admin', '/auth'];
    const isSensitive = sensitivePaths.some(p => req.originalUrl.includes(p));

    if (isSensitive) {
      riskLevel = 'MEDIUM';
    }

    if (req.method === 'DELETE' || (req.method === 'PUT' && req.originalUrl.includes('role'))) {
      riskLevel = 'HIGH';
    }

    const suspiciousPatterns = ['../', '<script', 'javascript:', 'DROP ', 'DELETE ', '$ne', '$gt'];
    const bodyStr = JSON.stringify(req.body || '');
    const queryStr = JSON.stringify(req.query || '');
    const hasSuspicious = suspiciousPatterns.some(p =>
      bodyStr.includes(p) || queryStr.includes(p) || req.originalUrl.includes(p)
    );

    if (hasSuspicious) {
      riskLevel = 'CRITICAL';
      flagged = true;
      flagReason = 'Suspicious input pattern detected';
    }

    await SecurityAudit.create({
      user_id: userId,
      action,
      resource_type: req.originalUrl.split('/')[2] || null,
      resource_id: req.params.id || null,
      ip_address: ip,
      user_agent: userAgent,
      risk_level: riskLevel,
      details: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query,
        bodyKeys: Object.keys(req.body || {}),
      },
      flagged,
      flag_reason: flagReason,
    });

    if (flagged) {
      console.warn(`[SECURITY ALERT] ${flagReason} | IP: ${ip} | User: ${userId} | URL: ${req.originalUrl}`);
    }
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const auditMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  const captureResponse = (statusCode) => {
    if (statusCode >= 400) {
      auditLog(req, res, next);
    }
  };

  res.send = function (...args) {
    captureResponse(res.statusCode);
    return originalSend.apply(res, args);
  };

  res.json = function (...args) {
    captureResponse(res.statusCode);
    return originalJson.apply(res, args);
  };

  next();
};

module.exports = { auditMiddleware, auditLog };
