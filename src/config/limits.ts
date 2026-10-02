/**
 * Request limits the BFF enforces itself (not read from the environment).
 */

/** Public "Forgot password" (`users/reset_password { email }`): requests per client address. Core limits per email. */
export const FORGOT_PASSWORD_PER_ADDRESS = { limit: 10, window_ms: 60 * 60 * 1000 } as const;
