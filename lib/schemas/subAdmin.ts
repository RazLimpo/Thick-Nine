// lib/schemas/subAdmin.ts
import { z } from 'zod';

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

    role: z.enum([
      'super_admin',
      'admin',
      'support',
      'moderator',
      'senior_support',
      'custom',
    ]),

    permissions: z
      .array(z.enum(ALLOWED_PERMISSIONS))
      .default([]),
  })
  .superRefine((data, ctx) => {
    const granularRoles = ['support', 'moderator', 'senior_support', 'custom'];

    // Granular roles must have at least one permission
    if (granularRoles.includes(data.role) && data.permissions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select at least one permission for this role',
        path: ['permissions'],
      });
    }
  });

export type CreateSubAdminInput = z.infer<typeof createSubAdminSchema>;