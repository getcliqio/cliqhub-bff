import { describe, it, expect, vi } from 'vitest';
import { ReviewPageService } from '../../../src/services/review_page_service.js';
import { ApiError } from '../../../src/repositories/api_error.js';

const review = { id: 'rv1', payload: { mode: 'verdict' }, artifacts: [] };

describe('ReviewPageService', () => {
    it('returns the review directly when the caller is a reviewer', async () => {
        const core = { post: vi.fn(async () => ({ ok: true, data: review })) } as any;
        const orgs = { get: vi.fn() } as any;
        const dto = await new ReviewPageService(core, orgs).page('tok', { review_id: 'rv1' });
        expect(dto).toEqual({ review, org_id: null });
        expect(orgs.get).not.toHaveBeenCalled();
    });

    it('falls back to each of the caller’s orgs on 403', async () => {
        const core = { post: vi.fn(async (_p: string, b: any) => {
            if (b.org_id === 'o2') return { ok: true, data: review };
            throw new ApiError('forbidden', 'nope', 403);
        }) } as any;
        const orgs = { get: vi.fn(async () => ({ orgs: [{ id: 'o1' }, { id: 'o2' }] })) } as any;
        const dto = await new ReviewPageService(core, orgs).page('tok', { review_id: 'rv1' });
        expect(dto.org_id).toBe('o2');
        expect(core.post.mock.calls.map((c: any[]) => c[1].org_id)).toEqual([undefined, 'o1', 'o2']);
    });

    it('rethrows the original error when no org works; other errors pass through', async () => {
        const core = { post: vi.fn(async () => { throw new ApiError('forbidden', 'nope', 403); }) } as any;
        const orgs = { get: vi.fn(async () => ({ orgs: [{ id: 'o1' }] })) } as any;
        await expect(new ReviewPageService(core, orgs).page('tok', { review_id: 'rv1' })).rejects.toMatchObject({ status: 403 });
        const boom = { post: vi.fn(async () => { throw new ApiError('internal', 'x', 500); }) } as any;
        await expect(new ReviewPageService(boom, orgs).page('tok', { review_id: 'rv1' })).rejects.toMatchObject({ status: 500 });
    });
});
