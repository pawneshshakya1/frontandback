const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { admin } = require('../config/firebase');
const User = require('../models/user.model');
const userSessionService = require('./user-session.service');
const spendAnalyticsService = require('./user-spend-analytics.service');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const verifyFirebaseToken = async (token) => {
  const decodedToken = await admin.auth().verifyIdToken(token);
  const firebaseUserInfo = await admin.auth().getUser(decodedToken.uid).catch(() => null);
  const providerInfo = (firebaseUserInfo?.providerData && firebaseUserInfo.providerData[0]) || {};
  return {
    sub: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
    picture: decodedToken.picture || null,
    email_verified: !!decodedToken.email_verified,
    provider: providerInfo.providerId || 'firebase',
    raw: decodedToken,
  };
};

const verifyGoogleToken = async (token) => {
  const info = await verifyFirebaseToken(token);
  return {
    sub: info.sub,
    email: info.email,
    name: info.name,
    picture: info.picture,
    email_verified: info.email_verified,
  };
};

const registerUser = async (userData) => {
  const { username, email, password } = userData;

  const userExists = await User.findOne({ email });
  if (userExists) throw new Error('User already exists');

  const user = await User.create({
    username,
    email,
    password_hash: password,
    is_verified: true,
    verification_source: 'MANUAL',
  });

  await userSessionService.createSession(user._id);
  await userSessionService.createProfile(user._id);
  await userSessionService.createStats(user._id);
  await spendAnalyticsService.initializeAnalytics(user._id);

  const fullUser = await User.findById(user._id);
  return {
    _id: fullUser._id,
    username: fullUser.username,
    email: fullUser.email,
    role: fullUser.role,
    is_verified: fullUser.is_verified,
    token: generateToken(fullUser._id),
  };
};

const loginUser = async (email, password, deviceInfo = null, ip = null) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('User not registered with this email');
  }

  if (!(await user.matchPassword(password))) {
    throw new Error('Incorrect password');
  }

  if (user.is_blocked) {
    throw new Error(`Your account has been blocked. Reason: ${user.block_reason || 'Violation of terms'}`);
  }

  if (!user.is_verified) {
    throw new Error('Please verify your email first');
  }

  await userSessionService.createSession(user._id, deviceInfo, ip);

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_verified: user.is_verified,
    token: generateToken(user._id),
  };
};

const loginWithGoogle = async (token) => {
  const payload = await verifyGoogleToken(token);
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ email });

  if (user) {
    if (user.is_blocked) {
      throw new Error(`Your account has been blocked. Reason: ${user.block_reason || 'Violation of terms'}`);
    }

    if (!user.google_id) {
      user.google_id = googleId;
      await user.save();
    }
  } else {
    user = await User.create({
      username: name.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).slice(-4),
      email,
      password_hash: await bcrypt.hash(Math.random().toString(36), 10),
      google_id: googleId,
      avatar: picture,
      is_verified: true,
      verification_source: 'MANUAL',
    });

    await userSessionService.createSession(user._id);
    await userSessionService.createProfile(user._id);
    await userSessionService.createStats(user._id);
    await spendAnalyticsService.initializeAnalytics(user._id);
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_verified: user.is_verified,
    avatar: user.avatar,
    token: generateToken(user._id),
  };
};

const loginWithProvider = async (provider, token) => {
  const allowedProviders = ['facebook.com', 'apple.com'];
  if (!allowedProviders.includes(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const payload = await verifyFirebaseToken(token);
  if (!payload.email) {
    throw new Error(`${provider} account does not have a verified email`);
  }
  if (!payload.email_verified) {
    throw new Error(`${provider} email is not verified`);
  }

  const providerIdField = provider === 'facebook.com' ? 'facebook_id' : 'apple_id';
  const providerId = payload.sub;
  const { email, name, picture } = payload;

  let user = await User.findOne({ email });

  if (user) {
    if (user.is_blocked) {
      throw new Error(`Your account has been blocked. Reason: ${user.block_reason || 'Violation of terms'}`);
    }
    if (!user[providerIdField]) {
      user[providerIdField] = providerId;
      await user.save();
    }
  } else {
    const cleanName = (name || email.split('@')[0]).replace(/\s+/g, '').toLowerCase();
    user = await User.create({
      username: cleanName + Math.random().toString(36).slice(-4),
      email,
      password_hash: await bcrypt.hash(Math.random().toString(36), 10),
      [providerIdField]: providerId,
      avatar: picture,
      is_verified: true,
      verification_source: 'MANUAL',
    });

    await userSessionService.createSession(user._id);
    await userSessionService.createProfile(user._id);
    await userSessionService.createStats(user._id);
    await spendAnalyticsService.initializeAnalytics(user._id);
  }

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    is_verified: user.is_verified,
    avatar: user.avatar,
    token: generateToken(user._id),
  };
};

const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new Error('Incorrect current password');

  user.password_hash = newPassword; // Pre-save hook will hash it automatically
  await user.save();
  return { success: true };
};

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogle,
  loginWithProvider,
  generateToken,
  changeUserPassword,
};
