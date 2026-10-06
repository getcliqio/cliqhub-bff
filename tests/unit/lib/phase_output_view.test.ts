/**
 * to_phase_output_view — the shapes real phase outputs take (prod sample,
 * 2026-10-06), each read into what the run page shows.
 */

import { describe, expect, it } from 'vitest';

import { to_phase_output_view } from '../../../src/lib/phase_output_view.js';

const out = (text: string, data?: unknown) => JSON.stringify(data === undefined ? { text } : { text, data });

describe('to_phase_output_view', () => {
    it('exec results: commands with readable labels, string values read as numbers / booleans', () => {
        const v = to_phase_output_view(out('## Exec Results\n\nPASS set -e (exit 0)', {
            total: '2', failed: '1', all_passed: 'false',
            results: [
                { name: 'set -e\nmkdir -p .cliq\npython3 -c "import', pass: 'true', exit_code: '0', duration_ms: '277' },
                { name: 'set -e\npython3 - <<\'PY\'', pass: 'false', exit_code: '1', duration_ms: '281' },
            ],
        }));
        expect(v.kind).toBe('commands');
        expect(v.summary).toBe('1 of 2 commands failed');
        expect(v.commands!.items[0]).toEqual({ label: 'python3 -c "import', command: 'set -e\nmkdir -p .cliq\npython3 -c "import', pass: true, exit_code: 0, duration_ms: 277 });
        expect(v.commands!.items[1]!.pass).toBe(false);
    });

    it('unwraps data given as [{ outputs: … }]', () => {
        const v = to_phase_output_view(out('## Exec Results\n\nPASS echo (exit 0)', [{ outputs: {
            total: '3', failed: '0', all_passed: 'true',
            results: ['echo', 'ls', 'date'].map((name) => ({ name, pass: 'true', exit_code: '0', duration_ms: '6' })),
        } }]));
        expect(v.kind).toBe('commands');
        expect(v.summary).toBe('All 3 commands passed');
    });

    it('tool results: the summary line and sources with links', () => {
        const v = to_phase_output_view(out('## Jira Results\n\n✓ Issue tree ABC-1: Add 1099-R support (type=Epic, children=29)', {
            action: 'get_issue_tree',
            sources: { 'ticket.json': { key: 'ABC-1', url: 'https://example.atlassian.net/browse/ABC-1', type: 'issue_tree', status: 'In Progress' } },
        }));
        expect(v.kind).toBe('tool');
        expect(v.summary).toBe('✓ Issue tree ABC-1: Add 1099-R support (type=Epic, children=29)');
        expect(v.body_markdown).not.toContain('## Jira Results');
        expect(v.sources).toEqual([{ name: 'ticket.json', detail: 'ABC-1 · issue tree · In Progress', url: 'https://example.atlassian.net/browse/ABC-1' }]);
    });

    it('a tool source without an http link has none', () => {
        const v = to_phase_output_view(out('## GitNexus scope\n\n✓ scope scope.json repos=11', [{ action: 'scope', sources: { 'scope.json': { file: '/tmp/ws/scope.json', count: 17, repos: 11 } } }]));
        expect(v.kind).toBe('tool');
        expect(v.sources[0]).toEqual({ name: 'scope.json', detail: '11 repos · 17 items', url: null });
    });

    it('a human gate verdict', () => {
        const v = to_phase_output_view(out('PASS: Approved by human reviewer', [{ outputs: {} }]));
        expect(v.kind).toBe('verdict');
        expect(v.verdict).toEqual({ outcome: 'PASS', reason: 'Approved by human reviewer' });
    });

    it('agent prose: narration folded into steps, the answer as markdown, gate_verdict as a verdict', () => {
        const text = [
            "I'll read the prompt file you pointed to and follow its instructions.",
            "I'll run the assemble-list script and then copy its verdict block into the reply unchanged.",
            'QA list assembled: 24 cases written to `qa-list.json`. HUG may review.',
            '',
            '```gate_verdict',
            '{"outcome": "PASS", "reason": "24 cases, all traced to AC"}',
            '```',
        ].join('\n');
        const v = to_phase_output_view(out(text, [{ outputs: {} }]));
        expect(v.kind).toBe('agent');
        expect(v.steps).toHaveLength(2);
        expect(v.body_markdown).toBe('QA list assembled: 24 cases written to `qa-list.json`. HUG may review.');
        expect(v.summary).toBe('QA list assembled: 24 cases written to `qa-list.json`.');
        expect(v.verdict).toEqual({ outcome: 'PASS', reason: '24 cases, all traced to AC' });
    });

    it('sub-team: a link to the sub-run and one line per sub-phase', () => {
        const text = '[fetch-ticket] ## Exec Results\n\nFAIL set -e (exit 1)\n\n[notes] Wrote the notes file.';
        const v = to_phase_output_view(out(text, {
            team_ref: 'acme/jira-ingest', sub_run_id: 'run-sub-1',
            'fetch-ticket': { total: '1', failed: '1', all_passed: 'false', results: [{ name: 'set -e', pass: 'false', exit_code: '1', duration_ms: '281' }] },
        }));
        expect(v.kind).toBe('sub_team');
        expect(v.sub_run).toEqual({
            run_id: 'run-sub-1', team_ref: 'acme/jira-ingest',
            phases: [
                { phase: 'fetch-ticket', ok: false, summary: '1 of 1 command failed' },
                { phase: 'notes', ok: null, summary: 'Wrote the notes file.' },
            ],
        });
        expect(v.summary).toBe('Ran acme/jira-ingest — 1 phase failed');
    });

    it('exec results with empty data: commands read from the text, multi-line commands included', () => {
        const text = '## Exec Results\n\nPASS set -e\nmkdir -p .cliq\nmissing=""\n[ -f pl (exit 0)\nFAIL make test (exit 2)';
        const v = to_phase_output_view(out(text, [{ outputs: {} }]));
        expect(v.kind).toBe('commands');
        expect(v.summary).toBe('1 of 2 commands failed');
        expect(v.commands!.items.map((i) => [i.label, i.pass, i.exit_code])).toEqual([['missing="" · [ -f pl', true, 0], ['make test', false, 2]]);
    });

    it('agent messages logged line by line: narration as steps, the final message as the answer', () => {
        const text = [
            "I'll read that prompt file first so I know exactly what you want done.",
            'Assemble errors are absent, so I’ll pull ticket AC and the LLD drafts next.',
            'Ticket AC is empty, so I’m drafting from LLD observables only.',
            'QA list is drafted from LLD only (ticket AC is empty). Written to `.cliq/qa-draft.json`.',
            '',
            '**24 cases** across the two stories.',
            '',
            '| Job | alone |',
            '|---|---|',
            '| tech-1 | p1–p14 |',
        ].join('\n');
        const v = to_phase_output_view(out(text, [{ outputs: {} }]));
        expect(v.kind).toBe('agent');
        expect(v.steps).toHaveLength(3);
        expect(v.summary).toBe('QA list is drafted from LLD only (ticket AC is empty).');
        expect(v.body_markdown).toContain('| tech-1 | p1–p14 |');
    });

    it('a markdown document is not split into steps', () => {
        const v = to_phase_output_view(out('# LLD\nGroup A covers parsing.\n\n## Risks\nNone known.'));
        expect(v.steps).toEqual([]);
        expect(v.body_markdown).toBe('# LLD\nGroup A covers parsing.\n\n## Risks\nNone known.');
    });

    it('anything else: text as is, JSON that is not the envelope pretty-printed', () => {
        expect(to_phase_output_view('plain words').body_markdown).toBe('plain words');
        const v = to_phase_output_view('{"foo": 1}');
        expect(v.kind).toBe('text');
        expect(v.body_markdown).toContain('"foo": 1');
        expect(to_phase_output_view(null).summary).toBe('No output recorded');
        expect(to_phase_output_view('{ broken').body_markdown).toBe('{ broken');
    });
});
