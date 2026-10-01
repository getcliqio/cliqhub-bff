import { z } from 'zod';

/**
 * POST /v1/notification_center/get — every notification rule and channel the
 * user can see. BFF-only composition over existing Core routes:
 *   /v1/orgs/get { mine } → per org /v1/orgs/get_notification_rules,
 *   /v1/notification_channels/get { org_id }; one page of /v1/realms/get →
 *   per realm on the page /v1/realms/get_notification_rules, /v1/notification_channels/get { realm_id };
 *   /v1/events/types/list.
 */
export const notification_center_get_schema = z.object({
    org_id: z.string().uuid().optional().describe('Limit to one org (must be a member).'),
    realm_id: z.string().trim().min(1).max(200).optional().describe('Just this realm (plus org-wide rules that reach it).'),
    realm_q: z.string().trim().min(1).max(200).optional().describe('Search realms by slug or name.'),
    realm_limit: z.number().int().min(1).max(50).optional().describe('Realms per page (default 10).'),
    realm_offset: z.number().int().min(0).optional(),
}).strict();

/**
 * POST /v1/notification_center/check — who gets told for each event in a realm
 * (optionally for one team), after org, realm and team rules are applied.
 */
export const notification_center_check_schema = z.object({
    realm_id: z.string().trim().min(1).max(200),
    team_slug: z.string().trim().min(1).max(200).optional(),
}).strict();

/**
 * POST /v1/notification_center/set_rules — one rule per event at one level,
 * all sent to the same channel. Loops Core's single-rule write
 * (`/v1/orgs|realms/set_notification_rules`, idempotent per event + channel).
 */
export const notification_center_set_rules_schema = z.object({
    org_id: z.string().uuid().optional().describe('Org-wide rules (omit when realm_id is set).'),
    realm_id: z.string().trim().min(1).max(200).optional().describe('Realm rules, or team rules with team_slug.'),
    team_slug: z.string().trim().min(1).max(200).optional(),
    events: z.array(z.string().trim().min(1).max(200)).min(1).max(60).describe('Event selectors: exact, family wildcard (run.*) or *.'),
    channel_id: z.string().trim().min(1).max(200),
}).strict().superRefine((b, ctx) => {
    if (!b.realm_id && !b.org_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['org_id'], message: 'org_id or realm_id is required' });
    if (b.team_slug && !b.realm_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['team_slug'], message: 'team_slug needs realm_id' });
});

export type NotificationCenterSetRulesInput = z.infer<typeof notification_center_set_rules_schema>;
