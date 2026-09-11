// lib/permissions.ts

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'support'
  | 'moderator'
  | 'senior_support'
  | 'custom';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions?: string[];
}

/**
 * Checks whether an administrator has a specific permission.
 *
 * This is a frontend/UI helper only.
 * Backend RBAC remains the authoritative security boundary.
 */
export function hasPermission(
  user: AdminUser | null,
  requiredPermission: string
): boolean {
  if (!user || !requiredPermission) {
    return false;
  }

  // Super Admins have unrestricted access.
  if (user.role === 'super_admin') {
    return true;
  }

  // All other roles must have the requested permission
  // explicitly assigned by the backend/admin system.
  return Boolean(
    user.permissions?.includes(requiredPermission)
  );
}