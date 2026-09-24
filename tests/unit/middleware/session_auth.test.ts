import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    create_session_auth,
    require_session,
} from '../../../src/middleware/session_auth.js';

function make_req(
    cookies: Record<string, string> = {},
    headers: Record<string, string> = {},
): any {
    return { cookies, headers, session_data: undefined };
}

function make_res() {
    const res: any = {
        status_code: 0,
        body: null,
        status(code: number) {
            res.status_code = code;
            return res;
        },
        json(obj: unknown) {
            res.body = obj;
            return res;
        },
    };
    return res;
}

const MOCK_SESSION = {
    session_id: 'sid-123',
    user_id: 1,
    act_as_user_id: 1,
    username: 'alice',
    email: 'alice@test.com',
    role: 'user' as const,
    actor_role: 'user' as const,
    actor_username: 'alice',
    user_token: 'cliq_tok_user',
    target_token: 'cliq_tok_user',
    scopes_json: '[]',
    org_slugs_json: '[]',
    created_at: Math.floor(Date.now() / 1000),
    last_active: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
};

describe('create_session_auth', () => {
    const mock_store = {
        find: vi.fn(),
        touch: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        mock_store.touch.mockResolvedValue(undefined);
    });

    it('attaches session_data when valid cookie exists', async () => {
        mock_store.find.mockResolvedValue(MOCK_SESSION);
        const mw = create_session_auth(mock_store as any, 'sid');
        const req = make_req({ sid: 'sid-123' });
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(req.session_data).toEqual(MOCK_SESSION);
        expect(mock_store.touch).toHaveBeenCalledWith('sid-123');
        expect(next).toHaveBeenCalled();
    });

    it('does not attach session_data when no cookie and no Bearer', async () => {
        const mw = create_session_auth(mock_store as any, 'sid');
        const req = make_req();
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(req.session_data).toBeUndefined();
        expect(mock_store.find).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('does not accept Hub session JWTs as Bearer', async () => {
        const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
            username: 'sapan',
            exp: Math.floor(Date.now() / 1000) + 3600,
        })).toString('base64url');
        const token = `${header}.${payload}.sig`;
        const mw = create_session_auth(mock_store as any, 'sid');
        const req = make_req({}, { authorization: `Bearer ${token}` });
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(req.session_data).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('uses hydrate_bearer for opaque PATs', async () => {
        const hydrated = {
            ...MOCK_SESSION,
            session_id: 'bearer:pat:1',
            user_token: 'cliq_tok_x',
            target_token: 'cliq_tok_x',
        };
        const hydrate = vi.fn().mockResolvedValue(hydrated);
        const mw = create_session_auth(mock_store as any, 'sid', hydrate);
        const req = make_req({}, { authorization: 'Bearer cliq_tok_x' });
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(hydrate).toHaveBeenCalledWith('cliq_tok_x');
        expect(req.session_data).toEqual(hydrated);
        expect(next).toHaveBeenCalled();
    });

    it('prefers cookie session over Bearer when both present', async () => {
        mock_store.find.mockResolvedValue(MOCK_SESSION);
        const hydrate = vi.fn();
        const mw = create_session_auth(mock_store as any, 'sid', hydrate);
        const req = make_req(
            { sid: 'sid-123' },
            { authorization: 'Bearer cliq_tok_other' },
        );
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(req.session_data).toEqual(MOCK_SESSION);
        expect(hydrate).not.toHaveBeenCalled();
    });

    it('does not attach session_data when session not found', async () => {
        mock_store.find.mockResolvedValue(null);
        const mw = create_session_auth(mock_store as any, 'sid');
        const req = make_req({ sid: 'expired' });
        const next = vi.fn();

        await mw(req, make_res(), next);

        expect(req.session_data).toBeUndefined();
        expect(mock_store.touch).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
});

describe('require_session', () => {
    it('calls next when session exists', () => {
        const req = make_req();
        req.session_data = MOCK_SESSION;
        const res = make_res();
        const next = vi.fn();

        require_session(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('returns 401 when no session', () => {
        const req = make_req();
        const res = make_res();
        const next = vi.fn();

        require_session(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status_code).toBe(401);
        expect(res.body.error.code).toBe('unauthorized');
    });
});
