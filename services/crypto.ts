// services/crypto.ts
import * as argon2 from 'argon2-browser'
import wasmUrl from 'argon2-browser/dist/argon2.wasm?url'   // local asset via Vite
import { KdfParams, Argon2idParams, Pbkdf2Params } from '../types'

// --- Helper Functions ---
export const bufToBase64 = (buf: Uint8Array): string =>
  btoa(String.fromCharCode(...buf))
export const base64ToBuf = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), c => c.charCodeAt(0))
const textToBuf = (text: string): Uint8Array => new TextEncoder().encode(text)

// --- KDF Parameters ---
const WEAK_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '123', 'pass', '111111'
])

// Reasonable desktop defaults. (64 MB; adjust later in Settings UI if you add it)
export const DEFAULT_ARGON2_PARAMS: Omit<Argon2idParams, 'salt'> = {
  mem: 65536,   // KiB (64 MB)
  time: 3,
  parallelism: 1,
}

export const DEFAULT_PBKDF2_PARAMS: Omit<Pbkdf2Params, 'salt'> = {
  iterations: 310000,
}

// --- WASM loader (local, no CSP / network issues) ---
let argon2Wasm: ArrayBuffer | null = null
async function getArgon2Wasm () {
  if (!argon2Wasm) {
    const res = await fetch(wasmUrl)
    if (!res.ok) throw new Error(`Failed to load argon2.wasm: ${res.status}`)
    argon2Wasm = await res.arrayBuffer()
  }
  return argon2Wasm
}

// --- Key Derivation ---
export async function deriveKey(
  password: string,
  params: KdfParams
): Promise<CryptoKey> {
  const salt = base64ToBuf(params.salt)

  // Argon2id path when params include mem/time/parallelism
  if ('mem' in params) {
    try {
      const wasm = await getArgon2Wasm()
      const hash = await argon2.hash({
        pass: password,
        salt,
        time: params.time,
        mem: params.mem,
        parallelism: params.parallelism,
        type: argon2.ArgonType.Argon2id,
        hashLen: 32, // AES-256
        out: 'raw',
        wasm,
      })
      return crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      )
    } catch (e) {
      console.warn('Argon2id failed, falling back to PBKDF2.', e)
      // fallthrough to PBKDF2
    }
  }

  // PBKDF2 fallback (or explicit)
  const pbkdf2Params = 'iterations' in params ? params : DEFAULT_PBKDF2_PARAMS
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textToBuf(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: pbkdf2Params.iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// --- Encryption / Decryption ---
export const encrypt = async (
  data: Uint8Array,
  key: CryptoKey
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  return { iv, ciphertext: new Uint8Array(ciphertext) }
}

export const decrypt = async (
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> => {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )
  return new Uint8Array(plain)
}

// --- Password Strength (needed by LockScreen) ---
export function checkPasswordStrength(
  password: string
): { score: number; message: string } {
  if (!password) return { score: 0, message: '' }
  if (password.length < 12) return { score: 0, message: 'Too short (min 12 chars)' }
  if (WEAK_PASSWORDS.has(password.toLowerCase()))
    return { score: 0, message: 'Very common password' }

  let score = 0
  score += Math.min(2, Math.floor(password.length / 6))
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const message = score < 4 ? 'Weak' : score < 6 ? 'Okay' : 'Strong'
  return { score: Math.round((score / 6) * 100), message }
}
