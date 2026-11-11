import { describe, it, expect, vi } from 'vitest';
import { HugPageService } from '../../../src/services/hug_page_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';
import { HugContentService } from '../../../src/services/hug_content_service.js';

const hug = { hug_id: 'h1', run_id: 'r1', title: 'Approve', status: 'open', responses: [] };
const RUN = { run_id: 'r1', run_name: 'quiet-amber-heron', state: 'awaiting_input', team_label: '@cliq/hello-world', team_version: '2.0.0',
    phases: [{ name: 'greet', type: 'standard', agent: 'exec', status: 'completed', depends_on: [] }, { name: 'human-review', type: 'gate', agent: 'hug', status: 'awaiting_input', depends_on: ['greet'] }] };

describe('HugPageService', () => {
    it('reads the Hug from Core with the caller token', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok');
        expect(dto).toEqual({ hug, content_url: null, run: null, rounds: [] });
        expect(core.post_body.mock.calls[0][0]).toBe('/v1/hugs/get_by_id');
        expect(core.post_body.mock.calls[0][1]).toEqual({ hug_id: 'h1' });
    });

    it("adds the Hug's run — team, version and each phase's status — for the workflow graph", async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const run_workflow = vi.fn(async () => RUN);
        const dto = await new HugPageService(new CoreReadRepository(core), run_workflow).get({ hug_id: 'h1' }, 'tok');
        expect(run_workflow).toHaveBeenCalledWith('r1', 'tok');
        expect(dto).toEqual({ hug, content_url: null, run: RUN, rounds: [] });
    });

    it('a run that cannot be read leaves the page with the Hug alone (run: null)', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core), async () => { throw new ApiError('not_found', 'Run not found', 404); }).get({ hug_id: 'h1' }, 'tok');
        expect(dto).toEqual({ hug, content_url: null, run: null, rounds: [] });
    });

    it("the rounds of the Hug's phase, oldest first, with who answered what before this one (e2e 2026-11-10)", async () => {
        const round2 = { id: 'h2', run_id: 'r1', phase: 'review', status: 'open', responses: [] };
        const round1 = { id: 'h1', run_id: 'r1', phase: 'review', status: 'closed', responses: [
            { responder: { name: 'Elan' }, summary: 'Rejected', values: { decision: 'reject', reason: "I don't like it" }, responded_at: '2026-11-10T21:55:33Z' },
        ] };
        const core = { post_body: vi.fn(async (path: string, body: { hug_id?: string }) => {
            if (path === '/v1/hugs/get') return { ok: true, data: { items: [
                { hug_id: 'h1', phase: 'review', iteration: 0, status: 'closed', outcome: 'Rejected by Elan', created_at: 1, closed_at: 2 },
                { hug_id: 'x', phase: 'greet', iteration: 0, status: 'closed', outcome: null, created_at: 1, closed_at: 2 },
                { hug_id: 'h2', phase: 'review', iteration: 1, status: 'open', outcome: null, created_at: 3, closed_at: null },
            ] } };
            return { ok: true, data: body.hug_id === 'h1' ? round1 : round2 };
        }) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h2' }, 'tok');
        expect(core.post_body.mock.calls.find((c: unknown[]) => c[0] === '/v1/hugs/get')![1]).toEqual({ run_id: 'r1', limit: 100 });
        expect(dto.rounds).toEqual([
            { hug_id: 'h1', round: 1, status: 'closed', outcome: 'Rejected by Elan', created_at: 1, closed_at: 2, current: false,
                answers: [{ responder: 'Elan', summary: 'Rejected', note: "I don't like it", responded_at: '2026-11-10T21:55:33Z' }] },
            { hug_id: 'h2', round: 2, status: 'open', outcome: null, created_at: 3, closed_at: null, current: true, answers: [] },
        ]);
    });

    it('a phase that asks again in the same iteration (follow-up questions) counts each ask as a round (e2e: all read "Round 1")', async () => {
        const core = { post_body: vi.fn(async (path: string, body: { hug_id?: string }) => {
            if (path === '/v1/hugs/get') return { ok: true, data: { items: ['a', 'b', 'c'].map((id) => ({ hug_id: id, phase: 'follow-up', iteration: 0, status: id === 'c' ? 'open' : 'closed' })) } };
            return { ok: true, data: { id: body.hug_id, run_id: 'r1', phase: 'follow-up', status: 'open', responses: [] } };
        }) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'c' }, 'tok');
        expect(dto.rounds!.map((r) => [r.hug_id, r.round, r.current])).toEqual([['a', 1, false], ['b', 2, false], ['c', 3, true]]);
    });

    it('a single round, or a failed rounds read, gives no rounds — the page still shows', async () => {
        const core = { post_body: vi.fn(async (path: string) => {
            if (path === '/v1/hugs/get') throw new ApiError('bad_request', 'old Core', 400);
            return { ok: true, data: { ...hug, id: 'h1', phase: 'review' } };
        }) } as any;
        expect((await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok')).rounds).toEqual([]);
    });

    it('hug() reads the Hug only (the run page uses it — no run read)', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const run_workflow = vi.fn(async () => RUN);
        expect(await new HugPageService(new CoreReadRepository(core), run_workflow).hug({ hug_id: 'h1' }, 'tok')).toEqual(hug);
        expect(run_workflow).not.toHaveBeenCalled();
    });

    it("Core's refusal (no runs.view on the realm) passes through", async () => {
        const core = { post_body: vi.fn(async () => { throw new ApiError('forbidden', 'nope', 403); }) } as any;
        await expect(new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok')).rejects.toMatchObject({ status: 403 });
    });

    describe('content_url — where the page frames the hug', () => {
        const SHA = 'c'.repeat(64);
        /** Core's get_file as a proxy: `files` by path; calls counted. */
        const proxy = (files: Record<string, string>) => {
            const calls: string[] = [];
            return {
                calls,
                repo: { hug_bundle_file: vi.fn(async (_sha: string, path: string) => {
                    calls.push(path);
                    return files[path] !== undefined ? new Response(files[path], { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 });
                }) } as any,
            };
        };
        const page = async (h: Record<string, unknown>, content: HugContentService) => {
            const core = { post_body: vi.fn(async () => ({ ok: true, data: h })) } as any;
            return (await new HugPageService(new CoreReadRepository(core), null, content).get({ hug_id: 'h1' }, 'tok')).content_url;
        };
        const ON = ['https://content.test', 'https://hub.test'] as const;

        it("the bundle's entry (from hug.json, default index.html) on the content origin", async () => {
            const p = proxy({ 'hug.json': JSON.stringify({ name: 'review-batch', entry: 'app/start page.html' }) });
            expect(await page({ ...hug, hug: { name: 'review-batch', sha256: SHA } }, new HugContentService(p.repo, ...ON)))
                .toBe(`https://content.test/hb/${SHA}/app/start%20page.html`);
            const q = proxy({ 'hug.json': JSON.stringify({ name: 'form' }) });
            expect(await page({ ...hug, hug: { name: 'form', sha256: SHA } }, new HugContentService(q.repo, ...ON))).toBe(`https://content.test/hb/${SHA}/index.html`);
        });

        it('null — the fallback view — for a pre-hug Hug, a gone bundle or no content origin; an unsafe entry falls back to index.html', async () => {
            const p = proxy({});
            expect(await page({ ...hug, hug: null }, new HugContentService(p.repo, ...ON))).toBeNull();
            expect(await page({ ...hug, hug: { name: 'x', sha256: SHA } }, new HugContentService(p.repo, ...ON))).toBeNull();
            const bad = proxy({ 'hug.json': JSON.stringify({ entry: '../escape.html' }) });
            expect(await page({ ...hug, hug: { name: 'x', sha256: SHA } }, new HugContentService(bad.repo, ...ON))).toBe(`https://content.test/hb/${SHA}/index.html`);
            const off = proxy({ 'hug.json': '{}' });
            expect(await page({ ...hug, hug: { name: 'x', sha256: SHA } }, new HugContentService(off.repo, null, 'https://hub.test'))).toBeNull();
            expect(off.calls).toEqual([]);
        });
    });
});
