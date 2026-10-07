import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { env } from '../config/env.js';
import type { Role } from '../models/constants.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

/**
 * Parse human duration strings like '15m', '7d', '24h', '30s' into milliseconds.
 */
export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Default fallback to 7 days if parsing fails
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

/**
 * Compute SHA-256 digest of a token string.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Sign an ephemeral JWT Access Token.
 */
export const signAccessToken = (userId: string, role: Role): string => {
  const payload = { sub: userId, role };
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Sign a rotating JWT Refresh Token containing a unique jti.
 */
export const signRefreshToken = (
  userId: string
): { token: string; jti: string; expiresAt: Date } => {
  const jti = crypto.randomUUID();
  const payload = { sub: userId, jti };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'],
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  const durationMs = parseDurationToMs(env.JWT_REFRESH_EXPIRES);
  const expiresAt = new Date(Date.now() + durationMs);

  return { token, jti, expiresAt };
};

/**
 * Verify a JWT Access Token signature.
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

/**
 * Verify a JWT Refresh Token signature.
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

/**
 * Secure HTTP-only cookie configuration for the rotating refresh token.
 */
export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const maxAge = parseDurationToMs(env.JWT_REFRESH_EXPIRES);
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge,
  };
};
