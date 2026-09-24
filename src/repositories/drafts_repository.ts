import type { ApiClient } from './api_client.js';
import type {
    DraftListResponseVO, DraftDetailVO,
    DraftSaveResponseVO, DraftDeleteResponseVO,
} from '../types/vo.js';

/**
 * Drafts merged into teams (visibility=draft). Maps former draft verbs
 * onto /v1/teams/*.
 */
export class DraftsRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async get(token: string): Promise<DraftListResponseVO> {
        const vo = await this._client.post<{
            teams?: Array<{ id: string; name: string; updated_at: string }>;
        }>('/v1/teams/get', { mine: true, status: 'draft' }, token);
        return {
            drafts: (vo.teams ?? []).map((t) => ({
                id: String(t.id),
                title: t.name,
                updated_at: t.updated_at,
            })),
        } as unknown as DraftListResponseVO;
    }

    async get_by_id(params: { id: string }, token: string): Promise<DraftDetailVO> {
        const vo = await this._client.post<Record<string, unknown>>(
            '/v1/teams/get_by_id', { team_id: params.id }, token,
        );
        return {
            id: String(vo.id ?? params.id),
            user_id: String(vo.author_id ?? ''),
            title: String(vo.name ?? ''),
            team_json: String(vo.team_json || vo.raw_manifest || '{}'),
            created_at: String(vo.created_at ?? ''),
            updated_at: String(vo.updated_at ?? ''),
        } as unknown as DraftDetailVO;
    }

    async new_draft(
        params: { title?: string; team_json: string },
        token: string,
    ): Promise<DraftSaveResponseVO> {
        let name = 'untitled-team';
        try {
            const parsed = JSON.parse(params.team_json);
            if (parsed?.name) {
                name = String(parsed.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || name;
            }
        } catch { /* ignore */ }
        return this._client.post<DraftSaveResponseVO>(
            '/v1/teams/create', {
                name,
                scope: 'default',
                description: params.title,
                team_json: params.team_json,
            }, token,
        );
    }

    async update(
        params: { id: string; title?: string; team_json: string },
        token: string,
    ): Promise<DraftSaveResponseVO> {
        return this._client.post<DraftSaveResponseVO>(
            '/v1/teams/update', {
                team_id: params.id,
                description: params.title,
                team_json: params.team_json,
            }, token,
        );
    }

    async delete_draft(params: { id: string }, token: string): Promise<DraftDeleteResponseVO> {
        return this._client.post<DraftDeleteResponseVO>(
            '/v1/teams/delete', { team_id: params.id }, token,
        );
    }
}
