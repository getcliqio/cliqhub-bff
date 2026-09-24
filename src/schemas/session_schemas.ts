import { z } from 'zod';

export const session_create_schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

export const session_update_schema = z.object({
    act_as_user_id: z.string().uuid().nullable(),
});

export type SessionCreateInput = z.infer<typeof session_create_schema>;
export type SessionUpdateInput = z.infer<typeof session_update_schema>;
