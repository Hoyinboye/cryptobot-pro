"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEncryptionKeyForTests = exports.decryptSensitive = exports.encryptSensitive = void 0;
const crypto = require("crypto");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce recommended for GCM
const KEY_CACHE = {
    key: null,
    override: null,
};
function resolveRawKey() {
    if (KEY_CACHE.override) {
        return KEY_CACHE.override;
    }
    const value = process.env.DATA_ENCRYPTION_KEY;
    if (!value) {
        throw new Error("DATA_ENCRYPTION_KEY environment variable is required to encrypt Kraken credentials");
    }
    return value;
}
function deriveKey() {
    if (KEY_CACHE.key) {
        return KEY_CACHE.key;
    }
    const raw = resolveRawKey();
    let keyBuffer = null;
    // Try to interpret as base64-encoded material
    try {
        keyBuffer = Buffer.from(raw, "base64");
        if (keyBuffer.length === 32) {
            KEY_CACHE.key = keyBuffer;
            return keyBuffer;
        }
    }
    catch (_error) {
        // Fall through to other parsing strategies
    }
    // Try as hex-encoded 32-byte key
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
        KEY_CACHE.key = Buffer.from(raw, "hex");
        return KEY_CACHE.key;
    }
    // As a final fallback, derive a 256-bit key from the provided value
    KEY_CACHE.key = crypto.createHash("sha256").update(raw).digest();
    return KEY_CACHE.key;
}
function encryptSensitive(value) {
    if (value === null || value === undefined || value === "") {
        return value;
    }
    const key = deriveKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [
        iv.toString("hex"),
        ciphertext.toString("hex"),
        authTag.toString("hex"),
    ].join(":");
}
exports.encryptSensitive = encryptSensitive;
function decryptSensitive(payload) {
    if (payload === null || payload === undefined || payload === "") {
        return payload;
    }
    const parts = String(payload).split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted payload format. Expected iv:ciphertext:tag");
    }
    const [ivHex, cipherHex, tagHex] = parts;
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(cipherHex, "hex")),
        decipher.final(),
    ]);
    return plaintext.toString("utf8");
}
exports.decryptSensitive = decryptSensitive;
/**
 * Utility for tests to inject a deterministic key without mutating process.env.
 * Calling with null clears the override and cached key.
 */
function useEncryptionKeyForTests(key) {
    KEY_CACHE.key = null;
    KEY_CACHE.override = key;
}
exports.useEncryptionKeyForTests = useEncryptionKeyForTests;
