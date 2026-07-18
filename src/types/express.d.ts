import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      errorStatus?: number;
      db?: any;
      company?: any;
    }
  }
}
