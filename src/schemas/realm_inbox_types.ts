/**
 * Realm inbox — everything in one realm that needs a person (request schema + response data).
 *
 * Routes (controllers/realm_inbox_controller.ts):
 *   POST /v1/realm_inbox/get — pending reviews, runs awaiting input, recent failures, running runs
 *
 * BFF composition over Core: `/v1/realms/get_by_id { slug, org_slug }` → `/v1/reviews/get` (pending)
 * + `/v1/runs/get` (awaiting_input | failed+crashed 24h | running).
 */

import { z } from 'zod';
import { RealmRefFields } from './realm_ref.js';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/realm_inbox/get */
export const RealmInboxGetInput = z.object(RealmRefFields).strict();
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
export type InboxSectionKey = 'reviews' | 'awaiting_input' | 'failed' | 'running';

/** One row of the inbox (a review or a run). */
export interface InboxItemData {
    kind: 'review' | 'input' | 'failed' | 'run';
    /** review_id for reviews, run_id otherwise. */
    id: string;
    run_id: string | null;
    title: string;
    team: string | null;
    phase: string | null;
    state: string;
    /** Epoch ms used for ordering (requested / last updated / started). */
    at: number | null;
    error: string | null;
    /** Review-only extras. */
    message: string | null;
    artifact_count: number | null;
}

/** Whether one best-effort section loaded; `error` is Core's message (or a generic one). */
export interface InboxSectionStatusData {
    status: 'ok' | 'error';
    error: string | null;
}

/** `realm_inbox/get` */
export interface RealmInboxData {
    realm: ControlRealmData;
    /** Everything that needs a person: pending reviews, awaiting input, failures (24h). Newest first. */
    items: InboxItemData[];
    /** Running now. Newest first. */
    live: InboxItemData[];
    counts: { reviews: number; awaiting_input: number; failed_24h: number; running: number };
    sections: Record<InboxSectionKey, InboxSectionStatusData>;
    partial: boolean;
}
