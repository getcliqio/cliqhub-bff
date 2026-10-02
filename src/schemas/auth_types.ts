/**
 * Auth — sign-up (request schema; the response is a session, see session_types.ts).
 *
 * Routes (controllers/auth_controller.ts):
 *   POST /v1/auth/signup — new account → signed-in session
 *
 * Tokens are in tokens_types.ts, realm dispatch keys in dispatch_key_types.ts.
 */

import { z } from 'zod';

/** POST /v1/auth/signup */
export const AuthSignupInput = z.object({
    username: z.string().min(1, 'Username is required').max(40)
        .describe('Username (stored lower-case, max 40)'),
    email: z.string().email('Invalid email format')
        .describe('Email address (stored lower-case)'),
    password: z.string().min(8, 'Password must be at least 8 characters')
        .describe('Password (min 8 characters)'),
});
export type AuthSignupInput = z.infer<typeof AuthSignupInput>;
