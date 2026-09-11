import { z } from 'zod';

/**
 * Permissions that can be explicitly assigned to an administrator.
 *
 * The "*" wildcard is intentionally NOT part of this list.
 * It is reserved exclusively for the backend's super_admin role.
 */
export const ALLOWED_PERMISSIONS = [
  'users:read',
  'users:write',
  'messages:read',
  'messages:reply',
  'payouts:read',
  'roles:manage',
  'services:read',
  'services:moderate',
  'orders:read',
  'reviews:manage',
] as const;

export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'support',
  'moderator',
  'senior_support',
  'custom',
] as const;

export const createSubAdminSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name is too long'),

    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase()),

    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password is too long'),

    role: z.enum(ADMIN_ROLES),

    permissions: z
      .array(z.enum(ALLOWED_PERMISSIONS))
      .default([]),
  })
  .superRefine((data, ctx) => {
    /*
     * Super Admin:
     *
     * The backend assigns ["*"] automatically.
     * The frontend does NOT submit the wildcard.
     */
    if (data.role === 'super_admin') {
      return;
    }

    /*
     * Every non-super-admin role must have an explicit
     * permission set or role-derived permissions.
     *
     * This prevents accidentally creating an administrator
     * with no authorization at all.
     */
    if (data.permissions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select at least one permission for this role',
        path: ['permissions'],
      });
    }

    // Sensitive permissions are reserved exclusively for Super Admin.
//
// Both permissions remain part of ALLOWED_PERMISSIONS so they
// can be displayed transparently in the admin UI, but they
// cannot be assigned to non-super-admin roles.
if (
  data.permissions.includes('roles:manage') ||
  data.permissions.includes('payouts:read')
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      'The roles:manage and payouts:read permissions are reserved exclusively for Super Admins',
    path: ['permissions'],
  });
}
  });

export type CreateSubAdminInput = z.infer<
  typeof createSubAdminSchema
>;