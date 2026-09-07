// middleware/rbac.js

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Access Hierarchy:
 * 1. super_admin     → Full unrestricted access
 * 2. admin           → Full operational access (blocked from roles:manage)
 * 3. Granular roles  → Only the specific permissions assigned to them
 *    (support, moderator, senior_support, custom, sub_admin, etc.)
 *
 * @param {string} requiredPermission - The permission key required (e.g. 'messages:reply')
 */
const requirePermission = (requiredPermission) => {
  if (!requiredPermission || typeof requiredPermission !== 'string') {
    throw new Error('requirePermission() requires a non-empty permission string');
  }

  return (req, res, next) => {
    try {
      // 1. Authentication check
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

      // 2. Super Admin → unrestricted access
      if (userRole === 'super_admin' || userPermissions.includes('*')) {
        return next();
      }

      // 3. Standard Admin → everything except managing roles/team
      if (userRole === 'admin') {
        if (requiredPermission === 'roles:manage') {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Only Super Admins can manage team roles and sub-admins.',
          });
        }
        return next();
      }

      // 4. Granular roles (support, moderator, senior_support, custom, etc.)
      //    Must have the exact required permission
      if (userPermissions.includes(requiredPermission)) {
        return next();
      }

      // 5. Access denied
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

module.exports = { requirePermission };