import { AuthUserPayload } from './auth';

declare module 'express' {
  interface Request {
    user?: AuthUserPayload;
  }
}
