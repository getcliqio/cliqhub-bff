import { describe, it, expect, vi } from 'vitest';
import { HugPageService } from '../../../src/services/hug_page_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

const hug = { hug_id: 'h1', run_id: 'r1', title: 'Approve', status: 'open', responses: [] };
const RUN = { run_id: 'r1', run_name: 'quiet-amber-heron', state: 'awaiting_input', team_label: '@cliq/hello-world', team_version: '2.0.0',
    phases: [{ name: 'greet', type: 'standard', agent: 'exec', status: 'completed', depends_on: [] }, { name: 'human-review', type: 'gate', agent: 'hug', status: 'awaiting_input', depends_on: ['greet'] }] };

describe('HugPageService', () => {
    it('reads the Hug from Core with the caller token', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok');
        expect(dto).toEqual({ hug, run: null });
        expect(core.post_body.mock.calls[0][0]).toBe('/v1/hugs/get_by_id');
        expect(core.post_body.mock.calls[0][1]).toEqual({ hug_id: 'h1' });
    });

    it("adds the Hug's run — team, version and each phase's status — for the workflow graph", async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const run_workflow = vi.fn(async () => RUN);
        const dto = await new HugPageService(new CoreReadRepository(core), run_workflow).get({ hug_id: 'h1' }, 'tok');
        expect(run_workflow).toHaveBeenCalledWith('r1', 'tok');
        expect(dto).toEqual({ hug, run: RUN });
    });

    it('a run that cannot be read leaves the page with the Hug alone (run: null)', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core), async () => { throw new ApiError('not_found', 'Run not found', 404); }).get({ hug_id: 'h1' }, 'tok');
        expect(dto).toEqual({ hug, run: null });
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
});
