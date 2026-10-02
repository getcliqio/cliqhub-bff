import { describe, it, expect } from 'vitest';
import { SlidingWindowLimiter } from '../../../src/lib/sliding_window_limiter.js';

const HOUR = 60 * 60 * 1000;

function limiter(limit = 3) {
    let now = 1_000_000;
    const l = new SlidingWindowLimiter(limit, HOUR, () => now);
    return { l, tick: (ms: number) => { now += ms; } };
}

describe('SlidingWindowLimiter', () => {
    it('allows up to the limit per key, then refuses with the time until a slot frees', () => {
        const { l, tick } = limiter();
        expect(l.hit('a').allowed).toBe(true);
        tick(10 * 60 * 1000);
        expect(l.hit('a').allowed).toBe(true);
        expect(l.hit('a').allowed).toBe(true);
        const refused = l.hit('a');
        expect(refused).toEqual({ allowed: false, retry_after_ms: HOUR - 10 * 60 * 1000 });
        expect(l.hit('b').allowed).toBe(true);
    });

    it('slides: a hit leaves the window an hour after it was made, not at a bucket edge', () => {
        const { l, tick } = limiter(2);
        l.hit('a');
        tick(30 * 60 * 1000);
        l.hit('a');
        tick(29 * 60 * 1000);
        expect(l.hit('a').allowed).toBe(false);
        tick(60 * 1000 + 1);
        expect(l.hit('a').allowed).toBe(true);
        expect(l.hit('a').allowed).toBe(false);
    });

    it('refused hits are not counted', () => {
        const { l, tick } = limiter(1);
        l.hit('a');
        for (let i = 0; i < 5; i++) { tick(1000); expect(l.hit('a').allowed).toBe(false); }
        tick(HOUR - 5000 + 1);
        expect(l.hit('a').allowed).toBe(true);
    });

    it('drops keys with no hit in the window', () => {
        const { l, tick } = limiter();
        l.hit('a');
        l.hit('b');
        tick(HOUR + 1);
        l.hit('c');
        expect(l.size).toBe(1);
    });
});
