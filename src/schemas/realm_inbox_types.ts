/**
 * Realm inbox — everything in one realm that needs a person (request schema + response data).
 *
 * Routes (controllers/realm_inbox_controller.ts):
 *   POST /v1/realm_inbox/get — open Hugs, runs awaiting input, recent failures, running runs;
 *     with `summary: true` also the realm page summary (header, teams, daemons, people)
 *
 * BFF composition over Core: `/v1/realms/get_by_id { slug, org_slug }` → `/v1/hugs/get` (open)
 * + `/v1/runs/get` (awaiting_input | failed+crashed 24h | running).
 */

import { z } from 'zod';
import { RealmRefFields } from './realm_ref.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_inbox/get */
export const RealmInboxGetInput = z.object({
    ...RealmRefFields,
    /** Also compose the realm page summary (realm teams + daemons + settings reads). */
    summary: z.boolean().optional(),
    /** Summary: which page of the realm's teams / members to return (pages of 5). */
    teams_offset: z.number().int().min(0).max(10_000).optional(),
    members_offset: z.number().int().min(0).max(10_000).optional(),
}).strict();
export type RealmInboxGetInput = z.infer<typeof RealmInboxGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** The realm a realm page is about (shared by every realm page response). */
export interface ControlRealmData {
    id: string;
    slug: string;
    name: string;
    org_slug: string | null;
}

/** The independent reads behind the inbox. */
export type InboxSectionKey = 'hugs' | 'awaiting_input' | 'failed' | 'running';

/** One row of the inbox (a Hug or a run). */
export interface InboxItemData {
    kind: 'hug' | 'input' | 'failed' | 'run';
    /** hug_id for Hugs, run_id otherwise. */
    id: string;
    run_id: string | null;
    title: string;
    team: string | null;
    phase: string | null;
    state: string;
    /** Epoch ms used for ordering (requested / last updated / started). */
    at: number | null;
    error: string | null;
    /** Hug-only: when it expires (ms), and whether the caller has answered it. */
    expires_at: number | null;
    responded: boolean | null;
    /** Who initiated the run: `'hub'` (dispatched) or `'cli'` (local), or null for Hugs / pre-refactor runs. */
    origin: string | null;
}

/** Whether one best-effort section loaded; `error` is Core's message (or a generic one). */
export interface InboxSectionStatusData {
    status: 'ok' | 'error';
    error: string | null;
}

/** `realm_inbox/get` */
export interface RealmInboxData {
    realm: ControlRealmData;
    /** Everything that needs a person: open Hugs, awaiting input, failures (24h). Newest first. */
    items: InboxItemData[];
    /** Running now. Newest first. */
    live: InboxItemData[];
    counts: { hugs: number; awaiting_input: number; failed_24h: number; running: number };
    sections: Record<InboxSectionKey, InboxSectionStatusData>;
    partial: boolean;
    /** Only with `summary: true`. */
    summary?: RealmSummaryData;
}

/** The realm page summary: who it is, what it runs, what runs it, who is in it. */
export interface RealmSummaryData {
    realm: {
        description: string | null;
        created_at: number | null;
        updated_at: number | null;
        created_by_username: string | null;
    };
    /** Teams on the realm, one page (most recently run first) — null when the read failed. */
    teams: {
        total: number;
        /** Teams whose workflow names an agent the org has not registered. */
        missing_agents: number;
        offset: number;
        limit: number;
        items: Array<{
            scope: string | null; slug: string; label: string; version: string | null;
            /** Newer published version, when there is one. */
            latest_version: string | null;
            missing_agents: string[];
            last_run_at: number | null;
            /** From the team's catalog entry; null when unknown (CLI installs, or the read failed). */
            description: string | null;
        }>;
    } | null;
    daemons: {
        online: number;
        total: number;
        items: Array<{ id: string; name: string; status: string }>;
        truncated: boolean;
    } | null;
    /** People in the realm, one page (admins, then operators, then members) — null when the read failed. */
    people: {
        total: number;
        offset: number;
        limit: number;
        by_role: Record<string, number>;
        items: Array<{ member_id: string; username: string | null; role: string; is_you: boolean }>;
        /** Pending invites; null when the viewer can't see them. */
        pending_invites: number | null;
    } | null;
    you: { role: string | null; is_admin: boolean };
}
