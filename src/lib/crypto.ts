/**
 * Global College — Enterprise Security & Cryptography Engine
 * Uses Web Crypto API (SubtleCrypto) with PBKDF2 key derivation (SHA-256, 100,000 iterations)
 * Includes backward-compatible verification for legacy salted SHA-256 hashes and plain text.
 */

export const GLOBAL_SALT = 'global_college_2026_salt_'
const DEFAULT_PBKDF2_ITERATIONS = 100000

/**
 * Derives a PBKDF2 cryptographic hash using Web Crypto API.
 * Format: pbkdf2$<iterations>$<hex>
 */
export async function hashPasswordPBKDF2(
  plainText: string,
  salt: string = GLOBAL_SALT,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<string> {
  if (!plainText) return ''
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(plainText.trim())
  const saltData = encoder.encode(salt || GLOBAL_SALT)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  const hashArray = Array.from(new Uint8Array(derivedBits))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${iterations}$${hashHex}`
}

/**
 * Legacy salted SHA-256 cryptographic hash generator.
 */
export async function hashPasswordSHA256(plainText: string, salt: string = GLOBAL_SALT): Promise<string> {
  if (!plainText) return ''
  const encoder = new TextEncoder()
  const payload = salt ? `${salt}${plainText.trim()}` : plainText.trim()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Primary password hashing entry point.
 * Uses PBKDF2 with 100,000 iterations for robust protection against brute-force and dictionary attacks.
 */
export async function hashPassword(plainText: string, salt: string = GLOBAL_SALT): Promise<string> {
  return hashPasswordPBKDF2(plainText, salt, DEFAULT_PBKDF2_ITERATIONS)
}

/**
 * Verifies a plain-text candidate against any stored password string:
 * 1. Modern PBKDF2 hash (format: pbkdf2$<iterations>$<hex>)
 * 2. Plain text (demo or legacy records)
 * 3. Salted SHA-256 cryptographic hash
 * 4. Unsalted SHA-256 hash
 */
export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false
  const cleanPlain = plainText.trim()

  // 1. Check for modern PBKDF2 hash format
  if (storedHashOrPlain.startsWith('pbkdf2$')) {
    const parts = storedHashOrPlain.split('$')
    const iterations = parseInt(parts[1], 10) || DEFAULT_PBKDF2_ITERATIONS
    const computed = await hashPasswordPBKDF2(cleanPlain, GLOBAL_SALT, iterations)
    return computed === storedHashOrPlain
  }

  // 2. Direct match (for legacy unhashed passwords or dev fixtures)
  if (cleanPlain === storedHashOrPlain) {
    return true
  }

  // 3. Compare salted SHA-256 cryptographic hash (legacy standard)
  const saltedHash = await hashPasswordSHA256(cleanPlain, GLOBAL_SALT)
  if (saltedHash === storedHashOrPlain) {
    return true
  }

  // 4. Compare legacy unsalted SHA-256 cryptographic hash
  const unsaltedHash = await hashPasswordSHA256(cleanPlain, '')
  return unsaltedHash === storedHashOrPlain
}

/**
 * Checks whether a given stored hash needs upgrading to modern PBKDF2.
 */
export function isLegacyPasswordHash(storedHashOrPlain?: string | null): boolean {
  if (!storedHashOrPlain) return false
  return !storedHashOrPlain.startsWith('pbkdf2$')
}

/**
 * Generates a cryptographically secure random hexadecimal token.
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
