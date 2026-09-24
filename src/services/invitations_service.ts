import type { InvitationsRepository } from '../repositories/invitations_repository.js';

export class InvitationsService {
    private _repo: InvitationsRepository;

    constructor(repo: InvitationsRepository) {
        this._repo = repo;
    }

    async create(
        params: {
            target_type: 'org' | 'realm';
            org_id?: string;
            realm_id?: string;
            email: string;
            role?: 'admin' | 'member' | 'operator';
        },
        token: string,
    ) {
        return this._repo.create(params, token);
    }

    async get(
        params: {
            target_type: 'org' | 'realm';
            org_id?: string;
            realm_id?: string;
            query?: string;
            limit?: number;
            offset?: number;
        },
        token: string,
    ) {
        return this._repo.get(params, token);
    }

    async get_by_id(
        params: { target_type: 'org' | 'realm'; invite_id: string },
        token: string,
    ) {
        return this._repo.get_by_id(params, token);
    }

    async revoke(
        params: { target_type: 'org' | 'realm'; invite_id: string },
        token: string,
    ) {
        return this._repo.revoke(params, token);
    }

    async get_by_token(params: { token: string }, backend_token?: string) {
        return this._repo.get_by_token(params, backend_token);
    }

    async accept(
        params: {
            token: string;
            username?: string;
            password?: string;
            display_name?: string;
        },
        backend_token?: string,
    ) {
        return this._repo.accept(params, backend_token);
    }
}
