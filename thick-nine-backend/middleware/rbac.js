// middleware/rbac.js

/**
 * Middleware to enforce Role-Based Access Control (RBAC).
 * @param {string} requiredPermission - The permission key needed (e.g., 'messages:reply')
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // 1. Ensure user/admin exists on request (from auth middleware)
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const userRole = req.user.role;
      const userPermissions = req.user.permissions || [];

      // 2. Bypass permission checks for Super Admins, Legacy Admins, or Wildcard Permissions
      if (
        userRole === 'super_admin' ||
        userRole === 'admin' ||
        userPermissions.includes('*')
      ) {
        return next();
      }

      // 3. Sub-admins and granular roles must possess the explicit permission key
      if (userPermissions.includes(requiredPermission)) {
        return next();
      }

      // 4. Deny access if permission is missing
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires '${requiredPermission}' permission.`,
      });
    } catch (err) {
      console.error('RBAC Middleware Error:', err);
      return res.status(500).json({ success: false, message: 'Server error checking permissions.' });
    }
  };
};

module.exports = { requirePermission };