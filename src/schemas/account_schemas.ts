import { z } from 'zod';

export const update_profile_schema = z.object({
    display_name: z.string().min(1, 'Display name cannot be empty').max(100, 'Display name must be 100 characters or less').optional(),
    email: z.string().email('Invalid email format').optional(),
    preferences: z.record(z.unknown()).optional(),
}).refine(
    (data) => data.display_name !== undefined || data.email !== undefined || data.preferences !== undefined,
    { message: 'At least one field (display_name, email, or preferences) is required' },
);

export const change_password_schema = z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

export type UpdateProfileInput = z.infer<typeof update_profile_schema>;
export type ChangePasswordInput = z.infer<typeof change_password_schema>;
