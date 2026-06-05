require('dotenv').config();
const mongoose = require('mongoose');
const PartnerProfile = require('./src/models/partner-profile.model');
const User = require('./src/models/user.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find all partner profiles with empty/invalid coordinates
  const badProfiles = await PartnerProfile.find({
    $or: [
      { 'location.coordinates': { $size: 0 } },
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates': null },
    ]
  });
  
  console.log(`Found ${badProfiles.length} bad partner profiles`);
  
  // Delete them
  for (const profile of badProfiles) {
    console.log(`Deleting profile for user ${profile.user_id}`);
    await PartnerProfile.deleteOne({ _id: profile._id });
  }
  
  // Recreate profiles for PARTNER users
  const partners = await User.find({ role: 'PARTNER' });
  for (const partner of partners) {
    const existing = await PartnerProfile.findOne({ user_id: partner._id });
    if (!existing) {
      await PartnerProfile.create({
        user_id: partner._id,
        business_name: partner.username,
        location: { type: 'Point', coordinates: [0, 0] },
      });
      console.log(`Created new profile for ${partner.username}`);
    }
  }
  
  // Drop and recreate all indexes
  try {
    await PartnerProfile.collection.dropIndexes();
    console.log('Dropped all indexes');
  } catch (e) {
    console.log('No indexes to drop');
  }
  
  await PartnerProfile.createIndexes();
  console.log('Recreated all indexes');
  
  // Verify
  const allProfiles = await PartnerProfile.find();
  console.log(`\nTotal partner profiles: ${allProfiles.length}`);
  for (const p of allProfiles) {
    console.log(`  ${p.user_id}: coords=${JSON.stringify(p.location?.coordinates)}`);
  }
  
  await mongoose.disconnect();
})();
