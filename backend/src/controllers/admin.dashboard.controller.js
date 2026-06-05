// Admin dashboard controller — top-level stats, weekly performance
// trend, and the mediator ops dashboard. Also exposes the shared
// wallet-formatting helper + date-range / series helpers that the
// weekly-performance route relies on.

const User = require("../models/user.model");
const Match = require("../models/match.model");
const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const { decrypt, encrypt } = require("../utils/encryption");

// -------- shared helpers (also used by admin.finance.controller) --------

const safeDecryptNumber = (val) => {
  const decrypted = decrypt(val);
  const num = Number(decrypted);
  return Number.isNaN(num) ? 0 : num;
};

const formatWalletForAdmin = async (wallet) => {
  const walletObj = wallet.toObject ? wallet.toObject() : wallet;
  const user = await User.findById(walletObj.user_id).select(
    "username email role is_verified ads_disabled created_at",
  );
  return {
    ...walletObj,
    wallet_account_no: decrypt(walletObj.wallet_account_no),
    available_balance: safeDecryptNumber(walletObj.available_balance),
    locked_balance: safeDecryptNumber(walletObj.locked_balance),
    withdrawable_balance: safeDecryptNumber(walletObj.withdrawable_balance),
    user,
  };
};

const getLast7DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const getPrev7DaysRange = () => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { start, end };
};

const buildLabels = (start) => {
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
};

const seriesFromRows = (labels, rows) => {
  const map = new Map(rows.map((r) => [r._id, r.total]));
  return labels.map((l) => map.get(l) || 0);
};

const trendPct = (currentSum, previousSum) => {
  if (!previousSum) return currentSum > 0 ? 100 : 0;
  return Math.round(((currentSum - previousSum) / previousSum) * 100);
};

// -------- handlers --------

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalMatches = await Match.countDocuments();
    const activeMatches = await Match.countDocuments({
      status: { $in: ["OPEN", "ONGOING"] },
    });

    const wallets = await Wallet.find();
    const totalWalletBalance = wallets.reduce((acc, w) => {
      const available = safeDecryptNumber(w.available_balance);
      const locked = safeDecryptNumber(w.locked_balance);
      const withdrawable = safeDecryptNumber(w.withdrawable_balance);
      return acc + available + locked + withdrawable;
    }, 0);

    const pendingWithdrawalAgg = await Transaction.aggregate([
      { $match: { type: "WITHDRAW", status: "PENDING" } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);
    const pendingWithdrawals = {
      count: pendingWithdrawalAgg[0]?.count || 0,
      total: pendingWithdrawalAgg[0]?.total || 0,
    };

    const pendingMediatorApprovals = await User.countDocuments({
      mediator_application_status: "PENDING",
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalMatches,
        activeMatches,
        totalWalletBalance,
        pendingWithdrawals,
        pendingMediatorApprovals,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getWeeklyPerformance = async (req, res) => {
  try {
    const { start, end } = getLast7DaysRange();
    const labels = buildLabels(start);
    const { start: prevStart, end: prevEnd } = getPrev7DaysRange();

    const [revenueRows, userRows, matchRows, revenuePrev, userPrev, matchPrev] =
      await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
              type: "DEPOSIT",
              status: "SUCCESS",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              total: { $sum: "$amount" },
            },
          },
        ]),
        User.aggregate([
          {
            $match: {
              created_at: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
              },
              total: { $sum: 1 },
            },
          },
        ]),
        Match.aggregate([
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              total: { $sum: 1 },
            },
          },
        ]),
        Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              type: "DEPOSIT",
              status: "SUCCESS",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        User.aggregate([
          {
            $match: {
              created_at: { $gte: prevStart, $lte: prevEnd },
            },
          },
          { $group: { _id: null, total: { $sum: 1 } } },
        ]),
        Match.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
            },
          },
          { $group: { _id: null, total: { $sum: 1 } } },
        ]),
      ]);

    const revenueSeries = seriesFromRows(labels, revenueRows);
    const userSeries = seriesFromRows(labels, userRows);
    const participationSeries = seriesFromRows(labels, matchRows);

    const revenueSum = revenueSeries.reduce((a, b) => a + b, 0);
    const userSum = userSeries.reduce((a, b) => a + b, 0);
    const participationSum = participationSeries.reduce((a, b) => a + b, 0);

    const prevRevenueSum = revenuePrev[0]?.total || 0;
    const prevUserSum = userPrev[0]?.total || 0;
    const prevParticipationSum = matchPrev[0]?.total || 0;

    res.json({
      success: true,
      data: {
        labels,
        series: {
          revenue: revenueSeries,
          userGrowth: userSeries,
          participation: participationSeries,
        },
        totals: {
          revenue: revenueSum,
          userGrowth: userSum,
          participation: participationSum,
        },
        trends: {
          revenuePct: trendPct(revenueSum, prevRevenueSum),
          userGrowthPct: trendPct(userSum, prevUserSum),
          participationPct: trendPct(participationSum, prevParticipationSum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMediatorDashboard = async (req, res) => {
  try {
    const matches = await Match.find({
      status: { $in: ['OPEN', 'ONGOING', 'REVIEW'] },
      isPublished: true,
    })
      .populate('created_by', 'username email')
      .sort({ match_date: 1, match_time: 1 });

    const dashboardData = matches.map(m => ({
      _id: m._id,
      title: m.title,
      status: m.status,
      entry_fee: m.entry_fee,
      prize_pool: m.prize_pool,
      participants_count: m.participants.length,
      max_players: m.max_players,
      creator_username: m.created_by?.username,
      total_collected: m.participants.length * m.entry_fee,
      match_date: m.match_date,
      match_time: m.match_time,
      room_id: m.room_id,
    }));

    const totalActiveMatches = dashboardData.length;
    const totalRevenue = dashboardData.reduce((sum, m) => sum + m.total_collected, 0);

    res.json({
      success: true,
      data: {
        matches: dashboardData,
        totalActiveMatches,
        totalRevenue,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  getWeeklyPerformance,
  getMediatorDashboard,
  // helpers (also used by admin.finance.controller)
  safeDecryptNumber,
  formatWalletForAdmin,
};
