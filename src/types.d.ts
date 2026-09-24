import 'express-session';

/** Extend express-session with custom fields stored per session. */
declare module 'express-session' {
    interface SessionData {
        /** JWT issued by the Next.js upstream on login/signup. */
        jwt: string;
        /** Epoch ms when the session was created (for absolute expiry). */
        created_at: number;
        /** Epoch ms of the last request (for idle timeout). */
        last_active: number;
    }
}
