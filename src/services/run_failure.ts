/**
 * Why a run failed — for the run page's "Why it failed" card.
 *
 * Follows the failure down: the run's failed phase → the sub-team run that phase started (when
 * it failed too) → its failed phase … up to {@link MAX_DEPTH} hops. At the bottom, the failing
 * step's error is classified ({@link classify_failure}) and, when it was a review, the review is
 * read (`reviews/get_by_id`, who it went to and what each person answered).
 *
 * Reads (all existing Core routes, best-effort): `runs/get_status` and `runs/get { parent_run_id }`
 * per sub-team hop, plus one review read. A failed read ends the walk where it is; the card
 * then shows what is known.
 */

import type { ControlRepository } from '../repositories/control_repository.js';
import type { ControlRunPhaseVO, ControlRunVO } from '../types/core/control.js';
import type {
    RunFailureData, RunFailureReason, RunFailureReviewData, RunFailureReviewerData, RunFailureStepData,
} from '../schemas/run_detail_types.js';
import { get_logger } from '../lib/log.js';

const log = get_logger('svc.run_failure');

/** Sub-team hops followed below the run. */
const MAX_DEPTH = 3;
/** Run states the card explains. */
const STOPPED = new Set(['failed', 'crashed', 'cancelled']);
/** Phase and run states that mean "this is where it broke". */
const BROKE = new Set(['failed', 'error', 'crashed']);

/** Reads a review by id (with the org fallback the review page uses); null when it can't be read. */
export type ReviewReader = (review_id: string, token: string) => Promise<Record<string, unknown> | null>;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Services named in permission errors, for the hint. */
const SERVICES: Array<[RegExp, string]> = [
    [/jira|atlassian/i, 'Jira'], [/confluence/i, 'Confluence'], [/github|git@|\bgit\b/i, 'GitHub'],
    [/slack/i, 'Slack'], [/npm|pkg\.github/i, 'the package registry'], [/s3|aws/i, 'AWS'],
    [/cliqhub|hub/i, 'CliqHub'],
];

/** What the failing step looked like, for {@link classify_failure}. */
export interface FailureContext {
    /** The stopped run's state (`failed` / `crashed` / `cancelled`) — of the run where it broke. */
    run_state: string;
    /** The failing step's error (else the run's). */
    error: string | null;
    /** The review the step was waiting on, when it was one. */
    review: RunFailureReviewData | null;
}

/**
 * The reason, a one-line summary and (for reasons with a known fix) a hint. Ordered checks:
 * cancelled / daemon crash, then reviews, then the error text (permissions before generic
 * agent failures, since a 403 often surfaces as a non-zero exit).
 */
export function classify_failure(c: FailureContext): { reason: RunFailureReason; summary: string; hint: string | null } {
    const e = c.error ?? '';
    if (c.run_state === 'cancelled') return { reason: 'cancelled', summary: 'The run was cancelled', hint: null };
    if (c.run_state === 'crashed' && /daemon (restarted|stopped|went away)|lease/i.test(e)) {
        return { reason: 'daemon_crashed', summary: 'The daemon running it stopped mid-run', hint: 'Check the daemon is up, then resume the run.' };
    }

    const review_said = (c.review?.reviewers ?? []).filter((r) => r.action);
    const rejected = review_said.find((r) => /^(REJECT|REWORK|ROUTE)/.test(r.action ?? ''));
    if (/review .*(timed out|expired)/i.test(e) || (c.review && /expired/i.test(c.review.status ?? ''))) {
        const after = /after (\d+\s*[mhs])/i.exec(e)?.[1];
        const base = `Review timed out${after ? ` after ${after.replace(/\s+/g, '')}` : ''}`;
        if (rejected) return { reason: 'review_timed_out', summary: `${base} — ${rejected.name}'s reject didn't decide it`, hint: null };
        return { reason: 'review_timed_out', summary: `${base} with no decision`, hint: 'Nobody answered in time. Resume when a reviewer is available, or give the review a longer timeout.' };
    }
    if (/reviewer rejected/i.test(e) || (c.review && rejected && /escalat/i.test(e))) {
        return { reason: 'review_rejected', summary: `${rejected?.name ?? 'A reviewer'} rejected it and there was nowhere to send it back to`, hint: 'Add a route target to the review phase so a reject sends the work back instead of stopping.' };
    }
    if (c.review || /gate .*escalat|escalating/i.test(e)) {
        return { reason: 'review_escalated', summary: c.review ? 'The review was escalated' : 'A check escalated and stopped the run', hint: null };
    }
    if (/max(imum)? iterations|routes? exhausted|no (more )?iterations left/i.test(e)) {
        return { reason: 'gate_exhausted', summary: 'The check kept sending work back until it ran out of retries', hint: null };
    }
    if (/\b(401|403)\b|unauthori[sz]ed|forbidden|permission denied|eacces|access denied|token (has )?expired|invalid (token|credentials)|authentication failed|bad credentials/i.test(e)) {
        const service = SERVICES.find(([re]) => re.test(e))?.[1];
        return {
            reason: 'permission',
            summary: service ? `${service} refused access` : 'Access was refused',
            hint: service ? `Check the ${service} connection or token this team uses has access, then resume.` : 'Check the credentials this step uses, then resume.',
        };
    }
    if (/needs inputs?|missing (required )?inputs?|not (installed|registered|ready)|command not found|enoent|no such file|not found in team manifest/i.test(e)) {
        return { reason: 'missing_setup', summary: 'Something this step needs was missing', hint: 'Install or configure what the error names on the daemon, then resume.' };
    }
    if (/timed? ?out|timeout|idle for/i.test(e)) {
        return { reason: 'timed_out', summary: 'A step ran too long and was stopped', hint: null };
    }
    const exit = /exited (-?\d+)|exit code (-?\d+)/i.exec(e);
    if (exit || /sigkill|sigterm|out of memory|\boom\b|failed to spawn|without posting|process failed/i.test(e)) {
        const code = exit?.[1] ?? exit?.[2];
        return { reason: 'agent_crashed', summary: code ? `The agent exited with code ${code}` : 'The agent process stopped unexpectedly', hint: null };
    }
    if (e.trim()) return { reason: 'agent_error', summary: 'The agent reported an error', hint: null };
    return { reason: 'unknown', summary: 'The run stopped without recording why', hint: null };
}

/** The review a run failed on, from Core's review read (`groups[].notifications` = who and what). */
export function to_failure_review(review_id: string, dto: Obj): RunFailureReviewData {
    const groups = Array.isArray(dto.groups) ? dto.groups.map(obj) : [];
    const reviewers: RunFailureReviewerData[] = groups.flatMap((g) => (Array.isArray(g.notifications) ? g.notifications.map(obj) : []).map((n) => ({
        name: str(n.channel_target) ?? str(n.user_id) ?? 'reviewer',
        action: str(n.action),
        responded_at: str(n.responded_at),
        comment: str(n.comment),
    })));
    const policy = str(groups[0]?.policy);
    const targets = Array.isArray(dto.route_targets) ? dto.route_targets.filter((t): t is string => typeof t === 'string') : [];
    return { review_id, status: str(dto.status), policy: policy === 'any' || policy === 'all' ? policy : null, reviewers, route_targets: targets };
}

/** The phase that broke: the last failed row (by sequence). */
function failed_phase(rows: ControlRunPhaseVO[]): ControlRunPhaseVO | null {
    const broke = rows.filter((r) => BROKE.has(String(r.status)));
    return broke.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)).at(-1) ?? null;
}

/**
 * Why `run` stopped, or null when it hasn't (not failed / crashed / cancelled).
 *
 * @param control - Core control reads.
 * @param read_review - Review read by id.
 * @param run - The run.
 * @param phases - Its phase rows (already read for the page).
 * @param children - Its sub-team runs (already read for the page).
 * @param token - Caller's Core token.
 */
export async function read_failure(
    control: ControlRepository,
    read_review: ReviewReader | null,
    run: ControlRunVO,
    phases: ControlRunPhaseVO[],
    children: ControlRunVO[],
    token: string,
): Promise<RunFailureData | null> {
    if (!STOPPED.has(String(run.state))) return null;

    const chain: RunFailureStepData[] = [];
    let cur: ControlRunVO = run;
    let rows = phases;
    let kids = children;
    let broke: ControlRunPhaseVO | null = null;
    for (let depth = 0; ; depth++) {
        broke = failed_phase(rows);
        chain.push({ run_id: cur.run_id, run_name: str(cur.run_name), team: str(cur.team_label), phase: broke?.phase ?? null });
        const child = broke ? kids.filter((k) => k.parent_phase === broke!.phase && BROKE.has(String(k.state))).at(-1) : undefined;
        if (!child || depth >= MAX_DEPTH) break;
        try {
            [rows, kids] = await Promise.all([control.run_phases(child.run_id, token), control.child_runs(child.run_id, token).then((p) => p.items)]);
        } catch (err) {
            log.warn('run_failure_sub_run_read_failed', { run_id: child.run_id, error: err instanceof Error ? err.message : String(err) });
            chain.push({ run_id: child.run_id, run_name: str(child.run_name), team: str(child.team_label), phase: null });
            cur = child;
            broke = null;
            break;
        }
        cur = child;
    }

    const error = str(broke?.error) ?? str(cur.error) ?? str(run.error);
    let review: RunFailureReviewData | null = null;
    const review_id = error ? /review ([0-9a-f][0-9a-f-]{15,})/i.exec(error)?.[1] : undefined;
    if (review_id && read_review) {
        try {
            const dto = await read_review(review_id, token);
            if (dto) review = to_failure_review(review_id, dto);
        } catch (err) {
            log.warn('run_failure_review_read_failed', { review_id, error: err instanceof Error ? err.message : String(err) });
        }
    }

    const { reason, summary, hint } = classify_failure({ run_state: String(cur.state ?? run.state), error, review });
    const is_review = reason.startsWith('review_');
    return {
        reason,
        summary,
        detail: error,
        hint,
        chain,
        resume_from: (is_review ? review?.route_targets[0] : null) ?? broke?.phase ?? null,
        review,
    };
}
