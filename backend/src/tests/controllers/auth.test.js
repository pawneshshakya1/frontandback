const request = require('supertest');
const app = require('../../app'); // Relative path from test file to src/app.js
const User = require('../../models/user.model.js');

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should return 400 for duplicate email', async () => {
      await User.create({
        username: 'existing',
        email: 'existing@example.com',
        password_hash: 'password123' // Plaintext password, will be hashed by pre-save hook
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create user with plaintext password, will be hashed by pre-save hook
      await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password_hash: 'password123',
        is_verified: true
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('token');
    });
  });
});