/**
 * Team-files upload through the BFF (PLAN-team-bundle S1.3b): the multipart body goes to Core's
 * /v1/teams/files/upload unread; one declared over 11 MB is refused before Core is called.
 */
import { describe, expect, it, vi } from 'vitest';
import { ProxyService } from '../../../src/services/proxy_service.js';

describe('ProxyService.upload_team_files', () => {
    it('passes the body and headers to Core unread', async () => {
        const answer = new Response('{"ok":true}', { status: 201 });
        const repo = { upload_team_files: vi.fn().mockResolvedValue(answer) };
        const body = (async function* () { yield new Uint8Array([1, 2, 3]); })();
        const headers = { 'content-type': 'multipart/form-data; boundary=x', 'content-length': '3', authorization: 'Bearer t' };
        const out = await new ProxyService(repo as never).upload_team_files(body, headers);
        expect(out).toBe(answer);
        expect(repo.upload_team_files).toHaveBeenCalledWith(body, headers);
    });

    it('refuses a body declared over 11 MB with 413, without calling Core', async () => {
        const repo = { upload_team_files: vi.fn() };
        const big = { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(11 * 1024 * 1024 + 1) };
        await expect(new ProxyService(repo as never).upload_team_files((async function* () {})(), big)).rejects.toMatchObject({ status: 413 });
        expect(repo.upload_team_files).not.toHaveBeenCalled();
    });
});
