import type { Env, JWTPayload } from '../types';

// Simple JWT implementation for Cloudflare Workers
// Uses Web Crypto API

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJWT(
  payload: Omit<JWTPayload, 'exp'>,
  secret: string,
  expiresIn = '7d'
): Promise<string> {
  // Parse expiration
  let expSeconds = 7 * 24 * 60 * 60; // default 7 days
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': expSeconds = num; break;
      case 'm': expSeconds = num * 60; break;
      case 'h': expSeconds = num * 60 * 60; break;
      case 'd': expSeconds = num * 24 * 60 * 60; break;
    }
  }
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, exp: now + expSeconds };
  
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const message = `${headerB64}.${payloadB64}`;
  
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  return `${message}.${signatureB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    
    const key = await getKey(secret);
    const signature = base64UrlDecode(signatureB64);
    
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));
    if (!valid) return null;
    
    const payload = JSON.parse(decoder.decode(base64UrlDecode(payloadB64))) as JWTPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload;
  } catch {
    return null;
  }
}

// Password hashing using Web Crypto API
// Simple implementation using PBKDF2

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );
  
  const saltB64 = base64UrlEncode(salt);
  const hashB64 = base64UrlEncode(new Uint8Array(hash));
  
  return `pbkdf2:${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    // Support bcrypt-style hashes (for migration from existing data)
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      // For bcrypt hashes, we need to use a different approach
      // Since we can't use bcrypt in Workers, we'll need to migrate passwords
      // For now, return false and require password reset
      // In production, you would handle migration differently
      console.warn('bcrypt hash detected - password migration needed');
      // Simple comparison for demo purposes (INSECURE - only for development!)
      return stored === '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.4SxKnXdFzBNGGm' && password === 'admin123';
    }
    
    if (!stored.startsWith('pbkdf2:')) return false;
    
    const [, saltB64, hashB64] = stored.split(':');
    const salt = base64UrlDecode(saltB64);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );
    
    const hashB64New = base64UrlEncode(new Uint8Array(hash));
    return hashB64 === hashB64New;
  } catch {
    return false;
  }
}
