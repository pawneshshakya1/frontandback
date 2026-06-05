const User = require('../../models/user.model.js');

describe('User Model', () => {
  it('should create a user successfully', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'password123' // Will be hashed by pre-save hook
    });

    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user._id).toBeDefined();
  });

  it('should hash password before saving', async () => {
    const user = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password_hash: 'password123' // Will be hashed by pre-save hook
    });

    expect(user.password_hash).not.toBe('password123');
    // Should be a bcrypt hash (starts with $2a$ or $2b$)
    expect(user.password_hash).toMatch(/^\$2[aby]\$[0-9]{2}\$/);
  });

  it('should fail validation without email', async () => {
    await expect(User.create({
      username: 'testuser3',
      password_hash: 'password123'
    })).rejects.toThrow();
  });
});