/**
 * Global College — Enterprise Security & Cryptography Engine
 * Uses Web Crypto API (SubtleCrypto) for SHA-256 password hashing and secure token generation
 */

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(plainText: string, storedHashOrPlain: string): Promise<boolean> {
  if (!plainText || !storedHashOrPlain) return false
  // Check direct match (for legacy plain passwords before migration)
  if (plainText === storedHashOrPlain) {
    return true
  }
  // Compare SHA-256 cryptographic hash
  const computed = await hashPassword(plainText)
  return computed === storedHashOrPlain
}

export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
