import { z } from 'zod';

const slug = z.string().trim().min(1).max(128);

/**
 * POST /v1/realm_settings/get — everything the realm Settings tab shows.
 * BFF-only composition over existing routes:
 *   /v1/realms/get_by_id → /v1/realms/get_members + /v1/invitations/get { realm } +
 *   /v1/auth/get_tokens { type: realm }.
 */
export const realm_settings_get_schema = z.object({ org_slug: slug, slug }).strict();

export type RealmSettingsGetInput = z.infer<typeof realm_settings_get_schema>;
