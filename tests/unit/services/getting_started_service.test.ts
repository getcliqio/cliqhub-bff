import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GettingStartedService } from '../../../src/services/getting_started_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const ORG = (id: string, slug: string) => ({ id, slug, display_name: slug, role: 'owner', member_count: 1, scope_count: 1 });
const REALM = (id: string, slug: string, total = 0, online = 0) => ({ id, slug, name: slug, daemons: { online, total } });

describe('GettingStartedService', () => {
    const orgs = { get: vi.fn() };
    const dash = { realms: vi.fn(), summary: vi.fn() };
    const control = { runs_for_org: vi.fn() };
    const teams = { get: vi.fn() };
    let svc: GettingStartedService;

    beforeEach(() => {
        vi.resetAllMocks();
        svc = new GettingStartedService(orgs as any, dash as any, control as any, teams as any);
        control.runs_for_org.mockResolvedValue({ items: [], total: 0 });
        teams.get.mockResolvedValue({ total: 0 });
    });

    it('brand-new user: nothing done, no realm to point at', async () => {
        orgs.get.mockResolvedValue({ orgs: [] });
        const dto = await svc.get('tok');
        expect(dto).toMatchObject({ done_count: 0, total: 4, realm: null, partial: false });
        expect(orgs.get).toHaveBeenCalledWith('tok', { mine: true });
    });

    it('daemon enrolled → CLI + daemon done, points at that realm', async () => {
        orgs.get.mockResolvedValue({ orgs: [ORG('o1', 'acme')] });
        dash.realms.mockResolvedValue({ realms: [REALM('r0', 'empty'), REALM('r1', 'prod', 2, 1)] });
        const dto = await svc.get('tok');
        expect(dto.cli.done).toBe(true);
        expect(dto.daemon).toEqual({ done: true, online: 1, total: 2, realm: { org_slug: 'acme', slug: 'prod' } });
        expect(dto.realm).toEqual({ org_slug: 'acme', slug: 'prod' });
        expect(dto.done_count).toBe(2);
        expect(control.runs_for_org).toHaveBeenCalledWith('o1', 'tok', 1);
    });

    it('team found on a realm roster; probes daemon realms first and stops at the first hit', async () => {
        orgs.get.mockResolvedValue({ orgs: [ORG('o1', 'acme')] });
        dash.realms.mockResolvedValue({ realms: [REALM('r0', 'empty'), REALM('r1', 'prod', 1, 1), REALM('r2', 'stage')] });
        teams.get.mockImplementation(async (p: any) => ({ data: { total: p.realm_id === 'r1' ? 3 : 0 } }));
        const dto = await svc.get('tok');
        expect(dto.team).toEqual({ done: true, realm: { org_slug: 'acme', slug: 'prod' } });
        expect(teams.get).toHaveBeenCalledTimes(1);
        expect(teams.get).toHaveBeenCalledWith({ realm_id: 'r1', limit: 1 }, 'tok');
    });

    it('a run anywhere completes the run step (and implies a team)', async () => {
        orgs.get.mockResolvedValue({ orgs: [ORG('o1', 'a'), ORG('o2', 'b')] });
        dash.realms.mockImplementation(async (org_id: string) => ({ realms: org_id === 'o2' ? [REALM('r9', 'lab', 1, 1)] : [] }));
        control.runs_for_org.mockImplementation(async (org_id: string) => ({ items: org_id === 'o2' ? [{ run_id: 'run-1', realm_id: 'r9', state: 'completed' }] : [], total: 0 }));
        const dto = await svc.get('tok');
        expect(dto.run).toEqual({ done: true, run_id: 'run-1', realm: { org_slug: 'b', slug: 'lab' } });
        expect(dto.team.done).toBe(true);
        expect(dto.done_count).toBe(4);
    });

    it('one org failing marks partial but still reports the rest', async () => {
        orgs.get.mockResolvedValue({ orgs: [ORG('o1', 'a'), ORG('o2', 'b')] });
        dash.realms.mockImplementation(async (org_id: string) => {
            if (org_id === 'o1') throw new ApiError('upstream', 'down', 502);
            return { realms: [REALM('r2', 'x', 1, 1)] };
        });
        const dto = await svc.get('tok');
        expect(dto.partial).toBe(true);
        expect(dto.daemon.done).toBe(true);
    });

    it('org list failure fails the call', async () => {
        orgs.get.mockRejectedValue(new ApiError('unauthorized', 'expired', 401));
        await expect(svc.get('tok')).rejects.toMatchObject({ status: 401 });
    });
});
