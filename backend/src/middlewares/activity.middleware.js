const UserSession = require('../models/user-session.model');

const trackActivity = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      const now = new Date();
      const sessionThreshold = 30 * 60 * 1000;

      let session = await UserSession.findOne({ user_id: req.user.id });
      if (session) {
        const isNewSession = !session.last_login_at ||
          (now - new Date(session.last_login_at).getTime()) > sessionThreshold;

        session.last_seen = now;
        session.is_online = true;

        if (isNewSession) {
          session.login_count = (session.login_count || 0) + 1;
          session.last_login_at = now;
        }

        await session.save();
      } else {
        await UserSession.create({
          user_id: req.user.id,
          is_online: true,
          last_seen: now,
          last_login_at: now,
          login_count: 1,
        });
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const markUserOffline = async (userId) => {
  try {
    await UserSession.findOneAndUpdate(
      { user_id: userId },
      { is_online: false, last_seen: new Date() }
    );
  } catch (error) {
    console.error('Error marking user offline:', error);
  }
};

module.exports = { trackActivity, markUserOffline };
