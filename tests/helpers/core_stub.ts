/**
 * Core over `fetch` for contract tests: each Core path answers with a fixed
 * status + JSON body (or a function of the request), and every call is
 * recorded with its body and headers. The real CoreClient, error translation
 * and session wiring run unchanged.
 */

import { vi } from 'vitest';

/** One recorded Core call. */
export interface CoreCall {
    path: string;
    body: Record<string, unknown>;
    headers: Record<string, string>;
}

/** What a stubbed Core path answers. */
export interface CoreReply {
    status?: number;
    json: unknown;
}

/** Core success envelope. */
export function ok(data: unknown): CoreReply {
    return { status: 200, json: { ok: true, data } };
}

/** Core error envelope `{ ok: false, error: { code, message, details? } }`. */
export function fail(status: number, code: string, message: string, details?: Record<string, unknown>): CoreReply {
    return { status, json: { ok: false, error: { code, message, ...(details ? { details } : {}) } } };
}

/**
 * Stubs `fetch` with `routes` (Core path → reply). An unlisted path fails the
 * test with a 599 so a missing stub is obvious.
 */
export function stub_core(routes: Record<string, CoreReply | ((call: CoreCall) => CoreReply)>): CoreCall[] {
    const calls: CoreCall[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
        const path = new URL(String(input)).pathname;
        const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
        const call: CoreCall = { path, body: init?.body ? JSON.parse(String(init.body)) : {}, headers };
        calls.push(call);
        const route = routes[path];
        const reply = typeof route === 'function' ? route(call) : route ?? { status: 599, json: { ok: false, error: { code: 'unstubbed', message: path } } };
        return new Response(JSON.stringify(reply.json), { status: reply.status ?? 200, headers: { 'content-type': 'application/json' } });
    });
    return calls;
}

/** Core answers for a password sign-in of `username` (authenticate_user → session PAT). */
export function sign_in_routes(user_id: string, username: string, token: string): Record<string, CoreReply> {
    return {
        '/internal/auth/authenticate_user': ok({
            user: {
                id: user_id, username, display_name: username, email: `${username}@example.test`, role: 'user',
                suspended_at: null, suspended_reason: '', created_at: '2026-10-02', preferences: {},
            },
            token, scopes: [username], org_slugs: [username],
            default_realm_id: null, default_realm_slug: null, default_realm_qualified: null, enroll_token: null,
            orgs: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', slug: username, name: username, default_realm_slug: 'default' }],
        }),
    };
}

/** Core answers that turn a session PAT into an identity (validate_token → get_by_id → get_scopes). */
export function identity_routes(user_id: string, username: string): Record<string, CoreReply> {
    return {
        '/v1/auth/validate_token': ok({ valid: true, type: 'user', user_id }),
        '/v1/users/get_by_id': ok({
            id: user_id, username, display_name: username, email: `${username}@example.test`, role: 'user',
            suspended_at: null, suspended_reason: '', created_at: '2026-10-02T10:00:00.000Z', status: 'active', deleted_at: null,
            scope_count: 1, team_count: 0, token_count: 1, draft_count: 0,
            orgs: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'measureone', display_name: 'MeasureOne', role: 'member' }],
            preferences: {},
        }),
        '/v1/orgs/get_scopes': ok({ items: [{ slug: username }], total: 1, offset: 0, limit: 100 }),
    };
}
