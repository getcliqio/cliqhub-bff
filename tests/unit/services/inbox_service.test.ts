import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InboxService } from '../../../src/services/inbox_service.js';
import { to_merged_inbox_items_data, to_inbox_item_data } from '../../../src/mappers/inbox_mapper.js';
import { ApiError } from '../../../src/errors/api_error.js';

const A = { id: 'o1', slug: 'acme', display_name: 'Acme', role: 'owner', member_count: 1, scope_count: 1 };
const B = { id: 'o2', slug: 'beta', display_name: 'Beta', role: 'member', member_count: 1, scope_count: 1 };
const row = (id: string, at: number, over: Record<string, unknown> = {}) => ({
    id, event: 'run.failed', title: id, message: null, realm_id: 'r1', realm_slug: 'prod', user_id: null,
    team: null, run_id: 'run-1', phase: null, severity: 'error', payload: {}, created_at: at, ...over,
});

function mocks() {
    return {
        orgs: { get: vi.fn().mockResolvedValue({ orgs: [A, B] }) },
        control: {
            notifications: vi.fn().mockImplementation(async (p: { org_id: string }) => (p.org_id === 'o1'
                ? { items: [row('a1', 300), row('shared', 150, { realm_id: null, realm_slug: null })], total: 2 }
                : { items: [row('b1', 200, { realm_id: 'r2', realm_slug: 'dev' }), row('shared', 150, { realm_id: null, realm_slug: null })], total: 2 })),
        },
    };
}

describe('inbox mapper', () => {
    it('promotes review/channel ids from payload and leaves account rows unowned', () => {
        const hug = to_inbox_item_data(row('h', 1, { event: 'hug.review_requested', payload: { review_id: 'rev-9' } }) as any, A as any);
        expect(hug).toMatchObject({ review_id: 'rev-9', org_slug: 'acme', at: 1 });
        const fail = to_inbox_item_data(row('f', 1, { event: 'notification.failed', payload: { channel_id: 'c1', original_event_type: 'run.failed' } }) as any, A as any);
        expect(fail).toMatchObject({ channel_id: 'c1', original_event: 'run.failed' });
        expect(to_inbox_item_data(row('x', 1, { realm_id: null }) as any, A as any).org_id).toBeNull();
    });
    it('merges newest first and dedupes', () => {
        const m = to_merged_inbox_items_data([{ org: A as any, rows: [row('a', 1) as any, row('s', 5) as any] }, { org: B as any, rows: [row('s', 5) as any, row('b', 3) as any] }]);
        expect(m.map((i) => i.id)).toEqual(['s', 'b', 'a']);
    });
});

describe('InboxService.get', () => {
    let m: ReturnType<typeof mocks>;
    let svc: InboxService;
    beforeEach(() => { m = mocks(); svc = new InboxService(m.orgs as any, m.control as any); });

    it('fans out per org as the bearer, merges, tags org', async () => {
        const dto = await svc.get({ types: ['run.failed'], q: 'x', realm_id: 'r1', limit: 10 }, 'tok');
        expect(dto.items.map((i) => [i.id, i.org_slug])).toEqual([['a1', 'acme'], ['b1', 'beta'], ['shared', null]]);
        expect(dto.next_until_ms).toBeNull();
        expect(m.control.notifications).toHaveBeenCalledWith({ org_id: 'o1', realms: ['r1'], types: ['run.failed'], q: 'x', limit: 11 }, 'tok');
        expect(dto.partial).toBe(false);
    });

    it('cuts to limit and returns a cursor', async () => {
        const dto = await svc.get({ limit: 2 }, 'tok');
        expect(dto.items.map((i) => i.id)).toEqual(['a1', 'b1']);
        expect(dto.next_until_ms).toBe(199);
    });

    it('org filter must be a membership', async () => {
        await expect(svc.get({ org_id: 'nope' }, 'tok')).rejects.toMatchObject({ status: 403 });
    });

    it('one org failing flags partial and keeps the rest', async () => {
        m.control.notifications.mockImplementation(async (p: { org_id: string }) => {
            if (p.org_id === 'o2') throw new ApiError('forbidden', 'No', 403);
            return { items: [row('a1', 300)], total: 1 };
        });
        const dto = await svc.get({}, 'tok');
        expect(dto.partial).toBe(true);
        expect(dto.orgs[1]).toMatchObject({ status: 'error', error: 'No' });
        expect(dto.items.map((i) => i.id)).toEqual(['a1']);
    });
});

describe('InboxService.summary', () => {
    it('counts rows newer than seen_ms and returns the latest', async () => {
        const m = mocks();
        const svc = new InboxService(m.orgs as any, m.control as any);
        const s = await svc.summary({ orgs: [A, B] as any, seen_ms: 160 }, 'tok');
        expect(s).toMatchObject({ new_count: 2, capped: false, status: 'ok' });
        expect(s.latest.map((i) => i.id)).toEqual(['a1', 'b1', 'shared']);
        expect(m.control.notifications).toHaveBeenCalledWith({ org_id: 'o1', limit: InboxService.SUMMARY_WINDOW }, 'tok');
    });
    it('caps when a whole window is new', async () => {
        const m = mocks();
        m.control.notifications.mockResolvedValue({ items: Array.from({ length: 20 }, (_, i) => row(`n${i}`, 1000 + i)), total: 99 });
        const s = await new InboxService(m.orgs as any, m.control as any).summary({ orgs: [A] as any, seen_ms: 0 }, 'tok');
        expect(s).toMatchObject({ new_count: 20, capped: true });
        expect(s.latest).toHaveLength(6);
    });
    it('all orgs failing → error, no throw', async () => {
        const m = mocks();
        m.control.notifications.mockRejectedValue(new Error('down'));
        expect(await new InboxService(m.orgs as any, m.control as any).summary({ orgs: [A] as any, seen_ms: 0 }, 'tok')).toMatchObject({ status: 'error', new_count: 0 });
    });
});
