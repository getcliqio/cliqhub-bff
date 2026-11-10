/**
 * HugContentService's cache (PLAN-hug-widgets §5.3, §11.2): bundle files are cached, but a cached file is checked with
 * Core again after ten minutes — a bundle Core has removed stops being served and the Hug page falls back
 * (`content_url` null); while Core can't be reached, the cached copy is still served.
 */
import { describe, expect, it } from 'vitest';

import { HugContentService } from '../../../src/services/hug_content_service.js';

const SHA = 'a'.repeat(64);
const HUG_JSON = JSON.stringify({ name: 'review-batch', entry: 'index.html' });

/** A fake Core: `files` by path (deleting one removes it), every call counted; `down` makes calls throw. */
function fake_core() {
    const state = { files: new Map<string, string>([['hug.json', HUG_JSON], ['index.html', '<!doctype html>']]), calls: 0, down: false };
    const core = {
        async hug_bundle_file(_sha: string, path: string): Promise<Response> {
            state.calls++;
            if (state.down) throw new Error('connect ECONNREFUSED');
            const body = state.files.get(path);
            return body === undefined ? new Response('{"ok":false}', { status: 404 }) : new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
        },
    };
    return { core, state };
}

function service() {
    const { core, state } = fake_core();
    const clock = { now: 1_000_000 };
    const svc = new HugContentService(core as never, 'https://content.test', 'https://hub.test', () => clock.now);
    return { svc, state, clock };
}

describe('HugContentService cache', () => {
    it('serves a cached file without asking Core again, until it is ten minutes old', async () => {
        const { svc, state, clock } = service();
        expect((await svc.file(SHA, 'index.html'))?.body.toString()).toBe('<!doctype html>');
        await svc.file(SHA, 'index.html');
        expect(state.calls).toBe(1);
        clock.now += 10 * 60 * 1000;
        await svc.file(SHA, 'index.html');
        expect(state.calls).toBe(2);
    });

    it('a bundle Core removed: after the recheck nothing is served and content_url is null (the fallback view)', async () => {
        const { svc, state, clock } = service();
        expect(await svc.content_url({ name: 'review-batch', sha256: SHA })).toBe(`https://content.test/hb/${SHA}/index.html`);
        expect(await svc.file(SHA, 'index.html')).not.toBeNull();
        state.files.clear();                       // Core's sweep removed the bundle
        clock.now += 11 * 60 * 1000;
        expect(await svc.content_url({ name: 'review-batch', sha256: SHA })).toBeNull();
        expect(await svc.file(SHA, 'index.html')).toBeNull();
    });

    it('while Core can\'t be reached, a cached file is still served; with nothing cached the error goes up', async () => {
        const { svc, state, clock } = service();
        await svc.file(SHA, 'index.html');
        state.down = true;
        clock.now += 11 * 60 * 1000;
        expect((await svc.file(SHA, 'index.html'))?.body.toString()).toBe('<!doctype html>');
        await expect(svc.file(SHA, 'hug.json')).rejects.toThrow(/ECONNREFUSED/);
    });
});
