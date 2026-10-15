/**
 * Global College — Enterprise Security & Cryptography Engine
 * Uses Web Crypto API (SubtleCrypto) for SHA-256 password hashing and secure token generation
 */

export const GLOBAL_SALT = 'global_college_2026_salt_'

export async function hashPassword(plainText: string, salt: string = GLOBAL_SALT): Promise<string> {
  if (!plainText) return ''
  const encoder = new TextEncoder()
  const payload = salt ? `${salt}${plainText.trim()}` : plainText.trim()
  const data = encoder.encode(payload)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false
  const cleanPlain = plainText.trim()
  // Direct match (for legacy unhashed passwords)
  if (cleanPlain === storedHashOrPlain) {
    return true
  }
  // Compare salted SHA-256 cryptographic hash (standard)
  const saltedHash = await hashPassword(cleanPlain, GLOBAL_SALT)
  if (saltedHash === storedHashOrPlain) {
    return true
  }
  // Compare legacy unsalted SHA-256 cryptographic hash
  const unsaltedHash = await hashPassword(cleanPlain, '')
  return unsaltedHash === storedHashOrPlain
}

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
