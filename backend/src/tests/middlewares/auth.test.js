const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { protect: authMiddleware } = require('../../middlewares/auth.middleware.js');
const User = require('../../models/user.model.js');

describe('Auth Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ message: 'success' });
    });
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/protected');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toBe(401);
  });

  it('should allow access with valid token', async () => {
    const user = await User.create({
      username: 'testmiddlewareuser',
      email: 'middleware@example.com',
      password_hash: 'password123',
      is_verified: true,
    });

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET || 'testsecret'
    );

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });
});