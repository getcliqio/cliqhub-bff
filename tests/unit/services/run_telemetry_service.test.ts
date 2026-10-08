import { describe, it, expect, vi } from 'vitest';
import { RunTelemetryService, union_ms } from '../../../src/services/run_telemetry_service.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';
import { ApiError } from '../../../src/errors/api_error.js';

const M = 60_000;
const t0 = 1_700_000_000_000;
const ns = (ms: number) => String(BigInt(ms) * 1000000n);
const span = (name: string, s: number, e: number | null, attrs: Record<string, unknown>, status = 'OK') => ({ span_id: `${name}-${attrs['agent.name'] ?? attrs['phase.name']}-${s}`, name, status_code: status, start_unix_nano: ns(t0 + s * M), end_unix_nano: e === null ? '0' : ns(t0 + e * M), attributes: attrs });
const SPANS = [
    span('run.execute', 0, 64, {}),
    span('phase.execute', 0, 6, { 'phase.name': 'plan', 'phase.type': 'standard' }),
    span('agent.execute', 0, 6, { 'phase.name': 'plan', 'agent.name': 'architect', 'usage.agent_kind': 'llm', 'usage.model': 'sonnet', 'usage.provider': 'anthropic', 'usage.unit_kind': 'tokens', 'usage.units_in': 100, 'usage.units_out': 10, 'usage.external_calls': 5, 'usage.extras.cache_read_tokens': 60, 'usage.outcome': 'success' }),
    span('phase.execute', 6, 44, { 'phase.name': 'review', 'phase.type': 'standard' }),
    span('agent.execute', 6, 44, { 'phase.name': 'review', 'agent.name': 'hug', 'usage.agent_kind': 'gate', 'usage.outcome': 'success' }),
    span('phase.execute', 44, 50, { 'phase.name': 'check', 'phase.type': 'GATE', 'gate.outcome': 'fail' }),
    span('agent.execute', 44, 50, { 'phase.name': 'check', 'agent.name': 'lint', 'usage.agent_kind': 'gate', 'usage.outcome': 'failure' }, 'ERROR'),
    span('phase.execute', 52, 60, { 'phase.name': 'check', 'phase.type': 'GATE', 'gate.outcome': 'pass' }),
    span('agent.execute', 52, 60, { 'phase.name': 'check', 'agent.name': 'lint', 'usage.agent_kind': 'gate', 'usage.model': 'haiku', 'usage.unit_kind': 'tokens', 'usage.units_in': 30, 'usage.units_out': 3, 'usage.outcome': 'success' }),
    span('agent.execute', 60, 62, { 'phase.name': 'pr', 'agent.name': 'github', 'usage.agent_kind': 'connector', 'usage.unit_kind': 'calls', 'usage.units_in': 6, 'usage.outcome': 'success' }),
];
const USAGE = { run: { total_tokens_in: 130, total_tokens_out: 13, total_cost_usd: 2.5, total_llm_calls: 7, by_phase: { plan: { tokens_in: 100, tokens_out: 10, by_model: { s: { model: 'sonnet', cost_usd: 2 } } }, check: { tokens_in: 30, tokens_out: 3, by_model: { h: { model: 'haiku', cost_usd: 0.5 } } } }, by_model: { s: { model: 'sonnet', provider: 'anthropic', llm_calls: 5, tokens_in: 100, tokens_out: 10, cost_usd: 2 }, h: { model: 'haiku', provider: 'anthropic', llm_calls: 2, tokens_in: 30, tokens_out: 3, cost_usd: 0.5 } } }, phases: [] };
const PHASES = [['plan', 0, 6], ['review', 6, 44], ['check', 44, 60], ['pr', 60, 62]].map(([phase, s, e], i) => ({ phase: phase as string, status: 'completed', sequence: i + 1, started_at: t0 + (s as number) * M, completed_at: t0 + (e as number) * M }));

function make(opts: { spans?: unknown; usage?: unknown; fail?: string[]; realm_fail?: boolean; children?: Record<string, any[]>; child_spans?: Record<string, unknown>; child_phases?: Record<string, unknown[]> } = {}) {
    const core = { post_body: vi.fn(async (p: string, b: any) => {
        if (opts.fail?.includes(p + (b.kind ?? ''))) throw new Error('boom');
        if (p === '/v1/runs/get_telemetry' && b.run_id !== 'r1') return { ok: true, data: opts.child_spans?.[b.run_id] ?? [] };
        if (p === '/v1/runs/get_telemetry') return { ok: true, data: b.kind === 'usage' ? (opts.usage ?? USAGE) : (opts.spans ?? SPANS) };
        if (p === '/v1/teams/get_phases') return { ok: true, data: { phases: [{ name: 'plan', type: 'standard' }, { name: 'review', agent: 'hug' }, { name: 'check', type: 'gate', depends_on: ['plan', 'review'] }, { name: 'pr', depends_on: ['check'] }] } };
        throw new Error(p);
    }) } as any;
    const control = {
        run_by_id: vi.fn(async () => ({ run_id: 'r1', state: 'completed', realm_id: 'realm1', team_id: 't1', team_version_id: 'v1', started_at: t0, completed_at: t0 + 64 * M })),
        realm_by_id: vi.fn(async () => { if (opts.realm_fail) throw Object.assign(new Error('forbidden'), { status: 403 }); return { id: 'realm1' }; }),
        run_phases: vi.fn(async (id: string) => (id === 'r1' ? PHASES : opts.child_phases?.[id] ?? [])),
        child_runs: vi.fn(async (id: string) => ({ items: opts.children?.[id] ?? [], total: 0 })),
    } as any;
    return { svc: new RunTelemetryService(new CoreReadRepository(core), control), core, control };
}

describe('union_ms', () => {
    it('merges overlaps', () => { expect(union_ms([[0, 10], [5, 15], [20, 25], [30, 30]])).toBe(20); });
});

describe('RunTelemetryService', () => {
    it('composes totals, phases, bars, models and agents', async () => {
        const { svc, core } = make();
        const d = await svc.get({ run_id: 'r1' }, 'tok');
        expect(core.post_body.mock.calls.find((c: any[]) => c[0] === '/v1/teams/get_phases')[1]).toEqual({ team_id: 't1', version_id: 'v1' });
        expect(d.totals).toMatchObject({ duration_ms: 64 * M, cost_usd: 2.5, tokens_in: 130, tokens_out: 13, cached_in: 60, model_calls: 7, agent_runs: 5, reworks: 1 });
        expect(d.totals.time).toEqual({ working_ms: 6 * M, people_ms: 38 * M, gates_ms: 14 * M, other_ms: 2 * M, queued_ms: 4 * M });
        const byname = Object.fromEntries(d.phases.map((p) => [p.name, p]));
        expect(byname.review.kind).toBe('human');
        expect(byname.check).toMatchObject({ kind: 'gate', runs: 2, gate_outcome: 'pass', cost_usd: 0.5, depends_on: ['plan', 'review'] });
        expect(byname.plan).toMatchObject({ cost_usd: 2, tokens_in: 100, duration_ms: 6 * M });
        const lint = d.bars.filter((b) => b.agent === 'lint');
        expect(lint.map((b) => [b.status, b.run_index])).toEqual([['error', 1], ['ok', 2]]);
        expect(d.bars.find((b) => b.agent === 'architect')).toMatchObject({ cost_usd: 2, cost_estimated: true, cached_in: 60, calls: 5 });
        expect(d.by_model.map((m) => m.model)).toEqual(['sonnet', 'haiku']);
        expect(d.by_agent[0]).toMatchObject({ agent: 'architect', cost_usd: 2 });
        expect(d.by_agent.find((a) => a.agent === 'lint')).toMatchObject({ runs: 2, failures: 1 });
        expect(d.sections).toEqual({ usage: 'ok', spans: 'ok', phases: 'ok', workflow: 'ok' });
    });

    it('a sub-team run nests under the phase that started it, with its own steps, bars and failure', async () => {
        const child = { run_id: 'c1', run_name: 'solar-lilac-fox', team_label: '@acme/design-lld', state: 'failed', parent_phase: 'review',
            error: "Phase 'hug-lld' failed: Gate 'hug-lld' escalated: Review timed out after 30m", started_at: t0 + 6 * M, completed_at: t0 + 44 * M };
        const { svc } = make({
            children: { r1: [child], c1: [] },
            child_phases: { c1: [{ phase: 'draft', status: 'done', sequence: 0, started_at: t0 + 6 * M, completed_at: t0 + 10 * M },
                { phase: 'hug-lld', status: 'failed', sequence: 1, started_at: t0 + 10 * M, completed_at: t0 + 44 * M }] },
            child_spans: { c1: [
                span('agent.execute', 6, 10, { 'phase.name': 'draft', 'agent.name': 'cursor', 'usage.agent_kind': 'llm', 'usage.outcome': 'success' }),
                span('phase.execute', 10, 44, { 'phase.name': 'hug-lld' }, 'ERROR'),
                span('agent.execute', 10, 44, { 'phase.name': 'hug-lld', 'agent.name': 'hug' }),
            ] },
        });
        const d = await svc.get({ run_id: 'r1' }, 'tok');
        const review = d.phases.find((p) => p.name === 'review')!;
        expect(review.sub_runs).toHaveLength(1);
        const sub = review.sub_runs![0];
        expect(sub).toMatchObject({ run_id: 'c1', team: '@acme/design-lld', state: 'failed', error: expect.stringContaining('timed out') });
        expect(sub.phases.map((p) => [p.name, p.status])).toEqual([['draft', 'done'], ['hug-lld', 'failed']]);
        expect(sub.bars.map((b) => [b.phase, b.agent, b.kind])).toEqual([['draft', 'cursor', 'llm'], ['hug-lld', 'hug', 'human']]);
        // The parent's own lanes, bars and totals are unchanged by the sub-team.
        expect(d.phases.filter((p) => p.sub_runs).map((p) => p.name)).toEqual(['review']);
        expect(d.bars.some((b) => b.phase === 'draft')).toBe(false);
        expect(d.totals.agent_runs).toBe(5);
    });

    it('sub-teams that cannot be read are left out, not fatal', async () => {
        const { svc, control } = make();
        control.child_runs.mockRejectedValueOnce(new Error('boom'));
        const d = await svc.get({ run_id: 'r1' }, 'tok');
        expect(d.phases.every((p) => !p.sub_runs)).toBe(true);
        expect(d.partial).toBe(false);
    });

    it('a run whose team_id is an install id gets its workflow from the published team (@scope/name)', async () => {
        const { svc, core, control } = make();
        control.run_by_id.mockResolvedValue({ run_id: 'r1', state: 'completed', realm_id: 'realm1', team_id: 'install-1', team_label: '@measureone/qa', started_at: t0, completed_at: t0 + 64 * M });
        const base = core.post_body.getMockImplementation();
        core.post_body.mockImplementation(async (p: string, b: any) => {
            if (p === '/v1/teams/get_phases' && b.team_id === 'install-1') throw new ApiError('not_found', 'Team not found', 404);
            if (p === '/v1/teams/get_by_id') return { ok: true, data: { id: 'catalog-qa' } };
            return base!(p, b);
        });
        const dto = await svc.get({ run_id: 'r1' }, 'tok', t0 + 64 * M);
        expect(core.post_body.mock.calls.find((c: any[]) => c[0] === '/v1/teams/get_by_id')[1]).toEqual({ scope: 'measureone', name: 'qa' });
        expect(core.post_body.mock.calls.filter((c: any[]) => c[0] === '/v1/teams/get_phases').map((c: any[]) => c[1].team_id)).toEqual(['install-1', 'catalog-qa']);
        expect(dto.sections.workflow?.status ?? 'ok').toBe('ok');
    });

    it('no telemetry yet: phases from status rows, empty sections, not partial', async () => {
        const { svc } = make({ spans: [], usage: { run: null, phases: [] } });
        const d = await svc.get({ run_id: 'r1' }, 'tok');
        expect(d.bars).toEqual([]);
        expect(d.phases.map((p) => p.name)).toEqual(['plan', 'review', 'check', 'pr']);
        expect(d.totals.cost_usd).toBeNull();
        expect(d.sections).toMatchObject({ usage: 'empty', spans: 'empty' });
        expect(d.partial).toBe(false);
    });

    it('a failing telemetry read is partial, not fatal', async () => {
        const { svc } = make({ fail: ['/v1/runs/get_telemetryspans'] });
        const d = await svc.get({ run_id: 'r1' }, 'tok');
        expect(d).toMatchObject({ partial: true, sections: { spans: 'error', usage: 'ok' } });
    });

    it('realm gate: no access to the realm → no telemetry', async () => {
        const { svc, core } = make({ realm_fail: true });
        await expect(svc.get({ run_id: 'r1' }, 'tok')).rejects.toThrow('forbidden');
        expect(core.post_body).not.toHaveBeenCalled();
    });
});
