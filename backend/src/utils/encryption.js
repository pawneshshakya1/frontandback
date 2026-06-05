const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

const getEncryptionKey = () => {
    const key = process.env.WALLET_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('WALLET_ENCRYPTION_KEY is not defined in environment variables');
    }
    // Key must be 32 bytes (64 hex characters)
    return Buffer.from(key, 'hex');
};

const encrypt = (text) => {
    if (text === null || text === undefined) return text;
    
    // Ensure text is string
    const textString = String(text);
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 bytes IV for GCM
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(textString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return encryptedText;

    // Check if it matches format iv:authTag:encryptedData
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        // S2 fix: fail loud. Previously silently returned the input
        // unchanged, which could mask data corruption or tampering.
        // Use the explicit migration helper below for legacy data.
        throw new Error(
            'Invalid encrypted payload format (expected iv:authTag:hex). ' +
            'If this is legacy plaintext data, run scripts/migrate-encrypted-fields.js first.'
        );
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error('Invalid encrypted payload: empty field(s)');
    }
    // Hex must be 32 chars (16 bytes) for IV and 32 chars for auth tag.
    if (ivHex.length !== 32 || authTagHex.length !== 32) {
        throw new Error('Invalid encrypted payload: malformed IV or auth tag length');
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

// Helper for one-off migration of legacy plaintext fields.
// Use ONLY from a migration script, never from request handlers.
const isEncryptedPayload = (value) => {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split(':');
    return parts.length === 3 && parts.every((p) => /^[0-9a-fA-F]+$/.test(p));
};

module.exports = {
    encrypt,
    decrypt,
    isEncryptedPayload,
};
