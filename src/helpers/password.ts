import crypto from 'crypto';
/**
 * Encrypts a password using AES-256-CBC encryption algorithm.
 * @param {string} password - The password to encrypt.
 * @returns {string} The IV and encrypted data as a hex string.
 */
export function encryptPassword(password: string) {
    // Ensure the key length is 32 bytes (256 bits)
    const key = crypto.scryptSync(process.env.OAUTH_PASSWORD_KEY ?? "", 'salt', 32);  // Derive a key using scrypt
    const iv = crypto.randomBytes(16);  // AES block size is 16 bytes

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data together as a hex string
    return iv.toString('hex') + encrypted;
}

/**
 * Decrypts a password using AES-256-CBC encryption algorithm.
 * @param {string} encryptedData - The encrypted data with IV prepended (as a hex string).
 * @returns {string} The decrypted password.
 */
export function decryptPassword(encryptedData: string) {
    // Extract the IV from the encrypted data
    const iv = Buffer.from(encryptedData.substring(0, 32), 'hex');
    const encryptedText = encryptedData.substring(32);

    // Derive the same key from the secret key
    const key = crypto.scryptSync(process.env.OAUTH_PASSWORD_KEY ?? "", 'salt', 32);  // Derive a key using scrypt

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8'); // Complete the decryption

    return decrypted;
}