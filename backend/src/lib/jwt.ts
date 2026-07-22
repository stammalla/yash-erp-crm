import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/express';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
}
