const { SupportTicket, SupportReply } = require('../models/support-ticket.model');
const { broadcast, broadcastToUser } = require('../utils/sse');
const { sendEmail } = require('../services/email.service');
const User = require('../models/user.model');
const Match = require('../models/match.model');
const STATUS_CODES = require('../utils/statusCodes');

// ============ USER / PARTNER FACING ============

const createTicket = async (req, res) => {
  try {
    const { category, subject, description, priority, related_match_id, attachments } = req.body;
    if (!category || !subject || !description) {
      return res.sendError(new Error('Validation'), 'category, subject and description are required', STATUS_CODES.BAD_REQUEST);
    }
    if (String(subject).trim().length < 5) {
      return res.sendError(new Error('Validation'), 'Subject must be at least 5 characters', STATUS_CODES.BAD_REQUEST);
    }
    if (String(description).trim().length < 20) {
      return res.sendError(new Error('Validation'), 'Description must be at least 20 characters', STATUS_CODES.BAD_REQUEST);
    }
    const validCategories = ['PAYMENT_ISSUE', 'MATCH_DISPUTE', 'ACCOUNT_ISSUE', 'PARTNER_RELATED', 'TECHNICAL_BUG', 'REFUND_REQUEST', 'REPORT_PLAYER', 'GAME_RULES', 'FEATURE_REQUEST', 'OTHER'];
    if (!validCategories.includes(category)) {
      return res.sendError(new Error('Validation'), 'Invalid category', STATUS_CODES.BAD_REQUEST);
    }

    const ticket_number = await SupportTicket.generateTicketNumber();

    let matchId = null;
    if (related_match_id) {
      const match = await Match.findById(related_match_id);
      if (match) matchId = match._id;
    }

    const ticket = await SupportTicket.create({
      ticket_number,
      user_id: req.user.id,
      user_role: req.user.role,
      category,
      subject: String(subject).trim(),
      description: String(description).trim(),
      priority: priority || 'MEDIUM',
      related_match_id: matchId,
      attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
      last_reply_by: 'USER',
    });

    // Notify all admins via SSE
    const admins = await User.find({ role: 'ADMIN', is_blocked: false }).select('_id').lean();
    admins.forEach((admin) => {
      broadcastToUser(admin._id.toString(), {
        type: 'SUPPORT_TICKET_NEW',
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticket_number,
          category: ticket.category,
          priority: ticket.priority,
          subject: ticket.subject,
          fromRole: ticket.user_role,
        },
      });
    });

    // Email confirmation to ticket owner (best-effort)
    try {
      const ticketOwner = await User.findById(req.user.id);
      if (ticketOwner?.email) {
        await sendEmail({
          to: ticketOwner.email,
          subject: `Ticket #${ticket.ticket_number} created — we'll be in touch soon`,
          text: `Hi ${ticketOwner.username || 'there'},\n\nYour support ticket "${ticket.subject}" has been created (Ticket #${ticket.ticket_number}).\nCategory: ${ticket.category}\nPriority: ${ticket.priority}\n\nOur team will review it and get back to you shortly. You can track the status inside the app.\n\nThanks,\nSupport Team`,
        });
      }
    } catch (_) { /* ignore email errors */ }

    res.sendSuccess(ticket, 'Support ticket created', STATUS_CODES.CREATED);
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getMyTickets = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const query = { user_id: req.user.id };
    if (status) query.status = status;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ last_reply_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);
    res.sendSuccess({
      tickets,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id)
      .populate('assigned_to', 'username email role')
      .lean();
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);

    // Permission: user can only see their own tickets; admin can see all
    if (req.user.role !== 'ADMIN' && ticket.user_id.toString() !== req.user.id) {
      return res.sendError(new Error('Forbidden'), 'Not authorized to view this ticket', STATUS_CODES.FORBIDDEN);
    }

    // Get replies (internal notes hidden from non-admins)
    const replyQuery = { ticket_id: ticket._id };
    if (req.user.role !== 'ADMIN') {
      replyQuery.is_internal_note = false;
    }
    const replies = await SupportReply.find(replyQuery)
      .populate('sender_id', 'username email role')
      .sort({ createdAt: 1 })
      .lean();

    // Mark user's own unread replies as read
    if (req.user.role === 'ADMIN') {
      await SupportReply.updateMany(
        { ticket_id: ticket._id, sender_role: { $in: ['USER', 'PARTNER'] }, read_at: null },
        { $set: { read_at: new Date() } }
      );
    } else {
      await SupportReply.updateMany(
        { ticket_id: ticket._id, sender_role: 'ADMIN', read_at: null },
        { $set: { read_at: new Date() } }
      );
    }

    res.sendSuccess({ ...ticket, replies });
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const replyToTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments, is_internal_note } = req.body;
    if (!message || String(message).trim().length < 1) {
      return res.sendError(new Error('Validation'), 'message is required', STATUS_CODES.BAD_REQUEST);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);

    // Permission check
    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = ticket.user_id.toString() === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.sendError(new Error('Forbidden'), 'Not authorized', STATUS_CODES.FORBIDDEN);
    }

    // User cannot reply to closed/resolved tickets
    if (!isAdmin && ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return res.sendError(new Error('Validation'), 'Cannot reply to a closed/resolved ticket. Reopen it first.', STATUS_CODES.BAD_REQUEST);
    }

    // Only admins can post internal notes
    const isInternal = isAdmin && Boolean(is_internal_note);

    const reply = await SupportReply.create({
      ticket_id: ticket._id,
      sender_id: req.user.id,
      sender_role: isAdmin ? 'ADMIN' : ticket.user_role,
      message: String(message).trim(),
      attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
      is_internal_note: isInternal,
    });

    // Update ticket status / last reply
    ticket.last_reply_at = new Date();
    ticket.last_reply_by = isAdmin ? 'ADMIN' : 'USER';
    if (isAdmin) {
      if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
      if (ticket.status === 'AWAITING_USER') ticket.status = 'IN_PROGRESS';
    } else {
      if (ticket.status === 'AWAITING_USER' || ticket.status === 'IN_PROGRESS') {
        ticket.status = 'AWAITING_USER';
      }
    }
    await ticket.save();

    // Notify the other party via SSE (no email — chat updates stay in-app)
    if (isAdmin && !isInternal) {
      broadcastToUser(ticket.user_id.toString(), {
        type: 'SUPPORT_TICKET_UPDATE',
        data: { ticketId: ticket._id, ticketNumber: ticket.ticket_number, status: ticket.status, message: reply.message },
      });
    } else if (!isAdmin) {
      const admins = await User.find({ role: 'ADMIN', is_blocked: false }).select('_id').lean();
      admins.forEach((admin) => {
        broadcastToUser(admin._id.toString(), {
          type: 'SUPPORT_TICKET_UPDATE',
          data: { ticketId: ticket._id, ticketNumber: ticket.ticket_number, status: ticket.status, message: reply.message },
        });
      });
    }

    const populated = await SupportReply.findById(reply._id).populate('sender_id', 'username role').lean();
    res.sendSuccess(populated, 'Reply posted');
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body || {};
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);

    if (ticket.user_id.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.sendError(new Error('Forbidden'), 'Not authorized', STATUS_CODES.FORBIDDEN);
    }

    ticket.status = 'CLOSED';
    ticket.closed_at = new Date();
    if (rating) {
      const r = parseInt(rating, 10);
      if (r >= 1 && r <= 5) ticket.rating = r;
    }
    if (feedback) ticket.rating_feedback = String(feedback).slice(0, 1000);
    await ticket.save();

    // Email confirmation to ticket owner (best-effort)
    try {
      const ticketOwner = await User.findById(ticket.user_id);
      if (ticketOwner?.email) {
        await sendEmail({
          to: ticketOwner.email,
          subject: `Ticket #${ticket.ticket_number} closed`,
          text: `Hi ${ticketOwner.username || 'there'},\n\nYour support ticket "${ticket.subject}" has been closed.\n${rating ? `Thanks for rating us ${rating}/5!` : 'We hope we resolved your issue.'}\nIf you need more help, feel free to open a new ticket anytime in the app.\n\nThanks,\nSupport Team`,
        });
      }
    } catch (_) { /* ignore email errors */ }

    res.sendSuccess(ticket, 'Ticket closed');
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const reopenTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);
    if (ticket.user_id.toString() !== req.user.id) {
      return res.sendError(new Error('Forbidden'), 'Only ticket owner can reopen', STATUS_CODES.FORBIDDEN);
    }
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return res.sendError(new Error('Validation'), 'Only closed/resolved tickets can be reopened', STATUS_CODES.BAD_REQUEST);
    }
    ticket.status = 'OPEN';
    ticket.closed_at = null;
    ticket.resolved_at = null;
    await ticket.save();
    res.sendSuccess(ticket, 'Ticket reopened');
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

// ============ ADMIN FACING ============

const getAllTickets = async (req, res) => {
  try {
    const { status, priority, category, assigned_to, search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assigned_to) query.assigned_to = assigned_to === 'unassigned' ? null : assigned_to;
    if (search) {
      query.$or = [
        { ticket_number: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('user_id', 'username email role')
        .populate('assigned_to', 'username email')
        .sort({ priority: -1, last_reply_at: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      SupportTicket.countDocuments(query),
    ]);
    res.sendSuccess({
      tickets,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);

    let targetAdminId = null;
    if (admin_id) {
      const admin = await User.findById(admin_id);
      if (!admin || admin.role !== 'ADMIN') {
        return res.sendError(new Error('Validation'), 'Invalid admin', STATUS_CODES.BAD_REQUEST);
      }
      targetAdminId = admin._id;
    } else {
      targetAdminId = req.user.id; // self-assign
    }
    ticket.assigned_to = targetAdminId;
    ticket.assigned_at = new Date();
    if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
    await ticket.save();
    res.sendSuccess(ticket, 'Ticket assigned');
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body || {};
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.sendError(new Error('Not found'), 'Ticket not found', STATUS_CODES.NOT_FOUND);
    const validStatus = ['OPEN', 'IN_PROGRESS', 'AWAITING_USER', 'RESOLVED', 'CLOSED'];
    const validPriority = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (status) {
      if (!validStatus.includes(status)) {
        return res.sendError(new Error('Validation'), 'Invalid status', STATUS_CODES.BAD_REQUEST);
      }
      ticket.status = status;
      if (status === 'RESOLVED') ticket.resolved_at = new Date();
      if (status === 'CLOSED') ticket.closed_at = new Date();
    }
    if (priority) {
      if (!validPriority.includes(priority)) {
        return res.sendError(new Error('Validation'), 'Invalid priority', STATUS_CODES.BAD_REQUEST);
      }
      ticket.priority = priority;
    }
    await ticket.save();
    // Notify user of status change
    broadcastToUser(ticket.user_id.toString(), {
      type: 'SUPPORT_TICKET_STATUS',
      data: { ticketId: ticket._id, ticketNumber: ticket.ticket_number, status: ticket.status, priority: ticket.priority },
    });
    res.sendSuccess(ticket, 'Ticket updated');
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

const getTicketStats = async (req, res) => {
  try {
    const [open, inProgress, awaitingUser, resolved, closed, urgent, unassigned] = await Promise.all([
      SupportTicket.countDocuments({ status: 'OPEN' }),
      SupportTicket.countDocuments({ status: 'IN_PROGRESS' }),
      SupportTicket.countDocuments({ status: 'AWAITING_USER' }),
      SupportTicket.countDocuments({ status: 'RESOLVED' }),
      SupportTicket.countDocuments({ status: 'CLOSED' }),
      SupportTicket.countDocuments({ priority: 'URGENT', status: { $ne: 'CLOSED' } }),
      SupportTicket.countDocuments({ assigned_to: null, status: { $ne: 'CLOSED' } }),
    ]);
    const byCategory = await SupportTicket.aggregate([
      { $match: { status: { $ne: 'CLOSED' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.sendSuccess({
      open, inProgress, awaitingUser, resolved, closed, urgent, unassigned,
      byCategory,
      totalActive: open + inProgress + awaitingUser,
    });
  } catch (error) {
    res.sendError(error, error.message, STATUS_CODES.BAD_REQUEST);
  }
};

module.exports = {
  // User/Partner
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  closeTicket,
  reopenTicket,
  // Admin
  getAllTickets,
  assignTicket,
  updateTicketStatus,
  getTicketStats,
};
