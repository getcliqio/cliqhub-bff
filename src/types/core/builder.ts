/** Team builder — response shapes as Core sends them (`/v1/teams/build`, by action). */

/** `action: 'generate'` — the started job. */
export interface BuilderGenerateVO {
    job_id: string;
    status: string;
    stage: string;
}

/** `action: 'status'` — job progress; `team` / `validation` / `error` when done. */
export interface BuilderStatusVO {
    job_id: string;
    status: string;
    stage: string;
    team?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    error?: { code: string; message: string };
}

/** `action: 'improve_role'` — rewritten role content. */
export interface BuilderImproveRoleVO {
    name: string;
    original_content: string;
    improved_content: string;
    changes_summary: string;
}

/** `action: 'suggest'` — suggestions. */
export interface BuilderSuggestVO {
    suggestions: Record<string, unknown>[];
}

/** `action: 'validate'` — validation result. */
export interface BuilderValidateVO {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/** `action: 'chat'` — the builder's reply and actions. */
export interface BuilderChatVO {
    reply: string;
    actions: Record<string, unknown>[];
}
