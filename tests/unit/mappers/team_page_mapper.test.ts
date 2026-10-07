/** to_team_phase_data: a human-review phase's reviewers read as names, never "[object Object]". */
import { describe, it, expect } from 'vitest';

import { to_team_phase_data } from '../../../src/mappers/team_page_mapper.js';

const reviewers_of = (review: unknown) => to_team_phase_data({ name: 'hug-lld', type: 'gate', agent: 'hug', review }, new Map())!.reviewers;

describe('to_team_phase_data reviewers', () => {
    it('reads the manifest form [{ policy, channels }]', () => {
        expect(reviewers_of({ reviewers: [{ policy: 'any', channels: ['slack:#design', 'email:lead@acme.test'] }] }))
            .toBe('slack:#design, email:lead@acme.test');
    });

    it('reads plain strings, a single string and the older `reviewer`', () => {
        expect(reviewers_of({ reviewers: ['priya', 'sam'] })).toBe('priya, sam');
        expect(reviewers_of({ reviewers: 'priya' })).toBe('priya');
        expect(reviewers_of({ reviewer: 'sam' })).toBe('sam');
    });

    it('merges groups without repeats, and is null when the run decides', () => {
        expect(reviewers_of({ reviewers: [{ channels: ['a'] }, { channels: ['a', 'b'] }, { name: 'c' }] })).toBe('a, b, c');
        expect(reviewers_of({ reviewers: [{ policy: 'any' }] })).toBeNull();
        expect(reviewers_of({})).toBeNull();
    });
});
