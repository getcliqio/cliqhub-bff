import type { ApiClient } from './api_client.js';
import type {
    UpdateProfileResponseVO,
    ChangePasswordResponseVO,
} from '../types/vo.js';

export class AccountRepository {
    private _client: ApiClient;

    constructor(client: ApiClient) {
        this._client = client;
    }

    async update_profile(
        params: { display_name?: string; email?: string; preferences?: Record<string, unknown> },
        token: string,
    ): Promise<UpdateProfileResponseVO> {
        return this._client.post<UpdateProfileResponseVO>(
            '/v1/users/update', params, token,
        );
    }

    async change_password(
        params: { current_password: string; new_password: string },
        token: string,
    ): Promise<ChangePasswordResponseVO> {
        return this._client.post<ChangePasswordResponseVO>(
            '/internal/users/change_password', params, token,
        );
    }
}
