/**
 * Edge-compatible password hashing using Web Crypto API (PBKDF2).
 * Works on Cloudflare Workers, Node.js, and all modern runtimes.
 */

const ITERATIONS = 100_000
const KEY_LENGTH = 32 // bytes
const SALT_LENGTH = 32 // bytes

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return `${bufferToHex(salt.buffer)}:${bufferToHex(derivedBits)}`
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':')
  if (!saltHex || !hashHex) return false

  const salt = hexToBuffer(saltHex)
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  )
  return bufferToHex(derivedBits) === hashHex
}
