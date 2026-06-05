const User = require('../models/user.model');
const UserSession = require('../models/user-session.model');
const mongoose = require('mongoose');

let clients = {};
let globalClients = [];
let userClients = {};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const addClient = (userId, res, matchId = null) => {
  const clientId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const clientInfo = {
    id: clientId,
    userId,
    res,
    matchId,
    connectedAt: new Date(),
    ip: res.req?.ip || null,
    userAgent: res.req?.headers?.['user-agent'] || null,
  };

  if (matchId) {
    if (!clients[matchId]) clients[matchId] = [];
    clients[matchId].push(clientInfo);
  }

  globalClients.push(clientInfo);

  if (isValidObjectId(userId)) {
    if (!userClients[userId]) userClients[userId] = [];
    userClients[userId].push(clientInfo);

    // Guard: only query DB if connection is ready
    if (mongoose.connection.readyState === 1) {
      UserSession.findOneAndUpdate(
        { user_id: userId },
        {
          $set: { last_seen: new Date(), is_online: true },
          $inc: { login_count: 0 },
        },
        { upsert: true, new: true }
      ).catch(err => console.error('SSE session update error:', err));
    }
  }

  return clientId;
};

const removeClient = (clientId) => {
  const client = globalClients.find(c => c.id === clientId);
  if (!client) return;
  const { userId } = client;

  globalClients = globalClients.filter(c => c.id !== clientId);

  if (isValidObjectId(userId) && userClients[userId]) {
    userClients[userId] = userClients[userId].filter(c => c.id !== clientId);
    if (userClients[userId].length === 0) {
      delete userClients[userId];

      if (mongoose.connection.readyState === 1) {
        UserSession.findOneAndUpdate(
          { user_id: userId },
          { is_online: false, last_seen: new Date() }
        ).catch(err => console.error('SSE offline update error:', err));
      }
    }
  }

  for (const matchId in clients) {
    clients[matchId] = clients[matchId].filter(c => c.id !== clientId);
    if (clients[matchId].length === 0) delete clients[matchId];
  }
};

const removeClientByRes = (res) => {
  const client = globalClients.find(c => c.res === res);
  if (client) removeClient(client.id);
};

const writeMessage = (res, data) => {
  try {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    res.write(message);
    return true;
  } catch (err) {
    return false;
  }
};

const broadcastToUser = (userId, data) => {
  if (!userClients[userId]) return;
  userClients[userId].forEach(client => {
    if (!writeMessage(client.res, data)) {
      removeClient(client.id);
    }
  });
};

const broadcastToUsers = (userIds, data) => {
  userIds.forEach(uid => broadcastToUser(uid, data));
};

const broadcastToMatch = (matchId, data) => {
  if (!clients[matchId]) return;
  clients[matchId].forEach(client => {
    if (!writeMessage(client.res, data)) {
      removeClient(client.id);
    }
  });
};

const broadcastGlobal = (data) => {
  globalClients.forEach(client => {
    if (!writeMessage(client.res, data)) {
      removeClient(client.id);
    }
  });
};

const broadcastToFriends = (userId, data) => {
  const Friend = require('../models/friend.model');
  Friend.find({ user_id: userId, status: 'ACCEPTED' })
    .select('friend_id')
    .then(friends => {
      const friendIds = friends.map(f => f.friend_id.toString());
      broadcastToUsers(friendIds, data);
    })
    .catch(err => console.error('Broadcast to friends error:', err));
};

const getActiveUserCount = async () => {
  if (mongoose.connection.readyState !== 1) return 0;
  try {
    return await UserSession.countDocuments({ is_online: true });
  } catch (err) {
    console.error('Error counting active users:', err);
    return 0;
  }
};

const getActiveUserIds = () => {
  return [...new Set(globalClients.map(c => c.userId).filter(isValidObjectId))];
};

const getMatchClientCount = (matchId) => {
  if (!clients[matchId]) return 0;
  return new Set(clients[matchId].map(c => c.userId).filter(isValidObjectId)).size;
};

const getUserClientCount = (userId) => {
  return userClients[userId] ? userClients[userId].length : 0;
};

const cleanupStaleClients = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  try {
    await UserSession.updateMany(
      { is_online: true, last_seen: { $lt: fiveMinutesAgo } },
      { is_online: false }
    );
  } catch (err) {
    if (err.name !== 'MongoNetworkTimeoutError' && !err.message?.includes('PoolCleared')) {
      console.error('Cleanup stale clients error:', err.message);
    }
  }
};

setInterval(cleanupStaleClients, 60 * 1000);

module.exports = {
  addClient,
  removeClient,
  removeClientByRes,
  broadcastToUser,
  broadcastToUsers,
  broadcastToMatch,
  broadcastGlobal,
  broadcastToFriends,
  getActiveUserCount,
  getActiveUserIds,
  getMatchClientCount,
  getUserClientCount,
  cleanupStaleClients,
};
