/** Team builder — Core VO → BFF data. */

import type {
    BuilderGenerateVO, BuilderStatusVO, BuilderImproveRoleVO, BuilderSuggestVO,
    BuilderValidateVO, BuilderChatVO,
} from '../types/core/builder.js';
import type {
    BuilderGenerateData, BuilderStatusData, BuilderImproveRoleData, BuilderSuggestData,
    BuilderValidateData, BuilderChatData,
} from '../schemas/builder_types.js';

/** `generate` → the started job (id, status, stage). */
export function to_builder_generate_data(vo: BuilderGenerateVO): BuilderGenerateData {
    return { job_id: vo.job_id, status: vo.status, stage: vo.stage };
}

/** Job status; `team` / `validation` / `error` only when Core sent them. */
export function to_builder_status_data(vo: BuilderStatusVO): BuilderStatusData {
    return {
        job_id: vo.job_id,
        status: vo.status,
        stage: vo.stage,
        ...(vo.team ? { team: vo.team } : {}),
        ...(vo.validation ? { validation: vo.validation } : {}),
        ...(vo.error ? { error: vo.error } : {}),
    };
}

/** `improve_role` → original vs improved role content. */
export function to_builder_improve_role_data(vo: BuilderImproveRoleVO): BuilderImproveRoleData {
    return {
        name: vo.name,
        original_content: vo.original_content,
        improved_content: vo.improved_content,
        changes_summary: vo.changes_summary,
    };
}

/** `suggest` → suggestions (empty when Core sent none). */
export function to_builder_suggest_data(vo: BuilderSuggestVO): BuilderSuggestData {
    return { suggestions: vo.suggestions ?? [] };
}

/** `validate` → validity with errors and warnings. */
export function to_builder_validate_data(vo: BuilderValidateVO): BuilderValidateData {
    return { valid: vo.valid, errors: vo.errors, warnings: vo.warnings };
}

/** `chat` → the builder's reply and proposed actions. */
export function to_builder_chat_data(vo: BuilderChatVO): BuilderChatData {
    return { reply: vo.reply, actions: vo.actions };
}
