const sseService = require('../services/sse.service');

const setupSSEConnection = async (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  };
  res.writeHead(200, headers);

  const userId = req.userId || req.user?._id?.toString() || 'anonymous';
  const matchId = req.query.matchId || null;

  const clientId = sseService.addClient(userId, res, matchId);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, userId })}\n\n`);

  const activeCount = await sseService.getActiveUserCount();
  sseService.broadcastGlobal({
    type: 'ACTIVE_USERS_UPDATE',
    active: activeCount,
  });

  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', ts: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', async () => {
    clearInterval(heartbeat);
    sseService.removeClient(clientId);

    const activeCount = await sseService.getActiveUserCount();
    sseService.broadcastGlobal({
      type: 'ACTIVE_USERS_UPDATE',
      active: activeCount,
    });
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    sseService.removeClientByRes(res);
  });
};

const broadcast = (data) => {
  sseService.broadcastGlobal(data);
};

const broadcastToUser = (userId, data) => {
  sseService.broadcastToUser(userId, data);
};

const broadcastToFriends = (userId, data) => {
  sseService.broadcastToFriends(userId, data);
};

const broadcastToUsers = (userIds, data) => {
  if (!Array.isArray(userIds)) userIds = [userIds];
  userIds.forEach((uid) => {
    const id = uid?.toString ? uid.toString() : String(uid);
    sseService.broadcastToUser(id, data);
  });
};

module.exports = {
  setupSSEConnection,
  broadcast,
  broadcastToUser,
  broadcastToFriends,
  broadcastToUsers,
};
