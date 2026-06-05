require('dotenv').config();
const mongoose = require('mongoose');
const PartnerProfile = require('./src/models/partner-profile.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Fix existing partner profiles with empty coordinates
  const result = await PartnerProfile.updateMany(
    { 'location.coordinates': { $size: 0 } },
    { $set: { 'location.coordinates': [0, 0] } }
  );
  
  console.log(`Fixed ${result.modifiedCount} partner profiles with empty coordinates`);
  
  // Also drop and recreate the 2dsphere index to clear any corrupted index entries
  try {
    await PartnerProfile.collection.dropIndex('location_2dsphere');
    console.log('Dropped old 2dsphere index');
  } catch (e) {
    console.log('No existing 2dsphere index to drop');
  }
  
  await PartnerProfile.createIndexes();
  console.log('Recreated indexes');
  
  await mongoose.disconnect();
})();
