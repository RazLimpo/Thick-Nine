// middleware/rbac.js

/**
 * Role-Based Access Control (RBAC) Middleware
 * with Role Hierarchy + Preset support
 */

const ROLE_PRESETS = {
  support: ['messages:read', 'messages:reply', 'users:read', 'orders:read'],
  moderator: ['services:read', 'services:moderate', 'messages:read', 'reviews:manage'],
  senior_support: ['users:write', 'services:moderate'], // only the extra ones
  custom: [],
};

const ROLE_HIERARCHY = {
  senior_support: ['support'], // inherits from support
};

/**
 * Recursively resolves all permissions for a role (with cycle protection)
 */
const resolveRolePermissions = (role, visited = new Set()) => {
  if (visited.has(role)) return [];
  visited.add(role);

  let permissions = ROLE_PRESETS[role] ? [...ROLE_PRESETS[role]] : [];

  if (ROLE_HIERARCHY[role]) {
    ROLE_HIERARCHY[role].forEach((parentRole) => {
      permissions = [...permissions, ...resolveRolePermissions(parentRole, visited)];
    });
  }

  return [...new Set(permissions)];
};

const requirePermission = (requiredPermission) => {
  if (!requiredPermission || typeof requiredPermission !== 'string') {
    throw new Error('requirePermission() requires a non-empty permission string');
  }

  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const userRole = (req.user.role || '').toLowerCase();
      const userPermissions = Array.isArray(req.user.permissions)
        ? req.user.permissions
        : [];

      // 1. Super Admin → full access
      if (userRole === 'super_admin' || userPermissions.includes('*')) {
        return next();
      }

      // 2. Standard Admin → everything except roles:manage
      if (userRole === 'admin') {
        if (requiredPermission === 'roles:manage') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Only Super Admins can manage team roles and sub-admins.',
          });
        }
        return next();
      }

      // 3. Combine saved permissions + inherited permissions from hierarchy
      const inheritedPermissions = resolveRolePermissions(userRole);
      const allEffectivePermissions = new Set([
        ...userPermissions,
        ...inheritedPermissions,
      ]);

      // 4. Check permission
      if (allEffectivePermissions.has(requiredPermission)) {
        return next();
      }

      // 5. Deny
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires '${requiredPermission}' permission.`,
      });
    } catch (err) {
      console.error('RBAC Middleware Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error while checking permissions.',
      });
    }
  };
};

module.exports = { requirePermission, resolveRolePermissions };