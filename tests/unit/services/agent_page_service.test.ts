import { describe, it, expect, vi } from 'vitest';
import { AgentPageService, group_versions, is_secret, mask } from '../../../src/services/agent_page_service.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const R1 = { id: 'r-prod', slug: 'prod-us', name: 'prod-us' };
const R2 = { id: 'r-eu', slug: 'eu-lenders', name: 'eu-lenders' };
const JIRA = '22222222-2222-4222-8222-222222222222';

const agent = (name: string, over: Record<string, unknown> = {}) => ({ id: `${name}-id`, name, version: '1.0.0', description: `${name} agent`, agent_type: 'connector', is_system: true, created_at: 1, updated_at: 1, used_by: [], ...over });
const settings = (name: string, over: Record<string, unknown> = {}) => ({
	id: `${name}-id`, name, version: '1.0.0', description: null, is_system: true,
	settings: { required: [], optional: [] }, values: {}, source: {}, required_total: 0, required_configured: 0, all_required_configured: true, ...over,
});
const JIRA_DEFS = { required: [{ key: 'base_url' }, { key: 'email' }, { key: 'api_token', secret: true }], optional: [] };

function fake(opts: { usage?: boolean } = {}) {
	const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
	const core = {
		post: vi.fn(async (path: string, body: Record<string, unknown>) => {
			calls.push({ path, body });
			if (path === '/v1/agents/get') {
				const rows = [
					agent('jira', { id: JIRA, version: '1.2.0', used_by: [{ scope: 'acme', name: 'triage', version: '1.0.0', realm_ids: ['r-prod'] }, { scope: 'acme', name: 'digest', version: '2.0.0', realm_ids: ['r-eu'] }] }),
					agent('jira', { id: 'jira-old', version: '1.1.0' }),
					agent('cursor', { agent_type: 'llm', used_by: [{ scope: 'acme', name: 'triage', version: '1.0.0', realm_ids: ['r-prod'] }] }),
					agent('matcher', { agent_type: 'exec', is_system: false }),
				].filter((a) => !body.names || (body.names as string[]).includes(a.name));
				return { ok: true, data: opts.usage === false ? rows.map(({ used_by: _u, ...a }) => a) : rows };
			}
			if (path === '/v1/agents/get_details') return { ok: true, data: agent('jira', { id: JIRA, version: '1.2.0', manifest: { name: 'jira' } }) };
			if (path === '/v1/agents/get_settings') {
				const realm = body.realm_id as string | undefined;
				const jira = settings('jira', {
					id: JIRA, settings: JIRA_DEFS, required_total: 3,
					...(realm === 'r-prod'
						? { values: { base_url: 'https://acme.atlassian.net', email: 'prod@acme.com', api_token: 'ATATT3xFfGF0abcd1234x7Qa' }, source: { base_url: 'org', email: 'realm', api_token: 'realm' }, required_configured: 3, all_required_configured: true }
						: { values: { base_url: 'https://acme.atlassian.net' }, source: { base_url: 'org' }, required_configured: 1, all_required_configured: false }),
				});
				const cursor = settings('cursor', { settings: { required: [{ key: 'api_key' }], optional: [{ key: 'model' }] }, required_total: 1, required_configured: 0, all_required_configured: false });
				const list = [jira, cursor, settings('matcher')];
				return { ok: true, data: body.id ? list.find((x) => x.id === body.id) : list };
			}
			throw new Error(`unexpected ${path}`);
		}),
	};
	const control = {
		realms_page: vi.fn(async () => ({ items: [R1, R2].map((r) => ({ ...r, org_slug: 'acme' })), total: 2 })),
		realm_by_slug: vi.fn(async () => ({ ...R1, org_slug: 'acme' })),
	};
	return { svc: new AgentPageService(core as never, control as never), calls, core, control };
}

describe('helpers', () => {
	it('secret keys and masking', () => {
		expect(is_secret('api_token')).toBe(true);
		expect(is_secret('github.token')).toBe(true);
		expect(is_secret('email')).toBe(false);
		expect(is_secret('webhook', { secret: true })).toBe(true);
		expect(mask('ATATT3xFfGF0abcd1234x7Qa')).toBe('••••x7Qa');
		expect(mask('short')).toBe('••••');
		expect(mask('••••x7Qa')).toBe('••••x7Qa');
	});
	it('group_versions keeps the newest row first', () => {
		const g = group_versions([agent('a', { version: '1.0.0' }), agent('a', { version: '1.10.0', id: 'new' }), agent('b')] as never);
		expect(g.find((x) => x.head.name === 'a')!.head.id).toBe('new');
		expect(g.find((x) => x.head.name === 'a')!.all.map((x) => x.version)).toEqual(['1.10.0', '1.0.0']);
	});
});

describe('AgentPageService.list (org)', () => {
	it('one agent per name, org setup, realm overrides, used by, attention', async () => {
		const { svc, calls } = fake();
		const d = await svc.list('tok', { org_id: ORG });
		expect(calls.find((c) => c.path === '/v1/agents/get')!.body).toEqual({ org_id: ORG, include_manifest: false, include_usage: true });
		expect(d.items.map((i) => i.name)).toEqual(['cursor', 'jira', 'matcher']); // in use + not ready first
		const jira = d.items.find((i) => i.name === 'jira')!;
		expect(jira).toMatchObject({ id: JIRA, version: '1.2.0', versions: ['1.2.0', '1.1.0'], setup: { required_total: 3, required_configured: 1, ready: false }, used_count: 2 });
		expect(jira.overrides).toEqual([{ realm_id: 'r-prod', realm_slug: 'prod-us', keys: ['email', 'api_token'] }]);
		expect(jira.used_by![0]).toEqual({ scope: 'acme', name: 'triage', version: '1.0.0', realms: [{ id: 'r-prod', slug: 'prod-us' }] });
		expect(d.counts).toEqual({ all: 3, needs_setup: 2, in_use: 2, custom: 1, builtin: 2 });
		expect(d.attention).toEqual({ agents: ['cursor', 'jira'], teams: 2 });
		expect(d.realms_checked).toBe(2);
		expect(d.partial).toBe(false);
	});

	it('an older Core (no used_by) → no usage, marked partial', async () => {
		const { svc } = fake({ usage: false });
		const d = await svc.list('tok', { org_id: ORG });
		expect(d.counts.in_use).toBeNull();
		expect(d.attention).toBeNull();
		expect(d.items[0].used_by).toBeNull();
		expect(d.partial).toBe(true);
	});
});

describe('AgentPageService.list (realm)', () => {
	it('uses the realm’s effective setup, its overrides, and teams used here', async () => {
		const { svc, calls, control } = fake();
		const d = await svc.list('tok', { org_id: ORG, realm: { org_slug: 'acme', slug: 'prod-us' } });
		expect(control.realm_by_slug).toHaveBeenCalledWith('acme', 'prod-us', 'tok');
		expect(calls.filter((c) => c.path === '/v1/agents/get_settings').map((c) => c.body)).toEqual([{ org_id: ORG, realm_id: 'r-prod' }]);
		const jira = d.items.find((i) => i.name === 'jira')!;
		expect(jira.setup!.ready).toBe(true);
		expect(jira.overrides).toEqual([{ realm_id: 'r-prod', realm_slug: 'prod-us', keys: ['email', 'api_token'] }]);
		expect(jira.used_count).toBe(1); // digest is only in eu-lenders
		expect(d.realm).toEqual(R1);
		expect(d.attention).toEqual({ agents: ['cursor'], teams: 1 });
	});
});

describe('AgentPageService.page', () => {
	it('org settings: fields with sources; secrets never leave unmasked; overrides card', async () => {
		const { svc } = fake();
		const d = await svc.page('tok', { org_id: ORG, id: JIRA });
		expect(d.agent).toMatchObject({ name: 'jira', version: '1.2.0', versions: [{ version: '1.2.0', newest: true }, { version: '1.1.0', newest: false }] });
		expect(d.settings!.scope).toBe('org');
		expect(d.settings!.fields.map((f) => [f.key, f.set, f.source, f.required])).toEqual([['base_url', true, 'org', true], ['email', false, null, true], ['api_token', false, null, true]]);
		expect(d.overrides).toEqual([{ realm_id: 'r-prod', realm_slug: 'prod-us', keys: ['email', 'api_token'] }]);
		expect(d.used_by!.length).toBe(2);
		expect(d.manifest).toBeNull();
		expect(d.realms).toBeNull();
	});

	it('realm settings: effective values, org value underneath, secret masked', async () => {
		const { svc } = fake();
		const d = await svc.page('tok', { org_id: ORG, id: JIRA, realm: { org_slug: 'acme', slug: 'prod-us' } });
		const f = Object.fromEntries(d.settings!.fields.map((x) => [x.key, x]));
		expect(d.settings).toMatchObject({ scope: 'realm', realm: R1, ready: true });
		expect(f.email).toMatchObject({ value: 'prod@acme.com', source: 'realm', org_value: null });
		expect(f.base_url).toMatchObject({ source: 'org', org_value: 'https://acme.atlassian.net' });
		expect(f.api_token).toMatchObject({ secret: true, value: '••••x7Qa', source: 'realm' });
		expect(JSON.stringify(d)).not.toContain('ATATT3xFfGF0abcd1234x7Qa');
		expect(d.used_by!.map((u) => u.name)).toEqual(['triage']);
	});

	it('realms view: every realm, used ones first, key sources', async () => {
		const { svc } = fake();
		const d = await svc.page('tok', { org_id: ORG, id: JIRA, view: 'realms' });
		expect(d.required_keys).toEqual(['base_url', 'email', 'api_token']);
		expect(d.realms!.map((r) => [r.realm.slug, r.ready, r.used_here])).toEqual([['eu-lenders', false, ['acme/digest']], ['prod-us', true, ['acme/triage']]]);
		expect(d.realms![1].keys).toEqual({ base_url: 'org', email: 'realm', api_token: 'realm' });
		expect(d.realms![0].keys).toEqual({ base_url: 'org', email: 'missing', api_token: 'missing' });
	});

	it('manifest view includes the manifest', async () => {
		const { svc, calls } = fake();
		const d = await svc.page('tok', { org_id: ORG, id: JIRA, view: 'manifest' });
		expect(d.manifest).toEqual({ name: 'jira' });
		expect(calls.find((c) => c.path === '/v1/agents/get_details')!.body).toMatchObject({ include_manifest: true });
	});
});
