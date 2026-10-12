import { describe, it, expect } from 'vitest';
import { to_run_row } from '../../../src/mappers/realm_runs_mapper.js';
import type { ControlRunVO } from '../../../src/types/core/control.js';

/** A minimal Core run with all optional fields populated. */
function core_run(overrides: Partial<ControlRunVO> & { team_version?: string } = {}): ControlRunVO {
    return {
        run_id: 'r1',
        run_name: 'nightly',
        team_label: '@acme/qa',
        team_id: 't1',
        state: 'completed',
        current_phase: 'build',
        daemon_id: 'd1',
        origin: 'hub',
        team_version: 'v3.0',
        started_at: 1000,
        completed_at: 2000,
        last_updated_at: 1500,
        error: 'oops',
        ...overrides,
    } as ControlRunVO;
}

describe('to_run_row', () => {
    it('maps all fields from a fully populated Core run', () => {
        const row = to_run_row(core_run());
        expect(row).toEqual({
            run_id: 'r1',
            run_name: 'nightly',
            team: '@acme/qa',
            state: 'completed',
            current_phase: 'build',
            daemon_id: 'd1',
            origin: 'hub',
            version: 'v3.0',
            started_at: 1000,
            completed_at: 2000,
            updated_at: 1500,
            error: 'oops',
        });
    });

    it('maps origin → origin and team_version → version as strings', () => {
        const row = to_run_row(core_run({ origin: 'cli', team_version: 'v1.2' } as any));
        expect(row.origin).toBe('cli');
        expect(row.version).toBe('v1.2');
    });

    it('origin defaults to null when missing or non-string', () => {
        /** No origin field at all. */
        const without = core_run();
        delete (without as any).origin;
        expect(to_run_row(without).origin).toBeNull();

        /** Non-string origin (numeric). */
        expect(to_run_row(core_run({ origin: 123 } as any)).origin).toBeNull();
    });

    it('version defaults to null when team_version is missing or non-string', () => {
        /** No team_version field. */
        const without = core_run();
        delete (without as any).team_version;
        expect(to_run_row(without).version).toBeNull();

        /** Non-string team_version (boolean). */
        expect(to_run_row(core_run({ team_version: true } as any)).version).toBeNull();
    });

    it('optional text fields fall back to null', () => {
        const sparse = core_run({
            run_name: undefined,
            team_label: undefined,
            team_id: undefined,
            current_phase: undefined,
            daemon_id: undefined,
            started_at: undefined,
            completed_at: undefined,
            last_updated_at: undefined,
            error: undefined,
        });
        delete (sparse as any).origin;
        delete (sparse as any).team_version;
        const row = to_run_row(sparse);
        expect(row.run_name).toBeNull();
        expect(row.team).toBeNull();
        expect(row.current_phase).toBeNull();
        expect(row.daemon_id).toBeNull();
        expect(row.origin).toBeNull();
        expect(row.version).toBeNull();
        expect(row.started_at).toBeNull();
        expect(row.completed_at).toBeNull();
        expect(row.updated_at).toBeNull();
        expect(row.error).toBeNull();
    });
});
