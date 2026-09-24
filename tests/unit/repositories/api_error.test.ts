import { describe, it, expect } from 'vitest';
import { ApiError, status_for_code } from '../../../src/repositories/api_error.js';

describe('ApiError', () => {
    it('stores code, message, and status', () => {
        const err = new ApiError('not_found', 'Team not found', 404);
        expect(err.code).toBe('not_found');
        expect(err.message).toBe('Team not found');
        expect(err.status).toBe(404);
        expect(err.name).toBe('ApiError');
        expect(err instanceof Error).toBe(true);
    });
});

describe('status_for_code', () => {
    it('maps known codes to correct HTTP status', () => {
        expect(status_for_code('unauthorized')).toBe(401);
        expect(status_for_code('forbidden')).toBe(403);
        expect(status_for_code('not_found')).toBe(404);
        expect(status_for_code('conflict')).toBe(409);
        expect(status_for_code('invalid_params')).toBe(422);
        expect(status_for_code('rate_limited')).toBe(429);
    });

    it('returns 500 for unknown codes', () => {
        expect(status_for_code('some_unknown_thing')).toBe(500);
    });
});
