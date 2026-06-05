// Admin finance controller — wallets (list / inspect / adjust),
// transactions (list / inspect). Decryption + re-encryption helpers
// are imported from admin.dashboard.controller so the wallet
// formatting stays consistent with /admin/stats.

const User = require("../models/user.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const { decrypt, encrypt } = require("../utils/encryption");
const dashboard = require("./admin.dashboard.controller");
const { safeDecryptNumber, formatWalletForAdmin } = dashboard;

const getWallets = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    let query = {};

    if (q) {
      const users = await User.find({
        $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }],
      }).select("_id");
      const userIds = users.map((u) => u._id);
      query.user_id = { $in: userIds };
    }

    const total = await Wallet.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const wallets = await Wallet.find(query)
      .sort("-createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const formatted = [];
    for (const w of wallets) {
      formatted.push(await formatWalletForAdmin(w));
    }
    res.json({
      success: true,
      data: formatted,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWalletById = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet)
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found" });
    const formatted = await formatWalletForAdmin(wallet);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adjustWalletBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, reason } = req.body;

    if (!amount || typeof amount !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "amount must be a number" });
    }

    if (!["CREDIT", "DEBIT"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "type must be CREDIT or DEBIT" });
    }

    const wallet = await Wallet.findById(id);
    if (!wallet)
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found" });

    let available = safeDecryptNumber(wallet.available_balance);
    let withdrawable = safeDecryptNumber(wallet.withdrawable_balance);
    const delta = Number(amount);

    if (type === "DEBIT" && available < delta) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient available balance" });
    }
    if (type === "DEBIT" && withdrawable < delta) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient withdrawable balance" });
    }

    available = type === "CREDIT" ? available + delta : available - delta;
    withdrawable =
      type === "CREDIT" ? withdrawable + delta : withdrawable - delta;

    wallet.available_balance = encrypt(String(available));
    wallet.withdrawable_balance = encrypt(String(withdrawable));
    await wallet.save();

    await Transaction.create({
      user_id: wallet.user_id,
      amount: delta,
      type: type === "CREDIT" ? "DEPOSIT" : "WITHDRAW",
      category: "WALLET",
      status: "SUCCESS",
      description: reason || "Admin adjustment",
      metadata: { admin_user_id: req.user._id, admin_adjustment: true },
    });

    const formatted = await formatWalletForAdmin(wallet);
    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { userId, type, status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const query = {};
    if (userId) query.user_id = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    const total = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const transactions = await Transaction.find(query)
      .populate("user_id", "username email")
      .sort("-createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      data: transactions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate(
      "user_id",
      "username email",
    );
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWallets,
  getWalletById,
  adjustWalletBalance,
  getTransactions,
  getTransactionById,
};
