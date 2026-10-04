# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: runs_lifecycle.spec.ts >> Runs lifecycle — enqueue claim execute complete >> stub daemon runs a job and SPA shows completed enveloped detail
- Location: e2e/runs_lifecycle.spec.ts:170:5

# Error details

```
error: column "scope_id" of relation "teams" does not exist
```

# Test source

```ts
  48  |             'X-Requested-With': 'XMLHttpRequest',
  49  |         },
  50  |         body: JSON.stringify(body),
  51  |     });
  52  |     const json = await res.json().catch(() => ({})) as Record<string, unknown>;
  53  |     return { status: res.status, json };
  54  | }
  55  | 
  56  | async function start_stub(token: string, daemon_id: string): Promise<Stub_state> {
  57  |     const state: Stub_state = {
  58  |         server: null as unknown as http.Server,
  59  |         url: '',
  60  |         daemon_id,
  61  |         token,
  62  |         offers: 0,
  63  |         executes: [],
  64  |         completed_run_ids: [],
  65  |     };
  66  | 
  67  |     state.server = http.createServer(async (req, res) => {
  68  |         const chunks: Buffer[] = [];
  69  |         for await (const chunk of req) chunks.push(chunk as Buffer);
  70  |         const raw = Buffer.concat(chunks).toString('utf8');
  71  |         const json = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  72  | 
  73  |         if (req.method === 'POST' && req.url === '/v1/offer_job') {
  74  |             state.offers += 1;
  75  |             const queue_item_id = String(json.queue_item_id ?? '');
  76  |             const claim = await hub_post('/v1/runs/claim', state.token, {
  77  |                 queue_item_id,
  78  |                 daemon_id: state.daemon_id,
  79  |             });
  80  |             const claimed = claim.status === 200;
  81  |             res.writeHead(200, { 'Content-Type': 'application/json' });
  82  |             res.end(JSON.stringify({
  83  |                 ok: true,
  84  |                 claimed,
  85  |                 daemon_id: state.daemon_id,
  86  |                 hub_status: claim.status,
  87  |             }));
  88  |             return;
  89  |         }
  90  | 
  91  |         if (req.method === 'POST' && req.url === '/v1/execute') {
  92  |             state.executes.push(json);
  93  |             const run_id = String(json.run_id ?? '');
  94  |             if (run_id) {
  95  |                 // Simulate a successful local run and mirror complete to Hub.
  96  |                 // with_dedup requires tx_id on /v1/runs/complete.
  97  |                 const complete = await hub_post('/v1/runs/complete', state.token, {
  98  |                     tx_id: randomUUID(),
  99  |                     run_id,
  100 |                     state: 'completed',
  101 |                 });
  102 |                 if (complete.status < 200 || complete.status >= 300) {
  103 |                     // Surface Hub reject so the e2e failure is actionable.
  104 |                     res.writeHead(502, { 'Content-Type': 'application/json' });
  105 |                     res.end(JSON.stringify({
  106 |                         ok: false,
  107 |                         error: 'complete_failed',
  108 |                         hub_status: complete.status,
  109 |                         hub_body: complete.json,
  110 |                     }));
  111 |                     return;
  112 |                 }
  113 |                 state.completed_run_ids.push(run_id);
  114 |             }
  115 |             res.writeHead(200, { 'Content-Type': 'application/json' });
  116 |             res.end(JSON.stringify({ ok: true, accepted: true, run_id }));
  117 |             return;
  118 |         }
  119 | 
  120 |         res.writeHead(404);
  121 |         res.end();
  122 |     });
  123 | 
  124 |     await new Promise<void>((resolve) => {
  125 |         state.server.listen(0, '127.0.0.1', () => resolve());
  126 |     });
  127 |     const addr = state.server.address() as AddressInfo;
  128 |     state.url = `http://127.0.0.1:${addr.port}`;
  129 |     return state;
  130 | }
  131 | 
  132 | async function stop_stub(stub: Stub_state): Promise<void> {
  133 |     await new Promise<void>((resolve, reject) => {
  134 |         stub.server.close((err) => (err ? reject(err) : resolve()));
  135 |     });
  136 | }
  137 | 
  138 | async function seed_daemon_team(daemon_id: string): Promise<string> {
  139 |     const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: false });
  140 |     const team_id = randomUUID();
  141 |     const now = Date.now();
  142 |     try {
  143 |         const scope = await pool.query(
  144 |             `SELECT id FROM cliq.scopes WHERE slug = 'cliq' LIMIT 1`,
  145 |         );
  146 |         expect(scope.rows[0]?.id, 'cliq scope missing in e2e DB').toBeTruthy();
  147 |         const scope_id = String(scope.rows[0].id);
> 148 |         await pool.query(
      |         ^ error: column "scope_id" of relation "teams" does not exist
  149 |             `INSERT INTO cliq.teams
  150 |                 (id, daemon_id, scope_id, slug, version, description, manifest, created_at, updated_at)
  151 |              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
  152 |             [
  153 |                 team_id,
  154 |                 daemon_id,
  155 |                 scope_id,
  156 |                 `e2e-run-${team_id.slice(0, 8)}`,
  157 |                 '1.0.0',
  158 |                 'e2e lifecycle team',
  159 |                 MANIFEST,
  160 |                 now,
  161 |             ],
  162 |         );
  163 |         return team_id;
  164 |     } finally {
  165 |         await pool.end();
  166 |     }
  167 | }
  168 | 
  169 | test.describe('Runs lifecycle — enqueue claim execute complete', () => {
  170 |     test('stub daemon runs a job and SPA shows completed enveloped detail', async ({ page }) => {
  171 |         test.setTimeout(120_000);
  172 | 
  173 |         await api_login(page, TEST_USER.username, TEST_USER.password);
  174 |         const realm = await api_create_realm(page, 'e2e-run', 'RunLife');
  175 | 
  176 |         const minted = await expect_api_ok(await api_post(page, '/v1/auth/generate_token', {
  177 |             type: 'realm',
  178 |             name: `e2e-daemon-${Date.now()}`,
  179 |             realm_ids: [realm.id],
  180 |         }));
  181 |         const mint_data = (minted.data ?? minted) as { token?: string };
  182 |         expect(mint_data.token, `token missing: ${JSON.stringify(minted)}`).toBeTruthy();
  183 |         const daemon_token = String(mint_data.token);
  184 | 
  185 |         const daemon_id = `e2e-d-${randomUUID().slice(0, 8)}`;
  186 |         const stub = await start_stub(daemon_token, daemon_id);
  187 |         try {
  188 |             const registered = await hub_post('/v1/daemons/register', daemon_token, {
  189 |                 realm_id: realm.id,
  190 |                 daemon_id,
  191 |                 hostname: 'e2e-stub',
  192 |                 public_url: stub.url,
  193 |                 name: 'e2e-stub-daemon',
  194 |                 port: Number(new URL(stub.url).port),
  195 |             });
  196 |             expect(
  197 |                 registered.status,
  198 |                 `register failed: ${registered.status} ${JSON.stringify(registered.json)}`,
  199 |             ).toBe(200);
  200 |             expect(registered.json.ok).toBe(true);
  201 | 
  202 |             const hb = await hub_post('/v1/daemons/heartbeat', daemon_token, { daemon_id });
  203 |             expect(hb.status, `heartbeat failed: ${JSON.stringify(hb.json)}`).toBe(200);
  204 | 
  205 |             const team_id = await seed_daemon_team(daemon_id);
  206 |             const workspace_path = `/tmp/e2e-run-${randomUUID().slice(0, 8)}`;
  207 |             const run_name = `e2e-lifecycle-${Date.now()}`;
  208 | 
  209 |             const enqueue_body = await expect_api_ok(await api_post(page, '/v1/runs/enqueue', {
  210 |                 realm_id: realm.id,
  211 |                 team_id,
  212 |                 workspace_path,
  213 |                 manifest_yaml: MANIFEST,
  214 |                 run_name,
  215 |                 payload: {
  216 |                     team_id,
  217 |                     workspace_path,
  218 |                     manifest_yaml: MANIFEST,
  219 |                     run_name,
  220 |                 },
  221 |             }));
  222 |             const enqueue_data = (enqueue_body.data ?? enqueue_body) as {
  223 |                 item?: { run_id?: string; status?: string; claimed_by?: string };
  224 |                 run_id?: string;
  225 |             };
  226 |             const run_id = String(
  227 |                 enqueue_data.item?.run_id
  228 |                 ?? enqueue_data.run_id
  229 |                 ?? '',
  230 |             );
  231 |             expect(run_id, `enqueue did not create run: ${JSON.stringify(enqueue_body)}`).toBeTruthy();
  232 |             expect(stub.offers).toBeGreaterThanOrEqual(1);
  233 | 
  234 |             // Outbox delivers /v1/execute; stub completes the run.
  235 |             await expect.poll(async () => {
  236 |                 const body = await expect_api_ok(await api_post(page, '/v1/runs/get_by_id', { run_id }));
  237 |                 const run = (body.data ?? body.run ?? body) as { state?: string; run_id?: string };
  238 |                 return run.state ?? '';
  239 |             }, { timeout: 45_000 }).toBe('completed');
  240 | 
  241 |             expect(stub.executes.length).toBeGreaterThanOrEqual(1);
  242 |             expect(stub.completed_run_ids).toContain(run_id);
  243 | 
  244 |             const detail_api = await expect_api_ok(await api_post(page, '/v1/runs/get_by_id', { run_id }));
  245 |             expect(detail_api).toHaveProperty('data');
  246 |             expect(detail_api).not.toHaveProperty('run');
  247 |             const run_data = detail_api.data as { run_id: string; state: string; run_name?: string | null };
  248 |             expect(run_data.run_id).toBe(run_id);
```