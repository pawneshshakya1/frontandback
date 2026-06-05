const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Auth-gate middleware for /uploads paths.
 *
 * Allows public access to public assets (banners, logos) under
 * /uploads/public/* and /uploads/banners/*.
 *
 * Requires a valid JWT for private assets (support attachments,
 * user documents) under /uploads/support/*, /uploads/private/*,
 * /uploads/users/*, /uploads/avatars/*.
 *
 * Token is accepted from the Authorization header (preferred) OR
 * a `?token=...` query string (fallback for <img> / <Image> tags
 * that cannot set custom headers). The query-string fallback is
 * still authenticated, so it is safe.
 */
const PROTECTED_PREFIXES = ['/support', '/private', '/users', '/avatars', '/tickets'];
const PUBLIC_PREFIXES = ['/banners', '/public', '/logos'];

const protectUploads = async (req, res, next) => {
    const subPath = (req.path || req.url || '').split('?')[0];
    const isProtected = PROTECTED_PREFIXES.some((p) => subPath.startsWith(p));
    const isPublic = PUBLIC_PREFIXES.some((p) => subPath.startsWith(p));

    if (!isProtected || isPublic) {
        return next();
    }

    // Extract token from Authorization header OR ?token= query
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = String(req.query.token);
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required to access this resource',
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password_hash');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        if (user.is_blocked || user.account_status === 'SUSPENDED') {
            return res.status(403).json({ success: false, message: 'Account inactive' });
        }
        req.user = user;
        req.userId = user._id.toString();
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { protectUploads };
