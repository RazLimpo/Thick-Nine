 /**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Authorization is based exclusively on the resolved Admin identity
 * created by adminContext.js.
 *
 * Authentication:
 *   req.user
 *
 * Administrator authorization:
 *   req.admin
 *
 * Security-sensitive permissions:
 *   roles:manage  -> Super Admin only
 *   payouts:read  -> Super Admin only
 */

 const ROLE_PRESETS = {
  /*
   * Standard Admin
   *
   * Full operational access, but NO:
   * - payouts:read
   * - roles:manage
   *
   * Those permissions are reserved exclusively for Super Admin.
   */
  admin: [
      "users:read",
      "users:write",
      "messages:read",
      "messages:reply",
      "services:read",
      "services:moderate",
      "orders:read",
      "reviews:manage"
  ],

  support: [
      "messages:read",
      "messages:reply",
      "users:read",
      "orders:read"
  ],

  moderator: [
      "services:read",
      "services:moderate",
      "messages:read",
      "reviews:manage"
  ],

  senior_support: [
      "users:write",
      "services:moderate"
  ],

  custom: []
};


/*
* Senior Support inherits all Support permissions
* plus its own additional permissions.
*/
const ROLE_HIERARCHY = {
  senior_support: ["support"]
};


/*
* Permissions that are reserved exclusively for Super Admin.
*
* These permissions must never be granted to a normal
* administrator through saved permissions or role presets.
*/
const SUPER_ADMIN_ONLY_PERMISSIONS = new Set([
  "roles:manage",
  "payouts:read"
]);


/**
* Recursively resolves all preset permissions for a role.
*
* Cycle protection prevents accidental infinite recursion if the
* role hierarchy is changed in the future.
*/
const resolveRolePermissions = (role, visited = new Set()) => {
  if (!role || visited.has(role)) {
      return [];
  }

  visited.add(role);

  let permissions = ROLE_PRESETS[role]
      ? [...ROLE_PRESETS[role]]
      : [];

  if (ROLE_HIERARCHY[role]) {
      ROLE_HIERARCHY[role].forEach((parentRole) => {
          permissions = [
              ...permissions,
              ...resolveRolePermissions(parentRole, visited)
          ];
      });
  }

  return [...new Set(permissions)];
};


/**
* Middleware factory for checking a specific administrator permission.
*
* IMPORTANT:
* This middleware expects adminContext.js to have already executed.
*
* Correct middleware order:
*
* auth
* adminContext
* requirePermission("users:read")
*/
const requirePermission = (requiredPermission) => {
  if (
      !requiredPermission ||
      typeof requiredPermission !== "string"
  ) {
      throw new Error(
          "requirePermission() requires a non-empty permission string"
      );
  }

  return (req, res, next) => {
      try {
          /*
           * adminContext.js must resolve req.admin before RBAC
           * authorization can take place.
           */
          if (!req.admin) {
              return res.status(401).json({
                  success: false,
                  message:
                      "Administrator authentication is required."
              });
          }

          const adminRole = (
              req.admin.role || ""
          ).toLowerCase();

          const savedPermissions = Array.isArray(
              req.admin.permissions
          )
              ? req.admin.permissions
              : [];


          /*
           * SUPER ADMIN
           *
           * Only an actual Admin record whose role is
           * super_admin receives unrestricted access.
           *
           * This includes:
           * - payouts
           * - withdrawals
           * - role management
           * - all other permissions
           */
          if (adminRole === "super_admin") {
              return next();
          }


          /*
           * SENSITIVE PERMISSIONS
           *
           * These are permanently reserved for Super Admin.
           *
           * This check happens BEFORE saved permissions are
           * evaluated, preventing a malicious API request from
           * manually assigning either permission.
           */
          if (
              SUPER_ADMIN_ONLY_PERMISSIONS.has(
                  requiredPermission
              )
          ) {
              return res.status(403).json({
                  success: false,
                  message:
                      "Access denied. This permission is reserved exclusively for Super Admins."
              });
          }


          /*
           * Resolve permissions inherited from the role.
           */
          const inheritedPermissions =
              resolveRolePermissions(adminRole);


          /*
           * Combine explicitly stored permissions with
           * role-based permissions.
           */
          const effectivePermissions = new Set([
              ...savedPermissions,
              ...inheritedPermissions
          ]);


          /*
           * Security cleanup:
           *
           * A wildcard stored on a non-super-admin account
           * must NEVER grant unrestricted access.
           */
          effectivePermissions.delete("*");


          /*
           * Explicitly remove all Super Admin-only permissions
           * from non-Super Admin effective permissions.
           *
           * This provides defense in depth even if bad/legacy
           * data exists in MongoDB.
           */
          SUPER_ADMIN_ONLY_PERMISSIONS.forEach(
              (permission) => {
                  effectivePermissions.delete(permission);
              }
          );


          /*
           * Permission granted.
           */
          if (effectivePermissions.has(requiredPermission)) {
              return next();
          }


          /*
           * Permission denied.
           */
          return res.status(403).json({
              success: false,
              message:
                  `Access denied. Requires '${requiredPermission}' permission.`
          });

      } catch (err) {
          console.error(
              "RBAC Middleware Error:",
              err
          );

          return res.status(500).json({
              success: false,
              message:
                  "Server error while checking administrator permissions."
          });
      }
  };
};


module.exports = {
  requirePermission,
  resolveRolePermissions
};