const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const express = require('express');
const User = require('../../models/user.model');
const Match = require('../../models/match.model');
const Wallet = require('../../models/wallet.model');
const Transaction = require('../../models/transaction.model');
const Banner = require('../../models/banner.model');
const MediatorApplication = require('../../models/mediator-application.model');
const { encrypt } = require('../../utils/encryption');
const apiResponse = require('../../middlewares/responseHandler');
const adminController = require('../../controllers/admin.controller');

let app;
let adminUser;
let regularUser;

// Mock auth middleware for testing
const mockAdminAuth = (req, res, next) => {
  req.user = adminUser;
  req.userId = adminUser._id.toString();
  next();
};

const mockRegularAuth = (req, res, next) => {
  req.user = regularUser;
  req.userId = regularUser._id.toString();
  next();
};

beforeAll(async () => {
  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  adminUser = await User.create({
    username: 'adminuser',
    email: 'admin@test.com',
    password_hash: hashedPassword,
    role: 'ADMIN',
  });

  regularUser = await User.create({
    username: 'regularuser',
    email: 'regular@test.com',
    password_hash: hashedPassword,
    role: 'USER',
  });
});

describe('Admin Controller - Stats', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);
    app.use(mockAdminAuth);
    app.get('/admin/stats', adminController.getStats);
  });

  it('should return stats for admin', async () => {
    const res = await request(app).get('/admin/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalMatches');
    expect(res.body.data).toHaveProperty('activeMatches');
  });
});

describe('Admin Controller - User Management', () => {
  let localAdmin;
  let localRegular;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);

    // Recreate users since afterEach clears collections
    const hashedPassword = await bcrypt.hash('password123', 10);
    localAdmin = await User.create({
      username: 'adminuser',
      email: 'admin@test.com',
      password_hash: hashedPassword,
      role: 'ADMIN',
    });
    localRegular = await User.create({
      username: 'regularuser',
      email: 'regular@test.com',
      password_hash: hashedPassword,
      role: 'USER',
    });

    const mockAuth = (req, res, next) => {
      req.user = localAdmin;
      req.userId = localAdmin._id.toString();
      next();
    };

    app.use(mockAuth);
    app.get('/admin/users', adminController.getUsers);
    app.get('/admin/users/:id', adminController.getUserById);
    app.put('/admin/users/:id', adminController.updateUser);
    app.delete('/admin/users/:id', adminController.deleteUser);
    app.post('/admin/users/:id/block', adminController.blockUnblockUser);
  });

  it('should get all users', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get user by id', async () => {
    const res = await request(app).get(`/admin/users/${localRegular._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.username).toBe('regularuser');
  });

  it('should update user', async () => {
    const res = await request(app)
      .put(`/admin/users/${localRegular._id}`)
      .send({ email: 'updated@test.com', is_verified: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe('updated@test.com');
    expect(res.body.data.is_verified).toBe(true);
  });

  it('should block user', async () => {
    const res = await request(app)
      .post(`/admin/users/${localRegular._id}/block`)
      .send({ action: 'BLOCK', reason: 'Testing' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.is_blocked).toBe(true);
  });

  it('should unblock user', async () => {
    // First block, then unblock
    await request(app)
      .post(`/admin/users/${localRegular._id}/block`)
      .send({ action: 'BLOCK', reason: 'Testing' });

    const res = await request(app)
      .post(`/admin/users/${localRegular._id}/block`)
      .send({ action: 'UNBLOCK' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.is_blocked).toBe(false);
  });

  it('should not block another admin', async () => {
    const res = await request(app)
      .post(`/admin/users/${localAdmin._id}/block`)
      .send({ action: 'BLOCK', reason: 'Testing' });
    expect(res.statusCode).toBe(403);
  });
});

describe('Admin Controller - Match Management', () => {
  let testMatch;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);
    app.use(mockAdminAuth);
    app.get('/admin/matches', adminController.getMatches);
    app.get('/admin/matches/:id', adminController.getMatchById);
    app.put('/admin/matches/:id', adminController.updateMatch);
    app.delete('/admin/matches/:id', adminController.deleteMatch);
    app.put('/admin/matches/:id/status', adminController.updateMatchStatus);
    app.post('/admin/matches/:id/publish', adminController.togglePublish);

    testMatch = await Match.create({
      created_by: adminUser._id,
      title: 'Admin Test Match',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      isPublished: false,
      status: 'DRAFT',
      location: { type: 'Point', coordinates: [0, 0] },
    });
  });

  it('should get admin matches', async () => {
    const res = await request(app).get('/admin/matches');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get match by id', async () => {
    const res = await request(app).get(`/admin/matches/${testMatch._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Admin Test Match');
  });

  it('should update match', async () => {
    const res = await request(app)
      .put(`/admin/matches/${testMatch._id}`)
      .send({ title: 'Updated Match' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Match');
  });

  it('should toggle publish', async () => {
    const res = await request(app).post(`/admin/matches/${testMatch._id}/publish`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.isPublished).toBe(true);
  });

  it('should update match status', async () => {
    await Match.findByIdAndUpdate(testMatch._id, { isPublished: true, status: 'DRAFT' });
    const res = await request(app)
      .put(`/admin/matches/${testMatch._id}/status`)
      .send({ status: 'OPEN' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('should delete match', async () => {
    const res = await request(app).delete(`/admin/matches/${testMatch._id}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('Admin Controller - Banner Management', () => {
  let testBanner;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);
    app.use(mockAdminAuth);
    app.get('/admin/banners', adminController.getBanners);
    app.post('/admin/banners', adminController.createBanner);
    app.put('/admin/banners/:id', adminController.updateBanner);
    app.delete('/admin/banners/:id', adminController.deleteBanner);
  });

  it('should create banner', async () => {
    const res = await request(app)
      .post('/admin/banners')
      .send({
        title: 'Test Banner',
        description: 'Test Description',
        image_url: 'https://example.com/banner.jpg',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Test Banner');
    testBanner = res.body.data;
  });

  it('should get banners', async () => {
    await Banner.create({
      title: 'Existing Banner',
      description: 'Existing',
      image_url: 'https://example.com/existing.jpg',
    });
    const res = await request(app).get('/admin/banners');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should update banner', async () => {
    const banner = await Banner.create({
      title: 'Update Me',
      description: 'To be updated',
      image_url: 'https://example.com/update.jpg',
    });
    const res = await request(app)
      .put(`/admin/banners/${banner._id}`)
      .send({ title: 'Updated Banner' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Banner');
  });

  it('should delete banner', async () => {
    const banner = await Banner.create({
      title: 'Delete Me',
      description: 'To be deleted',
      image_url: 'https://example.com/delete.jpg',
    });
    const res = await request(app).delete(`/admin/banners/${banner._id}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('Admin Controller - Wallet Management', () => {
  let testWallet;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);
    app.use(mockAdminAuth);
    app.get('/admin/wallets', adminController.getWallets);
    app.get('/admin/wallets/:id', adminController.getWalletById);
    app.post('/admin/wallets/:id/adjust', adminController.adjustWalletBalance);

    testWallet = await Wallet.create({
      user_id: regularUser._id,
      wallet_account_no: encrypt('1234567890'),
      wallet_pin_hash: await bcrypt.hash('1234', 10),
      available_balance: encrypt('100'),
      locked_balance: encrypt('0'),
      withdrawable_balance: encrypt('100'),
    });
  });

  it('should get wallets', async () => {
    const res = await request(app).get('/admin/wallets');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should get wallet by id', async () => {
    const res = await request(app).get(`/admin/wallets/${testWallet._id}`);
    expect(res.statusCode).toBe(200);
  });

  it('should adjust wallet balance', async () => {
    const res = await request(app)
      .post(`/admin/wallets/${testWallet._id}/adjust`)
      .send({ amount: 50, type: 'CREDIT', reason: 'Test credit' });
    expect(res.statusCode).toBe(200);
  });
});

describe('Admin Controller - Mediator Applications', () => {
  let mediatorCandidate;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(apiResponse);
    app.use(mockAdminAuth);
    app.get('/admin/mediator-applications', adminController.getMediatorApplications);
    app.post('/admin/mediator-applications/:id/approve', adminController.approveMediatorApplication);
    app.post('/admin/mediator-applications/:id/reject', adminController.rejectMediatorApplication);

    // Create a fresh user for mediator tests
    const hashedPassword = await bcrypt.hash('password123', 10);
    mediatorCandidate = await User.create({
      username: 'mediatorcandidate',
      email: 'mediator@test.com',
      password_hash: hashedPassword,
      role: 'USER',
      mediator_application_status: 'pending',
    });
    await MediatorApplication.create({
      user_id: mediatorCandidate._id,
      status: 'PENDING',
    });
  });

  it('should get mediator applications', async () => {
    const res = await request(app).get('/admin/mediator-applications');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should approve mediator application', async () => {
    const res = await request(app)
      .post(`/admin/mediator-applications/${mediatorCandidate._id}/approve`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toBe('MEDIATOR');
  });
});
