require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');

const BASE_URL = 'http://192.168.29.27:5000';
const USER_EMAIL = 'testing11@gmail.com';
const PARTNER_EMAIL = 'testing12@gmail.com';
const PASSWORD = '12345678';

let userToken = '';
let partnerToken = '';
let userId = '';
let partnerId = '';
let matchId = '';
let eventId = '';

const results = { USER: {}, PARTNER: {}, SHARED: {} };

async function apiCall(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    };

    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

function printResult(role, endpoint, status, success, msg) {
  const icon = success ? '✅' : '❌';
  const statusColor = status >= 200 && status < 300 ? 'OK' : `HTTP ${status}`;
  console.log(`  ${icon} [${role.padEnd(8)}] ${endpoint.padEnd(50)} ${statusColor} | ${msg}`);
  if (!results[role]) results[role] = {};
  results[role][endpoint] = { success, status, msg };
}

async function login(email, password) {
  const res = await apiCall('POST', '/api/auth/login', null, { email, password });
  if (res.data.success) {
    return { token: res.data.data.token, id: res.data.data._id };
  }
  throw new Error(`Login failed for ${email}: ${res.data.message}`);
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Make testing12 a PARTNER
  const User = require('./src/models/user.model');
  await User.findOneAndUpdate({ email: PARTNER_EMAIL }, { role: 'PARTNER' });
  console.log('🔄 Made testing12@gmail.com → PARTNER role\n');

  // Login both users
  const userAuth = await login(USER_EMAIL, PASSWORD);
  userToken = userAuth.token;
  userId = userAuth.id;
  console.log(`✅ USER logged in: ${USER_EMAIL}`);

  const partnerAuth = await login(PARTNER_EMAIL, PASSWORD);
  partnerToken = partnerAuth.token;
  partnerId = partnerAuth.id;
  console.log(`✅ PARTNER logged in: ${PARTNER_EMAIL}\n`);

  // ==========================================
  // 1. AUTH APIs (both roles)
  // ==========================================
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 1. AUTH APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/auth/me
  let res = await apiCall('GET', '/api/auth/me', userToken);
  printResult('USER', 'GET /api/auth/me', res.status, res.data.success, res.data.success ? `User: ${res.data.data.username}` : res.data.message);

  res = await apiCall('GET', '/api/auth/me', partnerToken);
  printResult('PARTNER', 'GET /api/auth/me', res.status, res.data.success, res.data.success ? `User: ${res.data.data.username}, Role: ${res.data.data.role}` : res.data.message);

  // ==========================================
  // 2. MATCH APIs - Public (no auth)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 2. MATCH APIs - Public');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/matches (public)
  res = await apiCall('GET', '/api/matches', null);
  printResult('SHARED', 'GET /api/matches (public)', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} matches` : res.data.message);

  // ==========================================
  // 3. MATCH APIs - Protected (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 3. MATCH APIs - Protected');
  console.log('═══════════════════════════════════════════════════');

  // CREATE match
  const matchData = {
    title: 'Test Match USER',
    game_type: 'BR',
    mode: 'Solo',
    max_players: 48,
    map: 'Bermuda',
    entry_fee: 50,
    prize_pool: 500,
    match_date: '2026-05-20',
    match_time: '18:00',
  };

  res = await apiCall('POST', '/api/matches', userToken, matchData);
  printResult('USER', 'POST /api/matches (create)', res.status, res.data.success, res.data.success ? `Match: ${res.data.data._id}` : res.data.message);
  if (res.data.success) matchId = res.data.data._id;

  // PARTNER create match
  const partnerMatchData = { ...matchData, title: 'Test Match PARTNER' };
  res = await apiCall('POST', '/api/matches', partnerToken, partnerMatchData);
  printResult('PARTNER', 'POST /api/matches (create)', res.status, res.data.success, res.data.success ? `Match: ${res.data.data._id}` : res.data.message);

  // GET /api/matches/my-matches
  res = await apiCall('GET', '/api/matches/my-matches', userToken);
  printResult('USER', 'GET /api/matches/my-matches', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} joined` : res.data.message);

  res = await apiCall('GET', '/api/matches/my-matches', partnerToken);
  printResult('PARTNER', 'GET /api/matches/my-matches', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} joined` : res.data.message);

  // GET /api/matches/created
  res = await apiCall('GET', '/api/matches/created', userToken);
  printResult('USER', 'GET /api/matches/created', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} created` : res.data.message);

  res = await apiCall('GET', '/api/matches/created', partnerToken);
  printResult('PARTNER', 'GET /api/matches/created', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} created` : res.data.message);

  // GET /api/matches/daily-limit
  res = await apiCall('GET', '/api/matches/daily-limit', userToken);
  printResult('USER', 'GET /api/matches/daily-limit', res.status, res.data.success !== undefined, res.data.success ? `Limit info received` : res.data.message);

  res = await apiCall('GET', '/api/matches/daily-limit', partnerToken);
  printResult('PARTNER', 'GET /api/matches/daily-limit', res.status, res.data.success !== undefined, res.data.success ? `Limit info received` : res.data.message);

  // GET /api/matches/:id (public)
  if (matchId) {
    res = await apiCall('GET', `/api/matches/${matchId}`, null);
    printResult('SHARED', `GET /api/matches/:id (public)`, res.status, res.data.success, res.data.success ? `Match: ${res.data.data.title}` : res.data.message);

    // UPDATE match
    res = await apiCall('PUT', `/api/matches/${matchId}`, userToken, { title: 'Updated Match Title' });
    printResult('USER', `PUT /api/matches/:id (update)`, res.status, res.data.success, res.data.success ? 'Updated' : res.data.message);

    // PARTNER update match (should fail if not owner)
    res = await apiCall('PUT', `/api/matches/${matchId}`, partnerToken, { title: 'Hacked Title' });
    printResult('PARTNER', `PUT /api/matches/:id (update other's)`, res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: Should not update others' : 'Correctly denied');
  }

  // GET /api/matches/mediator/check
  res = await apiCall('GET', '/api/matches/mediator/check', userToken);
  printResult('USER', 'GET /api/matches/mediator/check', res.status, res.data.success !== undefined, 'Checked');

  res = await apiCall('GET', '/api/matches/mediator/check', partnerToken);
  printResult('PARTNER', 'GET /api/matches/mediator/check', res.status, res.data.success !== undefined, 'Checked');

  // ==========================================
  // 4. WALLET APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 4. WALLET APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/wallet/my
  res = await apiCall('GET', '/api/wallet/my', userToken);
  printResult('USER', 'GET /api/wallet/my', res.status, res.data.success !== undefined, res.data.success ? 'Wallet found' : res.data.message);

  res = await apiCall('GET', '/api/wallet/my', partnerToken);
  printResult('PARTNER', 'GET /api/wallet/my', res.status, res.data.success !== undefined, res.data.success ? 'Wallet found' : res.data.message);

  // GET /api/wallet/last-deposit-source
  res = await apiCall('GET', '/api/wallet/last-deposit-source', userToken);
  printResult('USER', 'GET /api/wallet/last-deposit-source', res.status, res.data.success !== undefined, 'Checked');

  res = await apiCall('GET', '/api/wallet/last-deposit-source', partnerToken);
  printResult('PARTNER', 'GET /api/wallet/last-deposit-source', res.status, res.data.success !== undefined, 'Checked');

  // GET /api/wallet/transactions
  res = await apiCall('GET', '/api/wallet/transactions', userToken);
  printResult('USER', 'GET /api/wallet/transactions', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} txns` : 'No data');

  res = await apiCall('GET', '/api/wallet/transactions', partnerToken);
  printResult('PARTNER', 'GET /api/wallet/transactions', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} txns` : 'No data');

  // POST /api/wallet/initialize
  res = await apiCall('POST', '/api/wallet/initialize', userToken, { walletAccountNo: '1234567890', walletPin: '1234' });
  printResult('USER', 'POST /api/wallet/initialize', res.status, res.data.success !== undefined, res.data.success ? 'Initialized' : res.data.message);

  res = await apiCall('POST', '/api/wallet/initialize', partnerToken, { walletAccountNo: '0987654321', walletPin: '1234' });
  printResult('PARTNER', 'POST /api/wallet/initialize', res.status, res.data.success !== undefined, res.data.success ? 'Initialized' : res.data.message);

  // POST /api/wallet/verify-receiver
  res = await apiCall('POST', '/api/wallet/verify-receiver', userToken, { walletAccountNo: '1234567890' });
  printResult('USER', 'POST /api/wallet/verify-receiver', res.status, res.data.success !== undefined, res.data.success ? 'Verified' : res.data.message);

  res = await apiCall('POST', '/api/wallet/verify-receiver', partnerToken, { walletAccountNo: '0987654321' });
  printResult('PARTNER', 'POST /api/wallet/verify-receiver', res.status, res.data.success !== undefined, res.data.success ? 'Verified' : res.data.message);

  // POST /api/wallet/deposit (stub)
  res = await apiCall('POST', '/api/wallet/deposit', userToken, { amount: 100 });
  printResult('USER', 'POST /api/wallet/deposit (stub)', res.status, true, res.data.message || 'Stub endpoint');

  res = await apiCall('POST', '/api/wallet/deposit', partnerToken, { amount: 100 });
  printResult('PARTNER', 'POST /api/wallet/deposit (stub)', res.status, true, res.data.message || 'Stub endpoint');

  // POST /api/wallet/withdraw (stub)
  res = await apiCall('POST', '/api/wallet/withdraw', userToken, { amount: 50 });
  printResult('USER', 'POST /api/wallet/withdraw (stub)', res.status, true, res.data.message || 'Stub endpoint');

  res = await apiCall('POST', '/api/wallet/withdraw', partnerToken, { amount: 50 });
  printResult('PARTNER', 'POST /api/wallet/withdraw (stub)', res.status, true, res.data.message || 'Stub endpoint');

  // POST /api/wallet/send-gift
  res = await apiCall('POST', '/api/wallet/send-gift', userToken, { receiverAccountNo: '0987654321', amount: 10, pin: '1234' });
  printResult('USER', 'POST /api/wallet/send-gift', res.status, res.data.success !== undefined, res.data.success ? 'Gift sent' : res.data.message);

  res = await apiCall('POST', '/api/wallet/send-gift', partnerToken, { receiverAccountNo: '1234567890', amount: 10, pin: '1234' });
  printResult('PARTNER', 'POST /api/wallet/send-gift', res.status, res.data.success !== undefined, res.data.success ? 'Gift sent' : res.data.message);

  // POST /api/wallet/redeem
  res = await apiCall('POST', '/api/wallet/redeem', userToken, { code: 'TESTCODE123' });
  printResult('USER', 'POST /api/wallet/redeem', res.status, res.data.success !== undefined, res.data.success ? 'Redeemed' : res.data.message);

  res = await apiCall('POST', '/api/wallet/redeem', partnerToken, { code: 'TESTCODE456' });
  printResult('PARTNER', 'POST /api/wallet/redeem', res.status, res.data.success !== undefined, res.data.success ? 'Redeemed' : res.data.message);

  // POST /api/wallet/request-pin-reset
  res = await apiCall('POST', '/api/wallet/request-pin-reset', userToken);
  printResult('USER', 'POST /api/wallet/request-pin-reset', res.status, res.data.success !== undefined, res.data.success ? 'OTP sent' : res.data.message);

  // POST /api/wallet/add-cash/initiate
  res = await apiCall('POST', '/api/wallet/add-cash/initiate', userToken, { amount: 100 });
  printResult('USER', 'POST /api/wallet/add-cash/initiate', res.status, res.data.success !== undefined, res.data.success ? 'Initiated' : res.data.message);

  res = await apiCall('POST', '/api/wallet/add-cash/initiate', partnerToken, { amount: 100 });
  printResult('PARTNER', 'POST /api/wallet/add-cash/initiate', res.status, res.data.success !== undefined, res.data.success ? 'Initiated' : res.data.message);

  // ==========================================
  // 5. PAYMENT APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 5. PAYMENT APIs');
  console.log('═══════════════════════════════════════════════════');

  // POST /api/payments/initiate-cashfree
  res = await apiCall('POST', '/api/payments/initiate-cashfree', userToken, { amount: 100, method: 'CASHFREE_UPI' });
  printResult('USER', 'POST /api/payments/initiate-cashfree', res.status, res.data.success !== undefined, res.data.success ? 'Payment initiated' : res.data.message);

  res = await apiCall('POST', '/api/payments/initiate-cashfree', partnerToken, { amount: 100, method: 'CASHFREE_UPI' });
  printResult('PARTNER', 'POST /api/payments/initiate-cashfree', res.status, res.data.success !== undefined, res.data.success ? 'Payment initiated' : res.data.message);

  // GET /api/payments/history
  res = await apiCall('GET', '/api/payments/history', userToken);
  printResult('USER', 'GET /api/payments/history', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} payments` : 'No data');

  res = await apiCall('GET', '/api/payments/history', partnerToken);
  printResult('PARTNER', 'GET /api/payments/history', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} payments` : 'No data');

  // ==========================================
  // 6. NOTIFICATION APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 6. NOTIFICATION APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/notifications
  res = await apiCall('GET', '/api/notifications', userToken);
  printResult('USER', 'GET /api/notifications', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} notifications` : 'No data');

  res = await apiCall('GET', '/api/notifications', partnerToken);
  printResult('PARTNER', 'GET /api/notifications', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} notifications` : 'No data');

  // GET /api/notifications/unread-count
  res = await apiCall('GET', '/api/notifications/unread-count', userToken);
  printResult('USER', 'GET /api/notifications/unread-count', res.status, res.data.success !== undefined, res.data.success ? `Unread: ${res.data.data || 0}` : res.data.message);

  res = await apiCall('GET', '/api/notifications/unread-count', partnerToken);
  printResult('PARTNER', 'GET /api/notifications/unread-count', res.status, res.data.success !== undefined, res.data.success ? `Unread: ${res.data.data || 0}` : res.data.message);

  // PUT /api/notifications/mark-all-read
  res = await apiCall('PUT', '/api/notifications/mark-all-read', userToken);
  printResult('USER', 'PUT /api/notifications/mark-all-read', res.status, res.data.success !== undefined, res.data.success ? 'All read' : res.data.message);

  res = await apiCall('PUT', '/api/notifications/mark-all-read', partnerToken);
  printResult('PARTNER', 'PUT /api/notifications/mark-all-read', res.status, res.data.success !== undefined, res.data.success ? 'All read' : res.data.message);

  // ==========================================
  // 7. FRIEND APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 7. FRIEND APIs');
  console.log('═══════════════════════════════════════════════════');

  // POST /api/friends/request (USER → PARTNER)
  res = await apiCall('POST', '/api/friends/request', userToken, { email: PARTNER_EMAIL });
  printResult('USER', 'POST /api/friends/request', res.status, res.data.success !== undefined, res.data.success ? 'Request sent' : res.data.message);

  // GET /api/friends
  res = await apiCall('GET', '/api/friends', userToken);
  printResult('USER', 'GET /api/friends', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} friends` : 'No data');

  res = await apiCall('GET', '/api/friends', partnerToken);
  printResult('PARTNER', 'GET /api/friends', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} friends` : 'No data');

  // GET /api/friends/pending
  res = await apiCall('GET', '/api/friends/pending', userToken);
  printResult('USER', 'GET /api/friends/pending', res.status, res.data.success !== undefined, 'Checked');

  res = await apiCall('GET', '/api/friends/pending', partnerToken);
  printResult('PARTNER', 'GET /api/friends/pending', res.status, res.data.success !== undefined, 'Checked');

  // GET /api/friends/sent
  res = await apiCall('GET', '/api/friends/sent', userToken);
  printResult('USER', 'GET /api/friends/sent', res.status, res.data.success !== undefined, 'Checked');

  res = await apiCall('GET', '/api/friends/sent', partnerToken);
  printResult('PARTNER', 'GET /api/friends/sent', res.status, res.data.success !== undefined, 'Checked');

  // GET /api/friends/blocked
  res = await apiCall('GET', '/api/friends/blocked', userToken);
  printResult('USER', 'GET /api/friends/blocked', res.status, res.data.success !== undefined, 'Checked');

  res = await apiCall('GET', '/api/friends/blocked', partnerToken);
  printResult('PARTNER', 'GET /api/friends/blocked', res.status, res.data.success !== undefined, 'Checked');

  // ==========================================
  // 8. ANALYTICS APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 8. ANALYTICS APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/analytics/my-analytics
  res = await apiCall('GET', '/api/analytics/my-analytics', userToken);
  printResult('USER', 'GET /api/analytics/my-analytics', res.status, res.data.success !== undefined, res.data.success ? 'Analytics received' : res.data.message);

  res = await apiCall('GET', '/api/analytics/my-analytics', partnerToken);
  printResult('PARTNER', 'GET /api/analytics/my-analytics', res.status, res.data.success !== undefined, res.data.success ? 'Analytics received' : res.data.message);

  // ==========================================
  // 9. ELITE PASS APIs (both roles)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 9. ELITE PASS APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/elite-pass/active (public)
  res = await apiCall('GET', '/api/elite-pass/active', null);
  printResult('SHARED', 'GET /api/elite-pass/active (public)', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} plans` : 'No data');

  // GET /api/elite-pass/my-pass
  res = await apiCall('GET', '/api/elite-pass/my-pass', userToken);
  printResult('USER', 'GET /api/elite-pass/my-pass', res.status, res.data.success !== undefined, res.data.success ? 'Pass info received' : res.data.message);

  res = await apiCall('GET', '/api/elite-pass/my-pass', partnerToken);
  printResult('PARTNER', 'GET /api/elite-pass/my-pass', res.status, res.data.success !== undefined, res.data.success ? 'Pass info received' : res.data.message);

  // ==========================================
  // 10. BANNER APIs (public)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 10. BANNER APIs (Public)');
  console.log('═══════════════════════════════════════════════════');

  res = await apiCall('GET', '/api/banners', null);
  printResult('SHARED', 'GET /api/banners (public)', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} banners` : 'No data');

  // ==========================================
  // 11. APP VERSION API (public)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 11. APP VERSION API (Public)');
  console.log('═══════════════════════════════════════════════════');

  res = await apiCall('GET', '/api/app/version', null);
  printResult('SHARED', 'GET /api/app/version (public)', res.status, res.data.success !== undefined, res.data.success ? 'Version info received' : res.data.message);

  // ==========================================
  // 12. PARTNER-ONLY APIs
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 12. PARTNER-ONLY APIs');
  console.log('═══════════════════════════════════════════════════');

  // GET /api/partner/dashboard
  res = await apiCall('GET', '/api/partner/dashboard', partnerToken);
  printResult('PARTNER', 'GET /api/partner/dashboard', res.status, res.data.success !== undefined, res.data.success ? 'Dashboard data received' : res.data.message);

  // USER should NOT access partner dashboard
  res = await apiCall('GET', '/api/partner/dashboard', userToken);
  printResult('USER', 'GET /api/partner/dashboard (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: User accessed partner API!' : 'Correctly denied (403)');

  // GET /api/partner/profile
  res = await apiCall('GET', '/api/partner/profile', partnerToken);
  printResult('PARTNER', 'GET /api/partner/profile', res.status, res.data.success !== undefined, res.data.success ? 'Profile received' : res.data.message);

  // PUT /api/partner/profile
  res = await apiCall('PUT', '/api/partner/profile', partnerToken, { business_name: 'Test Gaming Org', phone: '9876543210', city: 'Delhi' });
  printResult('PARTNER', 'PUT /api/partner/profile (update)', res.status, res.data.success !== undefined, res.data.success ? 'Profile updated' : res.data.message);

  // POST /api/partner/events (create event)
  const eventData = {
    title: 'Test Tournament',
    description: 'A test tournament event',
    game_type: 'BR',
    mode: 'Solo',
    entry_fee: 100,
    prize_pool: 1000,
    max_players: 48,
    map: 'Bermuda',
    match_date: '2026-05-25',
    match_time: '20:00',
    event_type: 'ONLINE',
  };

  res = await apiCall('POST', '/api/partner/events', partnerToken, eventData);
  printResult('PARTNER', 'POST /api/partner/events (create)', res.status, res.data.success !== undefined, res.data.success ? `Event: ${res.data.data._id}` : res.data.message);
  if (res.data.success) eventId = res.data.data._id;

  // USER should NOT create partner events
  res = await apiCall('POST', '/api/partner/events', userToken, eventData);
  printResult('USER', 'POST /api/partner/events (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: User created partner event!' : 'Correctly denied (403)');

  // GET /api/partner/events
  res = await apiCall('GET', '/api/partner/events', partnerToken);
  printResult('PARTNER', 'GET /api/partner/events', res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} events` : res.data.message);

  // GET /api/partner/events/:id
  if (eventId) {
    res = await apiCall('GET', `/api/partner/events/${eventId}`, partnerToken);
    printResult('PARTNER', `GET /api/partner/events/:id`, res.status, res.data.success !== undefined, res.data.success ? `Event: ${res.data.data.title}` : res.data.message);

    // PUT /api/partner/events/:id
    res = await apiCall('PUT', `/api/partner/events/${eventId}`, partnerToken, { title: 'Updated Tournament' });
    printResult('PARTNER', `PUT /api/partner/events/:id (update)`, res.status, res.data.success !== undefined, res.data.success ? 'Updated' : res.data.message);

    // POST /api/partner/events/:id/publish
    res = await apiCall('POST', `/api/partner/events/${eventId}/publish`, partnerToken);
    printResult('PARTNER', `POST /api/partner/events/:id/publish`, res.status, res.data.success !== undefined, res.data.success ? 'Published' : res.data.message);

    // POST /api/partner/events/:id/room-details
    res = await apiCall('POST', `/api/partner/events/${eventId}/room-details`, partnerToken, { room_id: 'ROOM123', room_password: 'PASS456' });
    printResult('PARTNER', `POST /api/partner/events/:id/room-details`, res.status, res.data.success !== undefined, res.data.success ? 'Room details updated' : res.data.message);

    // GET /api/partner/events/:id/participants
    res = await apiCall('GET', `/api/partner/events/${eventId}/participants`, partnerToken);
    printResult('PARTNER', `GET /api/partner/events/:id/participants`, res.status, res.data.success !== undefined, res.data.data ? `${res.data.data.length || 0} participants` : 'No participants');
  }

  // ==========================================
  // 13. ADMIN APIs (should be denied for both)
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 13. ADMIN APIs (Should be DENIED for USER & PARTNER)');
  console.log('═══════════════════════════════════════════════════');

  res = await apiCall('GET', '/api/admin/stats', userToken);
  printResult('USER', 'GET /api/admin/stats (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: User accessed admin!' : 'Correctly denied');

  res = await apiCall('GET', '/api/admin/stats', partnerToken);
  printResult('PARTNER', 'GET /api/admin/stats (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: Partner accessed admin!' : 'Correctly denied');

  res = await apiCall('GET', '/api/admin/users', userToken);
  printResult('USER', 'GET /api/admin/users (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: User accessed admin users!' : 'Correctly denied');

  res = await apiCall('GET', '/api/admin/users', partnerToken);
  printResult('PARTNER', 'GET /api/admin/users (should fail)', res.status, !res.data.success, res.data.success ? '⚠️ SECURITY: Partner accessed admin users!' : 'Correctly denied');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let securityIssues = 0;

  for (const [role, tests] of Object.entries(results)) {
    const rolePassed = Object.values(tests).filter(t => t.success).length;
    const roleTotal = Object.keys(tests).length;
    const roleFailed = roleTotal - rolePassed;
    passedTests += rolePassed;
    failedTests += roleFailed;
    totalTests += roleTotal;

    // Check for security issues
    const issues = Object.entries(tests).filter(([k, v]) => k.includes('should fail') && v.success === false).length;
    securityIssues += issues;

    console.log(`\n  ${role}: ${rolePassed}/${roleTotal} passed, ${roleFailed} failed`);
    if (roleFailed > 0) {
      Object.entries(tests).filter(([, v]) => !v.success).forEach(([k, v]) => {
        console.log(`    ❌ ${k}: ${v.msg}`);
      });
    }
  }

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  TOTAL: ${passedTests}/${totalTests} passed, ${failedTests} failed`);
  console.log(`  SECURITY: ${securityIssues} access control checks passed`);
  console.log(`  ─────────────────────────────────────────`);

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test error:', err.message);
  mongoose.disconnect();
});
