import { z } from 'zod';

export const drafts_get_schema = z.object({});

export const drafts_get_by_id_schema = z.object({
    id: z.string().uuid('Draft ID must be a valid UUID'),
});

export const drafts_new_schema = z.object({
    title: z.string().optional(),
    team_json: z.string().min(1, 'team_json is required'),
});

export const drafts_update_schema = z.object({
    id: z.string().uuid('Draft ID must be a valid UUID'),
    title: z.string().optional(),
    team_json: z.string().min(1, 'team_json is required'),
});

export const drafts_delete_schema = z.object({
    id: z.string().uuid('Draft ID must be a valid UUID'),
});

export type DraftsGetByIdInput = z.infer<typeof drafts_get_by_id_schema>;
export type DraftsNewInput = z.infer<typeof drafts_new_schema>;
export type DraftsUpdateInput = z.infer<typeof drafts_update_schema>;
export type DraftsDeleteInput = z.infer<typeof drafts_delete_schema>;
