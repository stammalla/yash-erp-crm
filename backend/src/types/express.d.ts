import 'express';

export interface AuthUser {
  id: string;
  role: 'admin' | 'sales' | 'warehouse' | 'accounts';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
