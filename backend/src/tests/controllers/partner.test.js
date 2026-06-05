const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const express = require('express');
const User = require('../../models/user.model');
const Match = require('../../models/match.model');
const PartnerProfile = require('../../models/partner-profile.model');
const PartnerSubscription = require('../../models/partner-subscription.model');
const apiResponse = require('../../middlewares/responseHandler');
const partnerController = require('../../controllers/partner.controller');
const subscriptionController = require('../../controllers/partner-subscription.controller');

let partnerUser;
let adminUser;
let regularUser;

async function createTestUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  partnerUser = await User.create({
    username: 'partneruser',
    email: 'partner@example.com',
    password_hash: hashedPassword,
    role: 'PARTNER',
  });

  adminUser = await User.create({
    username: 'adminuser',
    email: 'admin@example.com',
    password_hash: hashedPassword,
    role: 'ADMIN',
  });

  regularUser = await User.create({
    username: 'regularuser',
    email: 'regular@example.com',
    password_hash: hashedPassword,
    role: 'USER',
  });
}

function createMockApp(role, user, routes) {
  const app = express();
  app.use(express.json());
  app.use(apiResponse);
  app.use((req, res, next) => {
    req.user = user;
    req.userId = user._id.toString();
    if (req.user.role !== role && !(role === 'PARTNER' && req.user.role === 'ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  });
  routes(app);
  return app;
}

// ============================
// PARTNER ROUTES TESTS
// ============================

describe('Partner - Profile', () => {
  beforeEach(async () => {
    await createTestUsers();
  });

  it('should get partner profile', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/profile', partnerController.getProfile);
    });

    const res = await request(app).get('/partner/profile');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.business_name).toBe('partneruser');
  });

  it('should update partner profile', async () => {
    // First create profile
    await PartnerProfile.create({
      user_id: partnerUser._id,
      business_name: 'Old Business',
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.put('/partner/profile', partnerController.updateProfile);
    });

    const res = await request(app)
      .put('/partner/profile')
      .send({
        business_name: 'New Business',
        phone: '1234567890',
        city: 'Mumbai',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.business_name).toBe('New Business');
    expect(res.body.data.phone).toBe('1234567890');
    expect(res.body.data.city).toBe('Mumbai');
  });

  it('should reject non-partner users', async () => {
    const app = createMockApp('PARTNER', regularUser, (app) => {
      app.get('/partner/profile', partnerController.getProfile);
    });

    const res = await request(app).get('/partner/profile');
    expect(res.statusCode).toBe(403);
  });
});

describe('Partner - Dashboard', () => {
  beforeEach(async () => {
    await createTestUsers();
  });

  it('should return dashboard with stats', async () => {
    await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Test Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'OPEN',
      isPublished: true,
      participants: [
        { user_id: regularUser._id },
        { user_id: adminUser._id },
      ],
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/dashboard', partnerController.getDashboard);
    });

    const res = await request(app).get('/partner/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.stats.total_events).toBe(1);
    expect(res.body.data.stats.open_events).toBe(1);
    expect(res.body.data.stats.total_participants).toBe(2);
    expect(res.body.data.stats.total_revenue).toBe(20); // 2 participants * 10 entry fee
  });

  it('should return empty dashboard for new partner', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/dashboard', partnerController.getDashboard);
    });

    const res = await request(app).get('/partner/dashboard');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.stats.total_events).toBe(0);
  });
});

describe('Partner - Event Management', () => {
  beforeEach(async () => {
    await createTestUsers();
  });

  it('should create a new event', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events', partnerController.createEvent);
    });

    const res = await request(app)
      .post('/partner/events')
      .send({
        title: 'New Tournament',
        game_type: 'BR',
        mode: 'SOLO',
        max_players: 52,
        map: 'BERMUDA',
        entry_fee: 10,
        prize_pool: 500,
        match_date: '2026-06-01',
        match_time: '18:00',
        room_id: 'room123',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe('New Tournament');
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.isPublished).toBe(false);
  });

  it('should create event with OPEN status (published)', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events', partnerController.createEvent);
    });

    const res = await request(app)
      .post('/partner/events')
      .send({
        title: 'Published Event',
        game_type: 'BR',
        mode: 'SOLO',
        max_players: 52,
        map: 'BERMUDA',
        entry_fee: 10,
        prize_pool: 500,
        match_date: '2026-06-01',
        match_time: '18:00',
        room_id: 'room456',
        status: 'OPEN',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.isPublished).toBe(true);
  });

  it('should reject negative entry fee', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events', partnerController.createEvent);
    });

    const res = await request(app)
      .post('/partner/events')
      .send({
        title: 'Bad Event',
        game_type: 'BR',
        mode: 'SOLO',
        max_players: 52,
        map: 'BERMUDA',
        entry_fee: -5,
        prize_pool: 500,
        match_date: '2026-06-01',
        match_time: '18:00',
        room_id: 'room789',
      });
    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid max_players', async () => {
    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events', partnerController.createEvent);
    });

    const res = await request(app)
      .post('/partner/events')
      .send({
        title: 'Bad Players',
        game_type: 'BR',
        mode: 'SOLO',
        max_players: 500,
        map: 'BERMUDA',
        entry_fee: 10,
        prize_pool: 500,
        match_date: '2026-06-01',
        match_time: '18:00',
        room_id: 'room101',
      });
    expect(res.statusCode).toBe(400);
  });

  it('should get partner events', async () => {
    await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Event 1',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/events', partnerController.getEvents);
    });

    const res = await request(app).get('/partner/events');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('should get single event', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Single Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/events/:id', partnerController.getEvent);
    });

    const res = await request(app).get(`/partner/events/${event._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Single Event');
  });

  it('should reject access to other partner event', async () => {
    const otherPartner = await User.create({
      username: 'otherpartner',
      email: 'otherpartner@example.com',
      password_hash: await bcrypt.hash('password123', 10),
      role: 'PARTNER',
    });

    const event = await Match.create({
      created_by: otherPartner._id,
      partner_id: otherPartner._id,
      title: 'Other Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/events/:id', partnerController.getEvent);
    });

    const res = await request(app).get(`/partner/events/${event._id}`);
    expect(res.statusCode).toBe(404); // Returns 404 for "Event not found or not authorized"
  });

  it('should update draft event', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Draft Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.put('/partner/events/:id', partnerController.updateEvent);
    });

    const res = await request(app)
      .put(`/partner/events/${event._id}`)
      .send({ title: 'Updated Title', entry_fee: 20 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
    expect(res.body.data.entry_fee).toBe(20);
  });

  it('should reject updating non-draft event', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Open Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'OPEN',
      isPublished: true,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.put('/partner/events/:id', partnerController.updateEvent);
    });

    const res = await request(app)
      .put(`/partner/events/${event._id}`)
      .send({ title: 'Should Fail' });
    expect(res.statusCode).toBe(400);
  });

  it('should delete draft event', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Delete Me',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.delete('/partner/events/:id', partnerController.deleteEvent);
    });

    const res = await request(app).delete(`/partner/events/${event._id}`);
    expect(res.statusCode).toBe(200);

    const deleted = await Match.findById(event._id);
    expect(deleted).toBeNull();
  });

  it('should reject deleting non-draft event', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Open Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'OPEN',
      isPublished: true,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.delete('/partner/events/:id', partnerController.deleteEvent);
    });

    const res = await request(app).delete(`/partner/events/${event._id}`);
    expect(res.statusCode).toBe(400);
  });

  it('should publish draft event with room_id', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Publish Me',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      room_id: 'room123',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events/:id/publish', partnerController.publishEvent);
    });

    const res = await request(app).post(`/partner/events/${event._id}/publish`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.isPublished).toBe(true);
  });

  it('should reject publishing without room_id', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'No Room',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'DRAFT',
      isPublished: false,
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.post('/partner/events/:id/publish', partnerController.publishEvent);
    });

    const res = await request(app).post(`/partner/events/${event._id}/publish`);
    expect(res.statusCode).toBe(400);
  });

  it('should get event participants', async () => {
    const event = await Match.create({
      created_by: partnerUser._id,
      partner_id: partnerUser._id,
      title: 'Participants Event',
      game_type: 'BR',
      mode: 'SOLO',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: 10,
      prize_pool: 500,
      match_date: '2026-06-01',
      match_time: '18:00',
      status: 'OPEN',
      isPublished: true,
      participants: [
        { user_id: regularUser._id },
        { user_id: adminUser._id },
      ],
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/events/:id/participants', partnerController.getParticipants);
    });

    const res = await request(app).get(`/partner/events/${event._id}/participants`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
  });
});

describe('Partner - Subscribers', () => {
  beforeEach(async () => {
    await createTestUsers();
  });

  it('should get subscribers', async () => {
    await PartnerProfile.create({
      user_id: partnerUser._id,
      business_name: 'Partner Business',
      location: { type: 'Point', coordinates: [0, 0] },
    });

    const partnerProfile = await PartnerProfile.findOne({ user_id: partnerUser._id });

    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'ACTIVE',
    });

    const app = createMockApp('PARTNER', partnerUser, (app) => {
      app.get('/partner/subscribers', subscriptionController.getSubscribers);
    });

    const res = await request(app).get('/partner/subscribers');
    expect(res.statusCode).toBe(200);
  });
});

// ============================
// PARTNER SUBSCRIPTION ROUTES TESTS (USER role)
// ============================

describe('Partner Subscription - Subscribe/Unsubscribe', () => {
  let partnerProfile;

  beforeEach(async () => {
    await createTestUsers();

    partnerProfile = await PartnerProfile.create({
      user_id: partnerUser._id,
      business_name: 'Test Partner',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });
  });

  it('should subscribe to a partner', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.post('/partners/subscribe', subscriptionController.subscribe);
    });

    const res = await request(app)
      .post('/partners/subscribe')
      .send({ partner_id: partnerProfile._id.toString() });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject subscribing without partner_id', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.post('/partners/subscribe', subscriptionController.subscribe);
    });

    const res = await request(app)
      .post('/partners/subscribe')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should reject subscribing to non-existent partner', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.post('/partners/subscribe', subscriptionController.subscribe);
    });

    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/partners/subscribe')
      .send({ partner_id: fakeId.toString() });
    expect(res.statusCode).toBe(400);
  });

  it('should unsubscribe from a partner', async () => {
    // First subscribe
    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'ACTIVE',
    });

    const app = createMockApp('USER', regularUser, (app) => {
      app.delete('/partners/unsubscribe/:partner_id', subscriptionController.unsubscribe);
    });

    const res = await request(app).delete(`/partners/unsubscribe/${partnerProfile._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('should reject unsubscribing without active subscription', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.delete('/partners/unsubscribe/:partner_id', subscriptionController.unsubscribe);
    });

    const res = await request(app).delete(`/partners/unsubscribe/${partnerProfile._id}`);
    expect(res.statusCode).toBe(400);
  });

  it('should pause subscription', async () => {
    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'ACTIVE',
    });

    const app = createMockApp('USER', regularUser, (app) => {
      app.post('/partners/pause/:partner_id', subscriptionController.pause);
    });

    const res = await request(app).post(`/partners/pause/${partnerProfile._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('PAUSED');
  });

  it('should resume paused subscription', async () => {
    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'PAUSED',
    });

    const app = createMockApp('USER', regularUser, (app) => {
      app.post('/partners/resume/:partner_id', subscriptionController.resume);
    });

    const res = await request(app).post(`/partners/resume/${partnerProfile._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should get my subscriptions', async () => {
    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'ACTIVE',
    });

    const app = createMockApp('USER', regularUser, (app) => {
      app.get('/partners/my-subscriptions', subscriptionController.getMySubscriptions);
    });

    const res = await request(app).get('/partners/my-subscriptions');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('should update notification preferences', async () => {
    await PartnerSubscription.create({
      subscriber_id: regularUser._id,
      partner_id: partnerProfile._id,
      status: 'ACTIVE',
      notify_new_events: true,
      notify_promotions: false,
    });

    const app = createMockApp('USER', regularUser, (app) => {
      app.put('/partners/preferences/:partner_id', subscriptionController.updatePreferences);
    });

    const res = await request(app)
      .put(`/partners/preferences/${partnerProfile._id}`)
      .send({ notify_promotions: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.notify_promotions).toBe(true);
  });
});

describe('Partner Subscription - Nearby Search', () => {
  beforeEach(async () => {
    await createTestUsers();

    await PartnerProfile.create({
      user_id: partnerUser._id,
      business_name: 'Delhi Partner',
      city: 'Delhi',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
    });

    const otherPartner = await User.create({
      username: 'mumbaipartner',
      email: 'mumbai@example.com',
      password_hash: await bcrypt.hash('password123', 10),
      role: 'PARTNER',
    });

    await PartnerProfile.create({
      user_id: otherPartner._id,
      business_name: 'Mumbai Partner',
      city: 'Mumbai',
      location: { type: 'Point', coordinates: [72.8777, 19.0760] },
    });
  });

  it('should search nearby partners', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.get('/partners/nearby', subscriptionController.getNearbyPartners);
    });

    const res = await request(app)
      .get('/partners/nearby')
      .query({ lat: '28.6139', lng: '77.2090', max_distance: '100' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject without coordinates', async () => {
    const app = createMockApp('USER', regularUser, (app) => {
      app.get('/partners/nearby', subscriptionController.getNearbyPartners);
    });

    const res = await request(app).get('/partners/nearby');
    expect(res.statusCode).toBe(400);
  });
});
