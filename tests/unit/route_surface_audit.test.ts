/**
 * Regression audit: every /v1 path the Hub SPA + platform clients need must be
 * registered on the BFF. Dead routes used to fall through to the SPA shell.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CONTROL_PLANE_PASSTHROUGH_PATHS } from '../../src/lib/control_plane_routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo_root = path.resolve(here, '../../../..');
const bff_app = path.join(repo_root, 'services/bff/src/app.ts');
const spa_src = path.join(repo_root, 'src');

function list_files(dir: string): string[] {
	const out: string[] = [];
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'node_modules' || entry.name === 'dist') continue;
			out.push(...list_files(full));
			continue;
		}
		if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
	}
	return out;
}

function extract_v1_paths(text: string): string[] {
	const paths = new Set<string>();
	for (const match of text.matchAll(/['"`](\/v1\/[A-Za-z0-9_./-]+)['"`]/g)) {
		paths.add(match[1]);
	}
	return [...paths];
}

describe('BFF route surface audit', () => {
	it('registers every /v1 path referenced by the Hub SPA', () => {
		const app_src = fs.readFileSync(bff_app, 'utf8');
		const registered = new Set(extract_v1_paths(app_src));
		for (const p of CONTROL_PLANE_PASSTHROUGH_PATHS) registered.add(p);

		// Daemon-side command outbox endpoint identifiers that appear as
		// string literals in the SPA for display/matching, not as fetch targets.
		const NON_FETCH_ENDPOINT_IDS = new Set([
			'/v1/cancel',
			'/v1/resume',
			'/v1/execute',
			// Slice 2 deleted these BFF session routes; SPA migrates in Slice 3.
			'/v1/auth/login',
			'/v1/auth/logout',
			'/v1/auth/me',
			'/v1/auth/impersonate',
			'/v1/auth/impersonate/exit',
		]);

		const ui_paths = new Set<string>();
		for (const file of list_files(spa_src)) {
			if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
			for (const p of extract_v1_paths(fs.readFileSync(file, 'utf8'))) {
				if (!NON_FETCH_ENDPOINT_IDS.has(p)) ui_paths.add(p);
			}
		}

		const missing = [...ui_paths].filter((p) => !registered.has(p)).sort();
		expect(missing, `SPA calls unregistered BFF routes:\n${missing.join('\n')}`).toEqual([]);
	});

	it('serves JSON 404 for unknown /v1 routes (not SPA HTML)', () => {
		const app_src = fs.readFileSync(bff_app, 'utf8');
		expect(app_src).toContain("app.use('/v1'");
		expect(app_src).toContain('Unknown API route');
	});

	it('passthrough covers control-plane daemons, realms, dispatch, events', () => {
		for (const route of [
			'/v1/daemons/get_by_id',
			'/v1/realms/update',
			'/v1/realms/delete',
			'/v1/realms/get_members',
			'/v1/realms/add_member',
			'/v1/realms/remove_member',
			'/v1/realms/add_team',
			'/v1/realms/remove_team',
			'/v1/realms/a2a',
			'/v1/runs/enqueue',
			'/v1/teams/install',
			'/v1/teams/uninstall',
			'/v1/auth/get_dispatch_public_key',
			'/v1/auth/rotate_dispatch_key',
			'/v1/events/submit',
			'/v1/sync/ingest',
			'/v1/runs/get',
			'/v1/notification_channels/create',
			'/v1/account/mesh/get',
			'/v1/orgs/mesh/get',
		]) {
			expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain(route);
		}
		for (const dropped of [
			'/v1/workspaces/upsert_by_path',
			'/v1/workspaces/add_team',
			'/v1/workspaces/remove_team',
			'/v1/workspaces/get_by_path',
			'/v1/workspaces/teams/get',
			'/v1/workspaces/count_by_team',
			'/v1/daemons/teams/get',
			'/v1/daemons/workspaces/get',
			'/v1/daemons/outbox/status',
			'/v1/daemons/outbox/inspect',
			'/v1/daemons/outbox/retry',
			'/v1/daemons/outbox/purge',
			'/v1/realms/remove',
			'/v1/realms/a2a/get',
			'/v1/realms/team-list/sync',
			'/v1/realms/grant',
			'/v1/realms/revoke',
			'/v1/realms/get_by_slug',
			'/v1/realms/search_users',
			'/v1/dispatch/poll',
			'/v1/dispatch/keys/backfill',
			'/v1/dispatch/verify_token',
			'/v1/dispatch/init',
			'/v1/dispatch/assemble',
			'/v1/dispatch/unbind',
			'/v1/dispatch/cancel',
			'/v1/dispatch/resume',
			'/v1/dispatch/force_terminate',
			'/v1/dispatch/supply_inputs',
			'/v1/dispatch/run',
			'/v1/dispatch/enqueue',
			'/v1/dispatch/claim',
			'/v1/dispatch/queue/get_by_id',
			'/v1/dispatch/install',
			'/v1/dispatch/uninstall',
			'/v1/dispatch/query/teams',
			'/v1/dispatch/query/workspaces',
			'/v1/dispatch/keys/public',
			'/v1/dispatch/keys/rotate',
			'/v1/dispatch/tokens/mint',
			// Runs hard-cut: unused Hub verbs (daemon-local / superseded by ingest+SSE+search)
			'/v1/runs/get_by_name',
			'/v1/runs/resolve',
			'/v1/runs/queue/get_by_id',
			'/v1/runs/restart',
			'/v1/runs/set_current_pid',
			'/v1/runs/clear_current_pid',
			'/v1/runs/crash_stale',
			'/v1/runs/delete_by_workspace',
			'/v1/runs/events/append',
			'/v1/runs/events/get',
			'/v1/runs/events/count',
			'/v1/runs/events/delete',
			'/v1/runs/logs/get',
			'/v1/runs/logs/chunks',
			'/v1/runs/logs/purge',
			'/v1/runs/logs/delete',
			'/v1/runs/logs/size',
			'/v1/runs/phases/create_many',
			'/v1/runs/phases/get',
			'/v1/runs/phases/update_status',
			'/v1/runs/phases/get_by_id',
			'/v1/runs/phases/reset',
			'/v1/runs/phases/delete',
			'/v1/runs/artifacts/get',
			'/v1/runs/artifacts/delete',
			'/v1/runs/artifacts/append_handoff',
			'/v1/runs/spans/stream',
			'/v1/runs/set_inputs',
			'/v1/runs/set_awaiting_input',
			'/v1/runs/resume_from_phase',
			'/v1/runs/reconcile',
			'/v1/runs/force_terminate',
			'/v1/runs/events/ingest',
			'/v1/logs',
			'/v1/telemetry',
			'/v1/runs/logs/append',
			'/v1/runs/logs/search',
			'/v1/runs/usage/snapshot',
			'/v1/runs/usage/get',
			'/v1/runs/traces/ingest',
			'/v1/runs/spans/get',
			'/v1/runs/telemetry/summary',
			'/v1/commands/ack',
		]) {
			expect(CONTROL_PLANE_PASSTHROUGH_PATHS).not.toContain(dropped);
		}
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/daemons/ack_command');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/append_logs');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/get_logs');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/report_telemetry');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/get_telemetry');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/report_activity');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/get_status');
		expect(CONTROL_PLANE_PASSTHROUGH_PATHS).toContain('/v1/runs/update_status');
	});

	it('registers control-plane passthrough loop in app.ts', () => {
		const app_src = fs.readFileSync(bff_app, 'utf8');
		expect(app_src).toContain('CONTROL_PLANE_PASSTHROUGH_PATHS');
		expect(app_src).toContain('hub_passthrough');
	});
});
