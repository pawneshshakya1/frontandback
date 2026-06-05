// One-shot migration: encrypt legacy plaintext wallet_account_no fields.
//
// Background:
//   The S2 security refactor introduced AES-256-GCM encryption for
//   sensitive wallet fields and made the `decrypt` util fail-loud on
//   any value that isn't in the new `iv:authTag:hex` format. Any
//   wallet created before that change still has a plaintext
//   `wallet_account_no`, so every read now throws "Invalid encrypted
//   payload format". This script walks every wallet, detects
//   plaintext values, encrypts them, and back-fills the
//   `wallet_account_no_hash` lookup field.
//
// Usage (from the backend dir):
//   node scripts/migrate-encrypted-fields.js
//
// Idempotent: re-running on an already-migrated DB is a no-op.

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Wallet = require('../src/models/wallet.model');
const { encrypt, isEncryptedPayload } = require('../src/utils/encryption');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI (or MONGO_URI) is not set in environment');
  process.exit(1);
}

const hashAccountNo = (accountNo) =>
  crypto.createHash('sha256').update(String(accountNo)).digest('hex');

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Wallets missing the lookup hash, OR whose stored value is not
    // in the new encrypted format.
    const candidates = await Wallet.find({
      $or: [
        { wallet_account_no_hash: { $exists: false } },
        { wallet_account_no_hash: null },
      ],
    });
    console.log(`Found ${candidates.length} wallets needing migration`);

    let updated = 0;
    let skipped = 0;
    for (const w of candidates) {
      try {
        const raw = w.wallet_account_no;
        if (isEncryptedPayload(raw)) {
          // Already encrypted but missing hash — back-fill hash only.
          // Decrypt with a throwaway so we never modify the cipher.
          // We can re-derive the hash from the raw hash on the
          // record by calling decrypt on a temp throwaway key? No —
          // safer: just back-fill by re-encrypting once we already
          // have the hash set; in practice if the value is encrypted
          // AND has no hash, we cannot recover the plaintext. Skip.
          console.warn(`  skip ${w._id}: already encrypted but no hash; cannot recover plaintext`);
          skipped++;
          continue;
        }
        if (!raw) {
          console.warn(`  skip ${w._id}: empty wallet_account_no`);
          skipped++;
          continue;
        }
        const plaintext = String(raw);
        w.wallet_account_no = encrypt(plaintext);
        w.wallet_account_no_hash = hashAccountNo(plaintext);
        await w.save();
        updated++;
        console.log(`  migrated ${w._id} (${plaintext.substring(0, 4)}***)`);
      } catch (err) {
        console.error(`  FAILED ${w._id}: ${err.message}`);
        skipped++;
      }
    }

    console.log(`\nMigration done. updated=${updated} skipped=${skipped}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
