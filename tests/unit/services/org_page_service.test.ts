import { describe, it, expect, vi } from 'vitest';
import { OrgPageService } from '../../../src/services/org_page_service.js';

describe('OrgPageService', () => {
    it('composes org, invites and permissions', async () => {
        const core = { post: vi.fn(async (p: string) => {
            if (p === '/v1/orgs/get_by_id') return { ok: true, data: { id: 'o1', members: [], roles: [], scopes: [] } };
            if (p === '/v1/invitations/get') return { ok: true, data: { invites: [{ id: 'i1', email: 'k@x' }] } };
            return { ok: true, data: { permissions: ['org.settings'], owner_only: ['org.settings'] } };
        }) } as any;
        const dto = await new OrgPageService(core).page('tok', { org_id: 'o1' });
        expect(dto).toEqual({ org: { id: 'o1', members: [], roles: [], scopes: [] }, invites: [{ id: 'i1', email: 'k@x' }], permissions: { all: ['org.settings'], owner_only: ['org.settings'] }, partial: false });
        expect(core.post.mock.calls.find((c: any[]) => c[0] === '/v1/invitations/get')[1]).toMatchObject({ target_type: 'org', org_id: 'o1' });
    });
    it('invites/permissions failing leaves the page usable (partial)', async () => {
        const core = { post: vi.fn(async (p: string) => { if (p === '/v1/orgs/get_by_id') return { ok: true, data: { id: 'o1' } }; throw new Error('403'); }) } as any;
        const dto = await new OrgPageService(core).page('tok', { org_id: 'o1' });
        expect(dto).toMatchObject({ invites: null, permissions: null, partial: true });
    });
    it('the org itself failing fails the page', async () => {
        const core = { post: vi.fn(async () => { throw new Error('404'); }) } as any;
        await expect(new OrgPageService(core).page('tok', { org_id: 'o1' })).rejects.toThrow('404');
    });
});
