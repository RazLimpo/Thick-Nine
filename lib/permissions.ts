// lib/permissions.ts

export type AdminRole = 'super_admin' | 'sub_admin';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: string[];
}

/**
 * Checks if the current admin has access to a required permission.
 */
export function hasPermission(user: AdminUser | null, requiredPermission: string): boolean {
  if (!user) return false;

  // Super admins bypass all permission restrictions
  if (user.role === 'super_admin') return true;

  // Sub admins check their permissions array
  return Boolean(user.permissions && user.permissions.includes(requiredPermission));
} 