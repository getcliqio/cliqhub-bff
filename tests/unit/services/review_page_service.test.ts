import { describe, it, expect, vi } from 'vitest';
import { ReviewPageService, review_phase_outputs } from '../../../src/services/review_page_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

const review = { id: 'rv1', payload: { mode: 'verdict' }, artifacts: [] };

describe('ReviewPageService', () => {
    it('returns the review directly when the caller is a reviewer', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: review })) } as any;
        const orgs = { get: vi.fn() } as any;
        const dto = await new ReviewPageService(new CoreReadRepository(core), orgs).get({ review_id: 'rv1' }, 'tok');
        expect(dto).toEqual({ review, org_id: null, phase_outputs: [] });
        expect(orgs.get).not.toHaveBeenCalled();
    });

    it('falls back to each of the caller’s orgs on 403', async () => {
        const core = { post_body: vi.fn(async (_p: string, b: any) => {
            if (b.org_id === 'o2') return { ok: true, data: review };
            throw new ApiError('forbidden', 'nope', 403);
        }) } as any;
        const orgs = { get: vi.fn(async () => ({ orgs: [{ id: 'o1' }, { id: 'o2' }] })) } as any;
        const dto = await new ReviewPageService(new CoreReadRepository(core), orgs).get({ review_id: 'rv1' }, 'tok');
        expect(dto.org_id).toBe('o2');
        expect(core.post_body.mock.calls.map((c: any[]) => c[1].org_id)).toEqual([undefined, 'o1', 'o2']);
    });

    it('rethrows the original error when no org works; other errors pass through', async () => {
        const core = { post_body: vi.fn(async () => { throw new ApiError('forbidden', 'nope', 403); }) } as any;
        const orgs = { get: vi.fn(async () => ({ orgs: [{ id: 'o1' }] })) } as any;
        await expect(new ReviewPageService(new CoreReadRepository(core), orgs).get({ review_id: 'rv1' }, 'tok')).rejects.toMatchObject({ status: 403 });
        const boom = { post_body: vi.fn(async () => { throw new ApiError('internal', 'x', 500); }) } as any;
        await expect(new ReviewPageService(new CoreReadRepository(boom), orgs).get({ review_id: 'rv1' }, 'tok')).rejects.toMatchObject({ status: 500 });
    });
});

describe('review_phase_outputs', () => {
    it('reads the packet\'s phase output records for display; files and documents are left out', () => {
        const out = review_phase_outputs({
            artifacts: [
                { id: 'r1', source: 'record', kind: 'output', phase: 'draft', name: 'phase_output', content: JSON.stringify({ text: 'PASS: Approved by human reviewer' }), content_preview: '' },
                { id: 'r2', source: 'record', kind: 'review', phase: 'draft', name: 'plan.md', content: '# Plan', content_preview: '# Plan' },
                { id: 'file:f1', source: 'file', artifact_id: 'f1', kind: 'file', phase: 'draft', name: 'qa.json', content: '', content_preview: '' },
            ],
        });
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ artifact_id: 'r1', phase: 'draft', complete: true });
        expect(out[0]!.view.verdict).toEqual({ outcome: 'PASS', reason: 'Approved by human reviewer' });
    });
});

