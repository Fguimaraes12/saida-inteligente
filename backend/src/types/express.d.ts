import type { AuthUser } from "../services/sessionService.js";
declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}
export {};
