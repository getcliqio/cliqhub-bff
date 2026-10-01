import { describe, it, expect, vi } from 'vitest';
import { RealmDaemonsService } from '../../../src/services/realm_daemons_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const d = (id: string, status: string, hb: number, over: Record<string, unknown> = {}) => ({ id, name: id, hostname: `${id}.local`, user_email: 'a@b.c', status, last_heartbeat: hb, capacity: 4, ...over });
function mocks() {
    return {
        control: {
            realm_by_slug: vi.fn().mockResolvedValue({ id: 'r1', slug: 'prod', name: 'Prod', org_slug: 'acme' }),
            realm_daemons: vi.fn().mockResolvedValue({ items: [d('old', 'offline', 1), d('ci-1', 'online', 50), d('gpu', 'stale', 30), d('mbp', 'online', 90)], total: 4 }),
            runs: vi.fn().mockResolvedValue({ items: [{ run_id: 'a', daemon_id: 'mbp', state: 'running' }, { run_id: 'b', daemon_id: 'mbp', state: 'awaiting_input' }, { run_id: 'c', daemon_id: 'ci-1', state: 'running' }], total: 3 }),
        },
        teams: { get: vi.fn().mockResolvedValue({ ok: true, data: { items: [
            { in_team_list: true, installed_daemon_ids: ['mbp', 'ci-1'] },
            { in_team_list: true, installed_daemon_ids: ['mbp'] },
            { in_team_list: false, installed_daemon_ids: ['gpu'] },
        ], total: 3 } }) },
    };
}

describe('RealmDaemonsService', () => {
    it('status counts, sort online first, running and teams ready per daemon', async () => {
        const m = mocks();
        const dto = await new RealmDaemonsService(m.control as any, m.teams as any).get('tok', { org_slug: 'acme', slug: 'prod' });
        expect(m.control.realm_daemons).toHaveBeenCalledWith('r1', 200, 'tok');
        expect(dto.counts).toEqual({ all: 4, online: 2, stale: 1, offline: 1 });
        expect(dto.items.map((x) => x.id)).toEqual(['mbp', 'ci-1', 'gpu', 'old']);
        expect(dto.items[0]).toMatchObject({ running: 2, teams_ready: 2 });
        expect(dto.items[1]).toMatchObject({ running: 1, teams_ready: 1 });
        // Teams not on the realm list don't count.
        expect(dto.items[2].teams_ready).toBe(0);
        expect(dto.teams_total).toBe(2);
        expect(dto.partial).toBe(false);
    });

    it('filters by status and search; coverage failing → unknown, partial', async () => {
        const m = mocks();
        m.teams.get.mockRejectedValue(new ApiError('upstream', 'x', 502));
        const dto = await new RealmDaemonsService(m.control as any, m.teams as any).get('tok', { org_slug: 'acme', slug: 'prod', status: 'online', q: 'CI' });
        expect(dto.items.map((x) => x.id)).toEqual(['ci-1']);
        expect(dto.items[0].teams_ready).toBeNull();
        expect(dto.partial).toBe(true);
        m.control.realm_daemons.mockRejectedValue(new ApiError('forbidden', 'no', 403));
        await expect(new RealmDaemonsService(m.control as any, m.teams as any).get('tok', { org_slug: 'acme', slug: 'prod' })).rejects.toMatchObject({ status: 403 });
    });
});
