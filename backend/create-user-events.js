const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const API_BASE = 'http://localhost:5000/api';

const CREDENTIALS = {
  admin: { email: 'pawneshshakya1@gmail.com', password: '12345678' },
  user: { email: 'pawneshkumar162@gmail.com', password: '12345678' }
};

const tokens = {};

async function login(role, creds) {
  const res = await axios.post(`${API_BASE}/auth/login`, creds);
  tokens[role] = res.data.data.token;
  console.log(`✅ ${role} logged in`);
  return tokens[role];
}

function getHeaders(role) {
  return { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' };
}

async function createPartnerProfileDirect() {
  console.log('\n🔧 Creating partner profile directly in DB...');
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name';
    await mongoose.connect(mongoUri);
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const PartnerProfile = mongoose.model('PartnerProfile', new mongoose.Schema({}, { strict: false }));
    
    // Find the user
    const user = await User.findOne({ email: 'pawneshkumar162@gmail.com' });
    if (!user) {
      console.error('  ❌ User not found');
      return false;
    }
    console.log(`  User ID: ${user._id}`);
    
    // Check if partner profile already exists
    let profile = await PartnerProfile.findOne({ user_id: user._id });
    if (profile) {
      console.log('  Partner profile already exists, upgrading to standard...');
      profile.partner_tier = 'standard';
      profile.tier_label = 'Standard Partner';
      profile.commission_rate = 0.10;
      profile.daily_event_limit = 5;
      profile.tier_upgraded_at = new Date();
      profile.tier_expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await profile.save();
      console.log('  ✅ Profile upgraded to Standard Partner');
    } else {
      // Create new partner profile
      profile = await PartnerProfile.create({
        user_id: user._id,
        business_name: user.username || 'User Partner',
        partner_tier: 'standard',
        tier_label: 'Standard Partner',
        commission_rate: 0.10,
        daily_event_limit: 5,
        featured_listing: false,
        priority_support: false,
        analytics_access: false,
        max_sponsors_per_event: 1,
        max_events_per_month: 10,
        max_entry_fee: 100,
        max_prize_pool: 50000,
        max_players_per_event: 52,
        tier_upgraded_at: new Date(),
        tier_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: { type: 'Point', coordinates: [0, 0] }
      });
      console.log('  ✅ Partner profile created as Standard Partner');
    }
    
    await mongoose.disconnect();
    return true;
  } catch (e) {
    console.error(`  ❌ Failed:`, e.message);
    return false;
  }
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

async function createUserEvents() {
  console.log('\n📅 Creating 10 User events...');
  const baseTime = new Date();
  baseTime.setMinutes(baseTime.getMinutes() + 10);

  for (let i = 1; i <= 10; i++) {
    const eventTime = addMinutes(baseTime, (i - 1) * 30);
    const eventType = i % 2 === 0 ? 'sponsored' : 'standard';

    const payload = {
      title: `User ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event #${i}`,
      banner_url: 'https://example.com/banner.jpg',
      game_type: 'BR',
      mode: 'SQUAD',
      max_players: 52,
      map: 'BERMUDA',
      entry_fee: eventType === 'sponsored' ? 0 : 10,
      prize_pool: eventType === 'sponsored' ? 2000 : 300,
      match_date: formatDate(eventTime),
      match_time: formatTime(eventTime),
      standard_restrictions: { no_grenades: true, sniper_only: false, no_vehicles: true },
      additional_rules: 'Play fair',
      event_category: eventType,
      isPublished: true,
      latitude: 28.6139,
      longitude: 77.2090,
      sponsor_details: eventType === 'sponsored' ? { sponsor_name: `Sponsor ${i}`, logo_url: 'https://example.com/logo.png', contact_email: 'sponsor@example.com' } : undefined
    };

    try {
      const res = await axios.post(`${API_BASE}/partner/events`, payload, { headers: getHeaders('user') });
      console.log(`  ✅ User ${eventType} #${i} created at ${formatDate(eventTime)} ${formatTime(eventTime)}`);
    } catch (e) {
      console.error(`  ❌ User ${eventType} #${i} failed:`, e.response?.data?.message || e.message);
    }
  }
}

async function main() {
  console.log('🚀 Creating user events...\n');

  await login('admin', CREDENTIALS.admin);
  await login('user', CREDENTIALS.user);

  const created = await createPartnerProfileDirect();
  if (created) {
    // Re-login to get fresh token with partner role
    await login('user', CREDENTIALS.user);
    await createUserEvents();
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);