import { z } from 'zod';

/**
 * Single Teams build resource — POST /v1/teams/build only.
 * Mirrors backend `teams_build_schema` (action discriminator).
 */
export const teams_build_schema = z.object({
    action: z.enum(['generate', 'status', 'improve_role', 'suggest', 'validate', 'chat']),
    intent: z.string().max(5000).optional(),
    job_id: z.string().optional(),
    role_name: z.string().optional(),
    role_content: z.string().max(50000).optional(),
    team_name: z.string().optional(),
    team_description: z.string().optional(),
    phases: z.array(z.any()).optional(),
    instruction: z.string().optional(),
    description: z.string().optional(),
    roles: z.array(z.any()).optional(),
    team: z.any().optional(),
    message: z.string().max(5000).optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional(),
}).superRefine((body, ctx) => {
    switch (body.action) {
        case 'generate':
            if (!body.intent?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'intent is required', path: ['intent'] });
            }
            break;
        case 'status':
            if (!body.job_id?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'job_id is required', path: ['job_id'] });
            }
            break;
        case 'improve_role':
            if (!body.role_name?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'role_name is required', path: ['role_name'] });
            }
            if (!body.role_content?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'role_content is required', path: ['role_content'] });
            }
            break;
        case 'suggest':
            if (!body.team_name?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'team_name is required', path: ['team_name'] });
            }
            break;
        case 'validate':
            if (body.team == null) {
                ctx.addIssue({ code: 'custom', message: 'team is required', path: ['team'] });
            }
            break;
        case 'chat':
            if (body.team == null) {
                ctx.addIssue({ code: 'custom', message: 'team is required', path: ['team'] });
            }
            if (!body.message?.trim()) {
                ctx.addIssue({ code: 'custom', message: 'message is required', path: ['message'] });
            }
            break;
    }
});

export type TeamsBuildInput = z.infer<typeof teams_build_schema>;

/** @deprecated use teams_build_schema */
export const builder_generate_schema = z.object({
    action: z.literal('generate').optional(),
    intent: z.string().min(1, 'intent is required').max(5000),
});
export const builder_improve_role_schema = z.object({
    role_name: z.string().min(1),
    role_content: z.string().min(1).max(50000),
    team_name: z.string().min(1),
    team_description: z.string().min(1),
    phases: z.array(z.string()),
    instruction: z.string().optional(),
});
export const builder_validate_schema = z.object({
    team: z.unknown().refine(v => v != null, { message: 'team is required' }),
});
export const builder_chat_schema = z.object({
    message: z.string().min(1).max(5000),
    team: z.unknown().refine(v => v != null, { message: 'team is required' }),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
    })).optional(),
});

export type BuilderGenerateInput = z.infer<typeof builder_generate_schema>;
export type BuilderImproveRoleInput = z.infer<typeof builder_improve_role_schema>;
export type BuilderValidateInput = z.infer<typeof builder_validate_schema>;
export type BuilderChatInput = z.infer<typeof builder_chat_schema>;
