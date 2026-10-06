/**
 * Phase output view — a phase's stored output (`run_artifacts`, kind `output`)
 * read into what the run page shows: a one-line summary plus the parts that
 * apply (commands, sources, verdict, sub-team, the agent's answer).
 *
 * The stored output is the SDK envelope `{ text, data?, artifacts? }` as JSON.
 * What real teams write (prod sample, 2026-10-06):
 *   - exec phases: `## Exec Results` + data `{ total, failed, results[], all_passed }`
 *   - tool phases (Jira, GitNexus): `## … Results` / `## GitNexus scope` + data `{ action, sources }`
 *   - agent phases: prose (narration lines, the answer, maybe a ```gate_verdict block)
 *   - human gates: `PASS: Approved by human reviewer`
 *   - sub-team phases: `[phase] …` blocks + data `{ team_ref, sub_run_id, <phase>: … }`
 * `data` is an object, an array, or `[{ outputs: … }]`, and values are often
 * strings (`"true"`, `"0"`). Anything unrecognised is shown as text; the raw
 * JSON is always kept alongside for checking.
 */

import type {
    PhaseOutputCommandData,
    PhaseOutputSourceData,
    PhaseOutputSubPhaseData,
    PhaseOutputView,
} from '../schemas/run_detail_types.js';

type Obj = Record<string, unknown>;

const is_obj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `true` / `"true"` → true, `false` / `"false"` → false, else null. */
function as_bool(v: unknown): boolean | null {
    if (v === true || v === 'true') return true;
    if (v === false || v === 'false') return false;
    return null;
}

/** A finite number from a number or numeric string, else null. */
function as_num(v: unknown): number | null {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
}

/** Unwrap `[{ outputs: X }]` / `[X]` to X; empty `{}` to null; longer arrays stay arrays. */
function unwrap_data(data: unknown): unknown {
    let d = data;
    if (Array.isArray(d) && d.length === 1) d = d[0];
    if (is_obj(d) && Object.keys(d).length === 1 && 'outputs' in d) d = d.outputs;
    if (is_obj(d) && Object.keys(d).length === 0) return null;
    if (Array.isArray(d) && d.length === 0) return null;
    return d ?? null;
}

/** Shell noise that says nothing about what a command does. */
const NOISE_LINE = /^(set -e[ux]*|set -[a-z]+|mkdir -p \.cliq|#.*|)$/;

/** A readable label for an exec command (Core keeps only its first ~40 chars). */
function command_label(name: string): string {
    const lines = name.split('\n').map((l) => l.trim());
    const useful = lines.filter((l) => !NOISE_LINE.test(l));
    const label = (useful.length ? useful : lines.filter(Boolean)).join(' · ');
    return label || name.trim();
}

/** `PASS <command> (exit N)` lines of an `## Exec Results` text (a command may span lines). */
const EXEC_LINE = /^(PASS|FAIL) ([\s\S]*?) \(exit (-?\d+)\)[ \t]*$/gm;

/** Commands read from the text when `data` has no results (older daemons). */
function commands_from_text(text: string): PhaseOutputView['commands'] {
    const items: PhaseOutputCommandData[] = [...text.matchAll(EXEC_LINE)].map((m) => ({
        label: command_label(m[2]!),
        command: m[2]!,
        pass: m[1] === 'PASS',
        exit_code: Number(m[3]),
        duration_ms: null,
    }));
    if (!items.length) return null;
    return { total: items.length, failed: items.filter((i) => !i.pass).length, items };
}

function read_commands(d: Obj): PhaseOutputView['commands'] {
    const results = Array.isArray(d.results) ? d.results.filter(is_obj) : [];
    const items: PhaseOutputCommandData[] = results.map((r) => {
        const name = typeof r.name === 'string' ? r.name : '';
        return {
            label: command_label(name),
            command: name,
            pass: as_bool(r.pass) ?? as_num(r.exit_code) === 0,
            exit_code: as_num(r.exit_code),
            duration_ms: as_num(r.duration_ms),
        };
    });
    const failed = as_num(d.failed) ?? items.filter((i) => !i.pass).length;
    return { total: as_num(d.total) ?? items.length, failed, items };
}

/** `{ total, results[] }` — the exec agent's result block. */
const is_commands = (d: unknown): d is Obj => is_obj(d) && Array.isArray(d.results) && ('total' in d || 'all_passed' in d);

/** Facts worth a glance from a tool source entry (Jira issue, scope file, …). */
function source_detail(s: Obj): string | null {
    const bits: string[] = [];
    if (typeof s.key === 'string') bits.push(s.key);
    if (typeof s.type === 'string') bits.push(s.type.replace(/_/g, ' '));
    if (typeof s.status === 'string') bits.push(s.status);
    if (as_num(s.repos) != null) bits.push(`${as_num(s.repos)} repos`);
    if (as_num(s.count) != null) bits.push(`${as_num(s.count)} items`);
    return bits.length ? bits.join(' · ') : null;
}

function read_sources(d: Obj): PhaseOutputSourceData[] {
    if (!is_obj(d.sources)) return [];
    return Object.entries(d.sources).map(([name, v]) => {
        const s = is_obj(v) ? v : {};
        const url = typeof s.url === 'string' && /^https?:\/\//.test(s.url) ? s.url : null;
        return { name, detail: source_detail(s), url };
    });
}

/** A single-line verdict: `PASS: …`, `FAIL`, `ROUTE:developer: …`, … */
const VERDICT_LINE = /^(PASS|FAIL|REJECT|ESCALATE|ROUTE:[\w.-]+)\s*(?::\s*(.*))?$/;

/** A ```gate_verdict JSON block an agent copies into its reply. */
const GATE_FENCE = /```gate_verdict\s*\n([\s\S]*?)```/;

function read_gate_verdict(text: string): PhaseOutputView['verdict'] {
    const m = GATE_FENCE.exec(text);
    if (!m) return null;
    try {
        const v = JSON.parse(m[1]!) as unknown;
        if (is_obj(v) && typeof v.outcome === 'string') {
            return { outcome: v.outcome, reason: typeof v.reason === 'string' ? v.reason : null };
        }
    } catch { /* not JSON — leave it in the text */ }
    return null;
}

/** A line where an agent says what it is doing or about to do. */
const NARRATION = /\b(I['’]ll|I will|I['’]m|I am going to|Let me|Next,? I|Now I|First,? I|I['’]ve|I have)\b/i;

/**
 * Split agent prose into its narration and its answer. Agent CLIs log each
 * message as a line, then the final message (which may span paragraphs): the
 * answer starts at the line before the first blank line (or is the last line
 * when there is none). Earlier lines are steps when they read as narration.
 */
function split_narration(text: string): { steps: string[]; body: string } {
    const lines = text.split('\n');
    const first_blank = lines.findIndex((l, i) => i > 0 && l.trim() === '');
    let start = first_blank > 0 ? first_blank - 1 : lines.length - 1;
    while (start > 0 && lines[start]!.trim() === '') start -= 1;
    const before = lines.slice(0, start).map((l) => l.trim()).filter(Boolean);
    if (before.length === 0 || !before.some((l) => NARRATION.test(l))) return { steps: [], body: text.trim() };
    return { steps: before, body: lines.slice(start).join('\n').trim() };
}

/** First sentence / line of markdown, without heading marks, for the summary. */
function first_line(md: string): string {
    const line = md.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find((l) => l && !l.startsWith('```')) ?? '';
    const sentence = /^(.{20,200}?[.!?])(\s|$)/.exec(line)?.[1] ?? line;
    return sentence.length > 200 ? `${sentence.slice(0, 199)}…` : sentence;
}

function plural(n: number, word: string): string {
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function commands_summary(c: NonNullable<PhaseOutputView['commands']>): string {
    if (c.failed > 0) return `${c.failed} of ${plural(c.total, 'command')} failed`;
    return c.total === 1 ? '1 command passed' : `All ${c.total} commands passed`;
}

/** `[phase] …` blocks of a sub-team phase's text, by phase. */
function sub_phase_texts(text: string): Map<string, string> {
    const out = new Map<string, string>();
    const re = /^\[([\w.-]+)\]\s*/gm;
    const marks = [...text.matchAll(re)];
    marks.forEach((m, i) => {
        const end = i + 1 < marks.length ? marks[i + 1]!.index : text.length;
        out.set(m[1]!, text.slice(m.index! + m[0].length, end).trim());
    });
    return out;
}

function read_sub_team(d: Obj, text: string): PhaseOutputView['sub_run'] {
    const texts = sub_phase_texts(text);
    const phases: PhaseOutputSubPhaseData[] = [];
    const seen = new Set<string>();
    for (const [k, v] of Object.entries(d)) {
        if (k === 'team_ref' || k === 'sub_run_id') continue;
        const ok = is_commands(v) ? as_bool(v.all_passed) ?? as_num(v.failed) === 0 : null;
        const summary = is_commands(v) ? commands_summary(read_commands(v)!) : first_line(texts.get(k) ?? '');
        phases.push({ phase: k, ok, summary });
        seen.add(k);
    }
    for (const [k, t] of texts) {
        if (seen.has(k)) continue;
        const ok = /(^|\n)\s*FAIL\b/.test(t) ? false : /(^|\n)\s*PASS\b/.test(t) ? true : null;
        phases.push({ phase: k, ok, summary: t.startsWith('## Exec Results') ? (ok === false ? 'A command failed' : 'Commands passed') : first_line(t) });
    }
    return {
        run_id: String(d.sub_run_id),
        team_ref: typeof d.team_ref === 'string' ? d.team_ref : null,
        phases,
    };
}

function empty_view(kind: PhaseOutputView['kind'], summary: string): PhaseOutputView {
    return { kind, summary, body_markdown: null, steps: [], verdict: null, commands: null, sources: [], sub_run: null };
}

/**
 * Read a stored phase output into the run page's view of it.
 *
 * @param content - The record's stored text (the `{ text, data? }` JSON, or plain text).
 */
export function to_phase_output_view(content: string | null): PhaseOutputView {
    const raw = (content ?? '').trim();
    if (!raw) return empty_view('text', 'No output recorded');

    let envelope: Obj | null = null;
    if (raw.startsWith('{')) {
        try {
            const parsed = JSON.parse(raw) as unknown;
            if (is_obj(parsed)) envelope = parsed;
        } catch { /* not JSON — plain text below */ }
    }
    if (!envelope || typeof envelope.text !== 'string') {
        // Not the envelope: show it as text (pretty JSON when it is JSON).
        const view = empty_view('text', envelope ? 'Structured output' : first_line(raw));
        view.body_markdown = envelope ? `\`\`\`json\n${JSON.stringify(envelope, null, 2)}\n\`\`\`` : raw;
        return view;
    }

    const text = envelope.text.trim();
    const data = unwrap_data(envelope.data);

    if (is_obj(data) && data.sub_run_id != null) {
        const view = empty_view('sub_team', '');
        view.sub_run = read_sub_team(data, text);
        const failed = view.sub_run!.phases.filter((p) => p.ok === false).length;
        const team = view.sub_run!.team_ref ?? 'sub-team';
        view.summary = failed
            ? `Ran ${team} — ${plural(failed, 'phase')} failed`
            : `Ran ${team} — ${plural(view.sub_run!.phases.length, 'phase')}`;
        return view;
    }

    if (is_commands(data)) {
        const view = empty_view('commands', '');
        view.commands = read_commands(data);
        view.summary = commands_summary(view.commands!);
        return view;
    }

    const from_text = text.startsWith('## Exec Results') ? commands_from_text(text) : null;
    if (from_text) {
        const view = empty_view('commands', commands_summary(from_text));
        view.commands = from_text;
        return view;
    }

    if (is_obj(data) && is_obj(data.sources)) {
        const view = empty_view('tool', '');
        view.sources = read_sources(data);
        // Drop the `## … Results` heading; the rest is the tool's own summary lines.
        const body = text.replace(/^##[^\n]*\n+/, '').trim();
        view.body_markdown = body || null;
        view.summary = first_line(body) || (typeof data.action === 'string' ? data.action.replace(/_/g, ' ') : 'Tool results');
        return view;
    }

    const single = !text.includes('\n') ? VERDICT_LINE.exec(text) : null;
    if (single) {
        const view = empty_view('verdict', text);
        view.verdict = { outcome: single[1]!, reason: single[2]?.trim() || null };
        return view;
    }

    // Agent prose (or any other text).
    const verdict = read_gate_verdict(text);
    const { steps, body } = split_narration(text.replace(GATE_FENCE, '').trim());
    const view = empty_view(steps.length || text.length > 300 || verdict ? 'agent' : 'text', first_line(body) || (verdict ? verdict.outcome : ''));
    view.steps = steps;
    view.body_markdown = body || null;
    view.verdict = verdict;
    return view;
}
