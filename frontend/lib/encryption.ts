/**
 * Encryption Utility
 * Uses TweetNaCl.js (Curve25519) for asymmetric encryption
 *
 * Auditor's keypair:
 * - Public key: Shared, used to encrypt evidence hash (base64 format)
 * - Private key: Secret, used to decrypt (only auditor has this)
 */

export interface EncryptedData {
  nonce: string; // Base64 encoded
  ciphertext: string; // Base64 encoded
  ephemeralPublicKey: string; // Base64 encoded (The sender's ephemeral public key, REQUIRED for decryption)
}

/**
 * Generate a keypair for encryption/decryption
 * Returns both public key (to share) and secret key (to keep private)
 *
 * @returns Object with publicKey and secretKey (both base64 encoded)
 */
export function generateKeypair(): { publicKey: string; secretKey: string } {
  // Dynamically import tweetnacl
  const nacl = require('tweetnacl');

  const keypair = nacl.box.keyPair();

  return {
    publicKey: Buffer.from(keypair.publicKey).toString('base64'),
    secretKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}

/**
 * Encrypt plaintext using recipient's public key
 * Generates a random ephemeral keypair for the sender side of this specific message.
 *
 * @param plaintext - Data to encrypt (IPFS hash)
 * @param recipientPublicKeyBase64 - Recipient's public key (base64 encoded)
 * @returns EncryptedData object with nonce, ciphertext, and ephemeralPublicKey
 */
export function encryptWithPublicKey(
  plaintext: string,
  recipientPublicKeyBase64: string
): EncryptedData {
  const nacl = require('tweetnacl');

  try {
    // Decode the recipient's public key
    const recipientPublicKey = new Uint8Array(Buffer.from(recipientPublicKeyBase64, 'base64'));

    // Generate a random nonce for this encryption
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Create a temporary (ephemeral) keypair for this specific encryption
    // This is standard practice for NaCl box when we don't need sender authentication
    const ephemeralKeypair = nacl.box.keyPair();

    // Encode plaintext to bytes
    const messageBytes = new TextEncoder().encode(plaintext);

    // Encrypt using NaCl box
    // box(message, nonce, recipientPublicKey, senderSecretKey)
    const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, ephemeralKeypair.secretKey);

    if (!ciphertext) {
      throw new Error('Encryption failed - no ciphertext generated');
    }

    return {
      nonce: Buffer.from(nonce).toString('base64'),
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      ephemeralPublicKey: Buffer.from(ephemeralKeypair.publicKey).toString('base64'),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown encryption error';
    throw new Error(`Encryption failed: ${errorMsg}`);
  }
}

/**
 * Decrypt data using your secret key
 * Only the owner of the secret key can decrypt
 *
 * @param encryptedData - Object with nonce, ciphertext, and ephemeralPublicKey
 * @param recipientSecretKeyBase64 - Your secret key (base64 encoded)
 * @returns Decrypted plaintext
 */
export function decryptWithSecretKey(
  encryptedData: EncryptedData,
  recipientSecretKeyBase64: string
): string {
  const nacl = require('tweetnacl');

  try {
    // Decode inputs from base64
    const nonce = new Uint8Array(Buffer.from(encryptedData.nonce, 'base64'));
    const ciphertext = new Uint8Array(Buffer.from(encryptedData.ciphertext, 'base64'));
    const ephemeralPublicKey = new Uint8Array(Buffer.from(encryptedData.ephemeralPublicKey, 'base64'));
    const recipientSecretKey = new Uint8Array(Buffer.from(recipientSecretKeyBase64, 'base64'));

    // Decrypt using NaCl box open
    // box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey)
    const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPublicKey, recipientSecretKey);

    if (!decrypted) {
      throw new Error('Decryption failed - could not decrypt message (Wrong key?)');
    }

    // Convert decrypted bytes to string
    const plaintext = new TextDecoder().decode(decrypted);
    return plaintext;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown decryption error';
    throw new Error(`Decryption failed: ${errorMsg}`);
  }
}

/**
 * Serialize encrypted data to JSON string for storage/transmission
 * @param encryptedData - EncryptedData object
 * @returns JSON string
 */
export function serializeEncryptedData(encryptedData: EncryptedData): string {
  return JSON.stringify(encryptedData);
}

/**
 * Deserialize JSON string back to EncryptedData object
 * @param jsonString - JSON string from serialization
 * @returns EncryptedData object
 */
export function deserializeEncryptedData(jsonString: string): EncryptedData {
  try {
    const data = JSON.parse(jsonString);
    if (!data.nonce || !data.ciphertext) {
      throw new Error('Invalid encrypted data format: missing nonce or ciphertext');
    }
    if (!data.ephemeralPublicKey && !data.publicKey) {
       throw new Error('Invalid encrypted data format: missing public key');
    }
    // Migration helper: if old 'publicKey' exists but no 'ephemeralPublicKey', map it
    if (!data.ephemeralPublicKey && data.publicKey) {
        data.ephemeralPublicKey = data.publicKey;
    }
    
    return data as EncryptedData;
  } catch (error) {
    throw new Error(`Failed to deserialize encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility: Validate base64 public key format
 * @param publicKeyBase64 - Public key to validate
 * @returns true if valid, false otherwise
 */
export function isValidPublicKey(publicKeyBase64: string): boolean {
  try {
    const decoded = Buffer.from(publicKeyBase64, 'base64');
    // NaCl box public keys should be 32 bytes
    return decoded.length === 32;
  } catch {
    return false;
  }
}