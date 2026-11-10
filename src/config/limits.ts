/**
 * Request limits the BFF enforces itself (not read from the environment).
 */

/** Public "Forgot password" (`users/reset_password { email }`): requests per client address. Core limits per email. */
export const FORGOT_PASSWORD_PER_ADDRESS = { limit: 10, window_ms: 60 * 60 * 1000 } as const;

/** Hug bundle files per address (the content route; PLAN-hug-widgets §11.2). Browsers cache them for a year. */
export const HUG_CONTENT_PER_ADDRESS = { limit: 600, window_ms: 60 * 1000 } as const;
