const crypto = require('crypto');

const QR_SIGNATURE_SECRET = process.env.QR_SIGNATURE_SECRET;
if (!QR_SIGNATURE_SECRET || QR_SIGNATURE_SECRET.length < 32) {
  throw new Error(
    'QR_SIGNATURE_SECRET is not defined or is too short. ' +
    'Set a 32+ char secret in the environment (matching the CASHFREE_WEBHOOK_SECRET pattern).'
  );
}
const QR_EXPIRY_MINUTES = 5; // QR code expires in 5 minutes

/**
 * Generate a secure QR payload
 * Format: base64({accountNo}.{timestamp}.{signature})
 */
const generateQRPayload = (walletAccountNo) => {
    const timestamp = Date.now();
    const expiry = timestamp + (QR_EXPIRY_MINUTES * 60 * 1000);

    // Create signature: HMAC-SHA256(accountNo.timestamp, secret)
    const signature = crypto
        .createHmac('sha256', QR_SIGNATURE_SECRET)
        .update(`${walletAccountNo}.${timestamp}`)
        .digest('hex');

    const payload = {
        a: walletAccountNo,  // account number
        t: timestamp,       // timestamp
        e: expiry,          // expiry timestamp
        s: signature        // signature
    };

    // Return base64 encoded JSON
    return Buffer.from(JSON.stringify(payload)).toString('base64');
};

/**
 * Validate and decode a secure QR payload
 * @param {string} qrData - Base64 encoded QR payload
 * @returns {object} Decoded payload or throws error
 */
const validateQRPayload = (qrData) => {
    try {
        // Sanitize: trim whitespace, newlines, remove any null bytes or BOM characters
        let cleanData = qrData
            .trim()
            .replace(/[\x00-\x1f\x7f]/g, '')  // Remove control chars
            .replace(/^\uFEFF/, '');             // Remove BOM

        // Handle URL-safe base64 (replace - with + and _ with /)
        cleanData = cleanData.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if missing
        const paddingNeeded = cleanData.length % 4;
        if (paddingNeeded !== 0) {
            cleanData += '='.repeat(4 - paddingNeeded);
        }

        console.log('[QR Validate] Received data length:', qrData.length, 'Cleaned length:', cleanData.length);

        const decoded = Buffer.from(cleanData, 'base64').toString('utf8');
        console.log('[QR Validate] Decoded payload (first 50 chars):', decoded.substring(0, 50));

        const payload = JSON.parse(decoded);

        const { a: accountNo, t: timestamp, e: expiry, s: signature } = payload;

        // Validate all fields exist
        if (!accountNo || !timestamp || !expiry || !signature) {
            console.error('[QR Validate] Missing fields:', { hasAccount: !!accountNo, hasTimestamp: !!timestamp, hasExpiry: !!expiry, hasSig: !!signature });
            throw new Error('Invalid QR payload structure');
        }

        // Check if QR has expired
        if (Date.now() > expiry) {
            const ageSeconds = Math.floor((Date.now() - timestamp) / 1000);
            console.error('[QR Validate] QR expired. Age:', ageSeconds, 'seconds');
            throw new Error('QR code has expired. Please ask the sender to generate a new one.');
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', QR_SIGNATURE_SECRET)
            .update(`${accountNo}.${timestamp}`)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('[QR Validate] Signature mismatch');
            console.error('[QR Validate] Expected:', expectedSignature.substring(0, 20) + '...');
            console.error('[QR Validate] Got:', signature.substring(0, 20) + '...');
            throw new Error('Invalid QR signature. QR code may be tampered.');
        }

        console.log('[QR Validate] Validation passed for account:', accountNo.substring(0, 3) + '***');
        return {
            accountNo,
            timestamp,
            expiry
        };
    } catch (error) {
        console.error('[QR Validate] Error:', error.message);
        if (error.message.includes('Invalid QR') || error.message.includes('expired')) {
            throw error;
        }
        throw new Error('Invalid QR code format');
    }
};

/**
 * Generate QR data string for manual verification
 * Used for testing/debugging
 */
const generateQRString = (walletAccountNo) => {
    return generateQRPayload(walletAccountNo);
};

module.exports = {
    generateQRPayload,
    validateQRPayload,
    generateQRString,
    QR_EXPIRY_MINUTES
};