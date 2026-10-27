import { describe, it, expect, vi } from 'vitest';
import { HugPageService } from '../../../src/services/hug_page_service.js';
import { ApiError } from '../../../src/errors/api_error.js';
import { CoreReadRepository } from '../../../src/repositories/core_read_repository.js';

const hug = { hug_id: 'h1', title: 'Approve', status: 'open', responses: [] };

describe('HugPageService', () => {
    it('reads the Hug from Core with the caller token', async () => {
        const core = { post_body: vi.fn(async () => ({ ok: true, data: hug })) } as any;
        const dto = await new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok');
        expect(dto).toEqual({ hug });
        expect(core.post_body.mock.calls[0][0]).toBe('/v1/hugs/get_by_id');
        expect(core.post_body.mock.calls[0][1]).toEqual({ hug_id: 'h1' });
    });

    it("Core's refusal (no runs.view on the realm) passes through", async () => {
        const core = { post_body: vi.fn(async () => { throw new ApiError('forbidden', 'nope', 403); }) } as any;
        await expect(new HugPageService(new CoreReadRepository(core)).get({ hug_id: 'h1' }, 'tok')).rejects.toMatchObject({ status: 403 });
    });
});
