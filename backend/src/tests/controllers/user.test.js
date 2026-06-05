const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const express = require('express');
const User = require('../../models/user.model');
const UserProfile = require('../../models/user-profile.model');
const Wallet = require('../../models/wallet.model');
const Match = require('../../models/match.model');
const Friend = require('../../models/friend.model');
const { encrypt } = require('../../utils/encryption');
const apiResponse = require('../../middlewares/responseHandler');
const userController = require('../../controllers/user.controller');

let app;
let testUser;
let otherUser;

async function createTestUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  testUser = await User.create({
    username: 'testuser',
    email: 'testuser@example.com',
    password_hash: hashedPassword,
    role: 'USER',
  });

  otherUser = await User.create({
    username: 'otheruser',
    email: 'other@example.com',
    password_hash: hashedPassword,
    role: 'USER',
  });
}

function createMockApp(routes) {
  const app = express();
  app.use(express.json());
  app.use(apiResponse);
  app.use((req, res, next) => {
    req.user = testUser;
    req.userId = testUser._id.toString();
    next();
  });
  routes(app);
  return app;
}

describe('User Controller - Profile', () => {
  beforeEach(async () => {
    await createTestUsers();
    app = createMockApp((app) => {
      app.get('/users/profile', userController.getProfile);
      app.put('/users/profile', userController.updateProfile);
    });
  });

  it('should get user profile', async () => {
    const res = await request(app).get('/users/profile');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.email).toBe('testuser@example.com');
    expect(res.body.data.profile).toBeDefined();
  });

  it('should create profile if not exists', async () => {
    await UserProfile.deleteOne({ user_id: testUser._id });

    const res = await request(app).get('/users/profile');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.profile).toBeDefined();
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .put('/users/profile')
      .send({
        user: { username: 'updateduser' },
        profile: {
          full_name: 'Test User',
          phone: '1234567890',
          game_uid_name: 'GameMaster',
          bio: 'Hello World',
        },
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.username).toBe('updateduser');
    expect(res.body.data.profile.full_name).toBe('Test User');
    expect(res.body.data.profile.phone).toBe('1234567890');
  });

  it('should update only allowed user fields', async () => {
    const res = await request(app)
      .put('/users/profile')
      .send({
        user: { email: 'hacked@example.com' },
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe('testuser@example.com');
  });

  it('should update only allowed profile fields', async () => {
    const res = await request(app)
      .put('/users/profile')
      .send({
        profile: {
          full_name: 'Valid Name',
          malicious_field: 'should be ignored',
        },
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.profile.full_name).toBe('Valid Name');
  });
});

describe('User Controller - Public Profile', () => {
  beforeEach(async () => {
    await createTestUsers();
    app = createMockApp((app) => {
      app.get('/users/profile/:id', userController.getPublicProfile);
    });
  });

  it('should get public profile of another user', async () => {
    const res = await request(app).get(`/users/profile/${otherUser._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.username).toBe('otheruser');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('should return 404 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/users/profile/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('User Controller - Stats', () => {
  beforeEach(async () => {
    await createTestUsers();
    app = createMockApp((app) => {
      app.get('/users/stats', userController.getStats);
    });
  });

  it('should return user stats with zero matches', async () => {
    const res = await request(app).get('/users/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalMatches).toBe(0);
    expect(res.body.data.completedMatches).toBe(0);
    expect(res.body.data.ongoingMatches).toBe(0);
    expect(res.body.data.openMatches).toBe(0);
    expect(res.body.data.friendsCount).toBe(0);
  });

  it('should return stats with matches', async () => {
    await Match.create({
      created_by: otherUser._id,
      title: 'Test Match',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      isPublished: true,
      status: 'COMPLETED',
      participants: [
        { user_id: testUser._id },
        { user_id: otherUser._id },
      ],
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const res = await request(app).get('/users/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalMatches).toBe(1);
    expect(res.body.data.completedMatches).toBe(1);
  });

  it('should return stats with friends count', async () => {
    await Friend.insertMany([
      {
        user_id: testUser._id,
        friend_id: otherUser._id,
        status: 'ACCEPTED',
        initiated_by: testUser._id,
      },
    ]);

    const res = await request(app).get('/users/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.friendsCount).toBe(1);
  });
});
