import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);

/**
 * POST /v1/realm_inbox/get — everything in one realm that needs a person.
 *
 * BFF-only composition over existing Core routes:
 *   /v1/realms/get_by_id { slug, org_slug } → /v1/reviews/get (pending) +
 *   /v1/runs/get (awaiting_input | failed+crashed 24h | running).
 */
export const realm_inbox_get_schema = z.object({
    org_slug: slug.describe('Owning org slug (from the /o/:org URL).'),
    slug: slug.describe('Realm slug (from the /realms/:slug URL).'),
}).strict();

export type RealmInboxGetInput = z.infer<typeof realm_inbox_get_schema>;

/**
 * POST /v1/run_detail/get — one run with phases, realm and pending reviews.
 *
 * BFF-only composition over existing Core routes:
 *   /v1/runs/get_by_id → /v1/runs/get_status + /v1/runs/get { query } (labels) +
 *   /v1/realms/get_by_id { realm_id } + /v1/reviews/get (pending, filtered to the run).
 */
export const run_detail_get_schema = z.object({
    run_id: z.string().trim().min(1).max(200).describe('Run id.'),
}).strict();

export type RunDetailGetInput = z.infer<typeof run_detail_get_schema>;
