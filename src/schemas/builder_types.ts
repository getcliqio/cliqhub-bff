/**
 * Team builder (AI) — request schema and response data types.
 * One route, `POST /v1/teams/build`, dispatched on `action` (same as Core
 * `teams_build_schema`). The handler lives on controllers/teams_controller.ts.
 *
 *   generate      — start generating a team from an intent (async job)
 *   status        — poll a generate job
 *   improve_role  — rewrite one role's instructions
 *   suggest       — improvement suggestions for a team
 *   validate      — check a team definition
 *   chat          — conversational edits to a team
 */

import { z } from 'zod';

// ─── Inputs ─────────────────────────────────────────────────────────────────

const ChatTurn = z.object({
    role: z.enum(['user', 'assistant']).describe('Who said it'),
    content: z.string().describe('What was said'),
});

/** POST /v1/teams/build — required fields depend on `action` (checked below). */
export const TeamsBuildInput = z.object({
    action: z.enum(['generate', 'status', 'improve_role', 'suggest', 'validate', 'chat'])
        .describe('Builder action'),
    intent: z.string().max(5000).optional()
        .describe('generate: what the team should do'),
    job_id: z.string().optional()
        .describe('status: generate job id'),
    role_name: z.string().optional()
        .describe('improve_role: role to rewrite'),
    role_content: z.string().max(50000).optional()
        .describe('improve_role: current role instructions (markdown)'),
    team_name: z.string().optional()
        .describe('improve_role / suggest: team name'),
    team_description: z.string().optional()
        .describe('improve_role: team description'),
    phases: z.array(z.any()).optional()
        .describe('improve_role / suggest: workflow phases'),
    instruction: z.string().optional()
        .describe('improve_role: how to change the role'),
    description: z.string().optional()
        .describe('suggest: team description'),
    roles: z.array(z.any()).optional()
        .describe('suggest: team roles'),
    team: z.any().optional()
        .describe('validate / chat: the team definition'),
    message: z.string().max(5000).optional()
        .describe('chat: the user message'),
    history: z.array(ChatTurn).optional()
        .describe('chat: earlier turns, oldest first'),
}).superRefine((body, ctx) => {
    const require = (ok: boolean, field: string): void => {
        if (!ok) ctx.addIssue({ code: 'custom', message: `${field} is required`, path: [field] });
    };
    switch (body.action) {
        case 'generate':
            require(Boolean(body.intent?.trim()), 'intent');
            break;
        case 'status':
            require(Boolean(body.job_id?.trim()), 'job_id');
            break;
        case 'improve_role':
            require(Boolean(body.role_name?.trim()), 'role_name');
            require(Boolean(body.role_content?.trim()), 'role_content');
            break;
        case 'suggest':
            require(Boolean(body.team_name?.trim()), 'team_name');
            break;
        case 'validate':
            require(body.team != null, 'team');
            break;
        case 'chat':
            require(body.team != null, 'team');
            require(Boolean(body.message?.trim()), 'message');
            break;
    }
});
export type TeamsBuildInput = z.infer<typeof TeamsBuildInput>;

// ─── Response data ──────────────────────────────────────────────────────────

/** generate */
export interface BuilderGenerateData {
    job_id: string;
    status: string;
    stage: string;
}

/** status */
export interface BuilderStatusData {
    job_id: string;
    status: string;
    stage: string;
    /** The generated team, once done. */
    team?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    error?: { code: string; message: string };
}

/** improve_role */
export interface BuilderImproveRoleData {
    name: string;
    original_content: string;
    improved_content: string;
    changes_summary: string;
}

/** suggest */
export interface BuilderSuggestData {
    suggestions: Record<string, unknown>[];
}

/** validate */
export interface BuilderValidateData {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/** chat */
export interface BuilderChatData {
    reply: string;
    actions: Record<string, unknown>[];
}

/** `teams/build` — by action. */
export type TeamsBuildData =
    | BuilderGenerateData
    | BuilderStatusData
    | BuilderImproveRoleData
    | BuilderSuggestData
    | BuilderValidateData
    | BuilderChatData;
