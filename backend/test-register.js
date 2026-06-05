require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');

const BASE_EMAIL = 'testing';
const BASE_DOMAIN = '@gmail.com';
const PASSWORD = '12345678';
const API_URL = 'http://192.168.29.27:5000/api';

async function findNextAvailableNumber() {
  let num = 1;
  while (true) {
    const email = `${BASE_EMAIL}${num}${BASE_DOMAIN}`;
    const existing = await User.findOne({ email });
    if (!existing) return num;
    num++;
  }
}

async function testRegistration() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const num = await findNextAvailableNumber();
  const email = `${BASE_EMAIL}${num}${BASE_DOMAIN}`;
  const username = `${BASE_EMAIL}${num}`;

  console.log(`\n📝 Creating user: ${email} (password: ${PASSWORD})`);

  // Create user directly in DB with is_verified: true
  const user = await User.create({
    username,
    email,
    password_hash: PASSWORD,
    is_verified: true,
  });

  console.log(`✅ User created: ${username} | ID: ${user._id}`);
  console.log(`✅ Email: ${email}`);
  console.log(`✅ Password: ${PASSWORD}`);
  console.log(`✅ Verified: true`);

  // Now test login via API
  const http = require('http');

  const loginData = JSON.stringify({ email, password: PASSWORD });

  const options = {
    hostname: '192.168.29.27',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length,
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const response = JSON.parse(data);
      console.log(`\n🔐 Login test: ${response.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (response.success) {
        console.log(`   Token: ${response.data.token.substring(0, 30)}...`);
        console.log(`   Role: ${response.data.role}`);
        console.log(`   Username: ${response.data.username}`);
      } else {
        console.log(`   Error: ${response.message}`);
      }
      mongoose.disconnect();
    });
  });

  req.on('error', (e) => {
    console.log(`❌ Login request failed: ${e.message}`);
    console.log('(Make sure backend is running on port 5000)');
    mongoose.disconnect();
  });

  req.write(loginData);
  req.end();
}

testRegistration().catch((err) => {
  console.error('❌ Error:', err.message);
  mongoose.disconnect();
});
