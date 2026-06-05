// Admin user controller — list / inspect / edit / block / delete
// users, plus mediator application review, user financial profile,
// and security audit log.

const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const UserProfile = require("../models/user-profile.model");
const UserStats = require("../models/user-stats.model");
const UserSession = require("../models/user-session.model");
const UserPass = require("../models/user-pass.model");
const UserSpendAnalytics = require("../models/user-spend-analytics.model");
const PartnerProfile = require("../models/partner-profile.model");
const PartnerSubscription = require("../models/partner-subscription.model");
const MediatorApplication = require("../models/mediator-application.model");
const SecurityAudit = require("../models/security-audit.model");
const OtpVerification = require("../models/otp-verification.model");
const Payment = require("../models/payment.model");
const Transaction = require("../models/transaction.model");
const Notification = require("../models/notification.model");
const Friend = require("../models/friend.model");
const Match = require("../models/match.model");
const CashfreeWebhookLog = require("../models/cashfree-webhook-log.model");

const ALLOWED_USER_FIELDS = ["email", "is_verified", "is_blocked", "account_status"];
const ALLOWED_PROFILE_FIELDS = ["full_name", "phone"];

const getUsers = async (req, res) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    const query = {};
    if (q) {
      query.$or = [
        { username: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }
    if (role) {
      const roles = String(role)
        .split(",")
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean);
      if (roles.length === 1) {
        query.role = roles[0];
      } else if (roles.length > 1) {
        query.role = { $in: roles };
      }
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const users = await User.find(query)
      .select("-password_hash")
      .sort("-created_at")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({
      success: true,
      data: users,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password_hash");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const userUpdates = {};
    const profileUpdates = {};

    for (const key of Object.keys(updates)) {
      if (ALLOWED_USER_FIELDS.includes(key)) {
        userUpdates[key] = updates[key];
      } else if (ALLOWED_PROFILE_FIELDS.includes(key)) {
        profileUpdates[key] = updates[key];
      }
    }

    const user = await User.findByIdAndUpdate(id, userUpdates, { new: true }).select("-password_hash");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (Object.keys(profileUpdates).length > 0) {
      await UserProfile.findOneAndUpdate({ user_id: id }, profileUpdates, { upsert: true, new: true });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const orderIds = await Payment.find({ user_id: id }).distinct("order_id");

    await Promise.all([
      Wallet.deleteMany({ user_id: id }),
      UserProfile.deleteMany({ user_id: id }),
      UserStats.deleteMany({ user_id: id }),
      UserSession.deleteMany({ user_id: id }),
      Friend.deleteMany({ $or: [{ user_id: id }, { friend_id: id }] }),
      Transaction.deleteMany({ user_id: id }),
      Payment.deleteMany({ user_id: id }),
      Notification.deleteMany({ $or: [{ user_id: id }, { sender_id: id }] }),
      UserPass.deleteMany({ user_id: id }),
      UserSpendAnalytics.deleteMany({ user_id: id }),
      PartnerProfile.deleteMany({ user_id: id }),
      PartnerSubscription.deleteMany({ subscriber_id: id }),
      MediatorApplication.deleteMany({ user_id: id }),
      SecurityAudit.deleteMany({ user_id: id }),
      OtpVerification.deleteMany({ user_id: id }),
      Match.updateMany(
        { "participants.user_id": id },
        { $pull: { participants: { user_id: id } } }
      ),
      Match.deleteMany({ created_by: id }),
    ]);

    if (orderIds.length > 0) {
      await CashfreeWebhookLog.deleteMany({ order_id: { $in: orderIds } });
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const blockUnblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'BLOCK' or 'UNBLOCK'
    const emailService = require('../services/email.service');

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'BLOCK') {
      if (user.role === 'ADMIN') {
        return res.status(403).json({ success: false, message: 'You cannot block an administrator.' });
      }

      user.is_blocked = true;
      user.block_reason = reason || 'Violation of terms';
      await user.save();

      if (user.email) {
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: 'Account Blocked Notice',
            text: `Your account has been blocked by the administrator. Reason: ${user.block_reason}`,
            html: `<p>Your account has been blocked by the administrator.</p><p><b>Reason:</b> ${user.block_reason}</p>`
          });
        } catch (emailErr) {
          console.error("Failed to send block email:", emailErr);
        }
      }
      res.json({ success: true, message: 'User blocked successfully', data: user });
    } else if (action === 'UNBLOCK') {
      user.is_blocked = false;
      user.block_reason = undefined;
      await user.save();

      if (user.email) {
        try {
          await emailService.sendEmail({
            to: user.email,
            subject: 'Account Unblocked Notice',
            text: 'Your account has been successfully unblocked. You can now log in.',
            html: '<p>Your account has been successfully unblocked. You can now log in.</p>'
          });
        } catch (emailErr) {
          console.error("Failed to send unblock email:", emailErr);
        }
      }
      res.json({ success: true, message: 'User unblocked successfully', data: user });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be BLOCK or UNBLOCK' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to block/unblock user' });
  }
};

const getMediatorApplications = async (req, res) => {
  try {
    const { status = "PENDING", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const query = { status };
    const total = await MediatorApplication.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const applications = await MediatorApplication.find(query)
      .populate("user_id", "username email phone mediator_application_status mediator_application_note")
      .populate("reviewed_by", "username email")
      .sort("-applied_at")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({
      success: true,
      data: applications,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveMediatorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;

    const app = await MediatorApplication.findOne({ user_id: id });
    if (!app) {
      return res.status(404).json({ success: false, message: "Mediator application not found" });
    }

    app.status = "APPROVED";
    app.reviewed_at = new Date();
    if (adminId) app.reviewed_by = adminId;
    await app.save();

    const user = await User.findByIdAndUpdate(
      id,
      { mediator_application_status: "APPROVED", role: "MEDIATOR" },
      { new: true }
    ).select("-password_hash");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectMediatorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const adminId = req.user?._id;

    const app = await MediatorApplication.findOne({ user_id: id });
    if (!app) {
      return res.status(404).json({ success: false, message: "Mediator application not found" });
    }

    app.status = "REJECTED";
    app.note = note || null;
    app.reviewed_at = new Date();
    if (adminId) app.reviewed_by = adminId;
    await app.save();

    const user = await User.findByIdAndUpdate(
      id,
      { mediator_application_status: "REJECTED", mediator_application_note: note || null },
      { new: true }
    ).select("-password_hash");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserFinancialProfile = async (req, res) => {
  try {
    const spendAnalyticsService = require('../services/user-spend-analytics.service');
    const profile = await spendAnalyticsService.getAdminUserFinancialProfile(req.params.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSecurityAudits = async (req, res) => {
  try {
    const { flagged, riskLevel, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const query = {};

    if (flagged === 'true') query.flagged = true;
    if (riskLevel) query.risk_level = riskLevel;

    const total = await SecurityAudit.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const audits = await SecurityAudit.find(query)
      .populate('user_id', 'username email')
      .sort({ created_at: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: audits,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUnblockUser,
  getMediatorApplications,
  approveMediatorApplication,
  rejectMediatorApplication,
  getUserFinancialProfile,
  getSecurityAudits,
};
