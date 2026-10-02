/**
 * Getting started — onboarding progress of the signed-in user (request schema + response data).
 *
 * Routes (controllers/getting_started_controller.ts):
 *   POST /v1/getting_started/get — which onboarding steps are done
 *
 * BFF composition over Core: `/v1/orgs/get { mine }` → per org `/internal/dashboard/realms`
 * + `/v1/runs/get { org_id, limit: 1 }` → `/v1/teams/get { realm_id, limit: 1 }` until a realm has a team.
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

/** POST /v1/getting_started/get — no fields. */
export const GettingStartedGetInput = z.object({}).strict();
export type GettingStartedGetInput = z.infer<typeof GettingStartedGetInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** Realm link target (`/o/:org_slug/realms/:slug`). */
export interface GettingStartedRealmRefData {
    org_slug: string;
    slug: string;
}

/** `getting_started/get` — each onboarding step's state and where to continue. */
export interface GettingStartedData {
    /** CLI installed + logged in — inferred from an enrolled daemon (the CLI is how daemons enrol). */
    cli: { done: boolean };
    daemon: { done: boolean; online: number; total: number; realm: GettingStartedRealmRefData | null };
    team: { done: boolean; realm: GettingStartedRealmRefData | null };
    run: { done: boolean; run_id: string | null; realm: GettingStartedRealmRefData | null };
    /** Where "open realm" buttons should go: first realm with a daemon, else the first realm. */
    realm: GettingStartedRealmRefData | null;
    done_count: number;
    total: number;
    partial: boolean;
}
