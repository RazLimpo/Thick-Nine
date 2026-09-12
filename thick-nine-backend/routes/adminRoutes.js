const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const adminContext = require('../middleware/adminContext');
const { requirePermission } = require('../middleware/rbac');

const User = require('../models/User');
const Service = require('../models/Service');
const Message = require('../models/Message');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');

// ==================================================================
// ADMIN ROUTE SECURITY
// ==================================================================
//
// Authentication flow:
//
// JWT
//   ↓
// auth middleware
//   ↓
// req.user
//   ↓
// adminContext
//   ↓
// req.admin
//   ↓
// RBAC permission check
//
// User remains the authentication identity.
// Admin remains the RBAC identity.
// ==================================================================


// ==================================================================
// GENERAL ADMIN ROUTES
// ==================================================================

// GET /api/admin/stats
router.get(
  '/stats',
  auth,
  adminContext,
  requirePermission('users:read'),
  async (req, res) => {
    try {
      const totalClients = await User.countDocuments({
        role: 'client',
      });

      const pendingPayoutsAgg = await Service.aggregate([
        {
          $match: {
            status: 'pending_payout',
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$price',
            },
          },
        },
      ]);

      const revenueAgg = await Service.aggregate([
        {
          $match: {
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$price',
            },
          },
        },
      ]);

      return res.status(200).json({
        success: true,
        stats: {
          totalClients,
          pendingPayouts: pendingPayoutsAgg[0]?.total || 0,
          platformRevenue: revenueAgg[0]?.total || 0,
        },
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve stats.',
      });
    }
  }
);


// ==================================================================
// ADMIN MESSAGES
// ==================================================================

// GET /api/admin/messages
router.get(
  '/messages',
  auth,
  adminContext,
  requirePermission('messages:read'),
  async (req, res) => {
    try {
      const messages = await Message.find()
        .populate('senderId', 'fullName email avatar')
        .populate({
          path: 'repliedBy',
          model: 'Admin',
          select: 'name email',
        })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        messages: messages || [],
      });
    } catch (err) {
      console.error('Error fetching admin messages:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages.',
      });
    }
  }
);


// POST /api/admin/messages/reply
router.post(
  '/messages/reply',
  auth,
  adminContext,
  requirePermission('messages:reply'),
  async (req, res) => {
    try {
      const { messageId, replyText } = req.body;

      if (!messageId || !replyText || !String(replyText).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message ID and reply text are required.',
        });
      }

      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        {
          adminReply: String(replyText).trim(),

          // Message.repliedBy references Admin,
          // so use the Admin identity rather than User identity.
          repliedBy: req.admin.id,

          status: 'replied',
          repliedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate('senderId', 'email fullName');

      if (!updatedMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message not found.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Reply saved successfully.',
        data: updatedMessage,
      });
    } catch (err) {
      console.error('Error replying to message:', err);

      return res.status(500).json({
        success: false,
        message: 'Server error processing reply.',
      });
    }
  }
);


// ==================================================================
// ADMIN / SUB-ADMIN MANAGEMENT
// ==================================================================
//
// Only administrators with roles:manage can access these routes.
//
// The RBAC middleware reserves roles:manage for super_admin.
// Therefore these management operations are effectively
// Super Admin operations unless that policy is deliberately changed.
// ==================================================================


// ------------------------------------------------------------------
// Allowed permissions
// ------------------------------------------------------------------

const ALLOWED_PERMISSIONS = new Set([
  'users:read',
  'users:write',

  'messages:read',
  'messages:reply',

  'payouts:read',

  'services:read',
  'services:moderate',

  'orders:read',

  'reviews:manage',
]);


// ------------------------------------------------------------------
// Allowed administrator roles
// ------------------------------------------------------------------

const ALLOWED_ROLES = new Set([
  'super_admin',
  'admin',
  'support',
  'moderator',
  'senior_support',
  'custom',
  'sub_admin',
]);


// ------------------------------------------------------------------
// Validate and sanitize permissions
// ------------------------------------------------------------------

function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return {
      valid: false,
      permissions: [],
      message: 'Permissions must be an array.',
    };
  }

  const cleanedPermissions = [
    ...new Set(
      permissions
        .filter((permission) => typeof permission === 'string')
        .map((permission) => permission.trim())
        .filter(Boolean)
    ),
  ];

  // Wildcard is reserved exclusively for super_admin.
  if (cleanedPermissions.includes('*')) {
    return {
      valid: false,
      permissions: [],
      message: 'Wildcard permissions are reserved for Super Admin.',
    };
  }

  // roles:manage is intentionally not assignable to normal admins.
  if (cleanedPermissions.includes('roles:manage')) {
    return {
      valid: false,
      permissions: [],
      message: 'The roles:manage permission cannot be assigned manually.',
    };
  }

  const invalidPermission = cleanedPermissions.find(
    (permission) => !ALLOWED_PERMISSIONS.has(permission)
  );

  if (invalidPermission) {
    return {
      valid: false,
      permissions: [],
      message: `Invalid permission: ${invalidPermission}`,
    };
  }

  return {
    valid: true,
    permissions: cleanedPermissions,
    message: null,
  };
}


// ==================================================================
// CREATE ADMIN
// ==================================================================

// POST /api/admin/sub-admins
router.post(
  '/sub-admins',
  auth,
  adminContext,
  requirePermission('roles:manage'),
  async (req, res) => {
    let createdUser = null;

    try {
      const {
        name,
        email,
        password,
        permissions,
        role = 'custom',
      } = req.body;

      // ------------------------------------------------------------
      // Basic validation
      // ------------------------------------------------------------

      if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof email !== 'string' ||
        !email.trim() ||
        typeof password !== 'string' ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required.',
        });
      }

      const normalizedName = name.trim();
      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedName.length < 2 || normalizedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 100 characters.',
        });
      }

      if (normalizedEmail.length > 254) {
        return res.status(400).json({
          success: false,
          message: 'Email address is too long.',
        });
      }

      if (password.length < 6 || password.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Password must be between 6 and 100 characters.',
        });
      }

      if (!ALLOWED_ROLES.has(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid administrator role.',
        });
      }

      // ------------------------------------------------------------
      // Validate permissions
      // ------------------------------------------------------------

      let finalPermissions = [];

      if (role === 'super_admin') {
        // Never accept the wildcard from the client.
        // The server assigns it.
        finalPermissions = ['*'];
      } else {
        const permissionResult = sanitizePermissions(
          permissions === undefined ? [] : permissions
        );

        if (!permissionResult.valid) {
          return res.status(400).json({
            success: false,
            message: permissionResult.message,
          });
        }

        finalPermissions = permissionResult.permissions;
      }

      // ------------------------------------------------------------
      // Check for existing Admin
      // ------------------------------------------------------------

      const existingAdmin = await Admin.findOne({
        email: normalizedEmail,
      });

      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'An administrator with this email already exists.',
        });
      }

      // ------------------------------------------------------------
      // Check existing User account
      // ------------------------------------------------------------

      const existingUser = await User.findOne({
        email: normalizedEmail,
      });

      if (existingUser) {
        // Never silently promote an existing marketplace account.
        return res.status(409).json({
          success: false,
          message:
            'A user account with this email already exists. Use the existing account promotion/bootstrap process instead of creating a new administrator account.',
        });
      }

      // ------------------------------------------------------------
      // Create the authenticated User account
      // ------------------------------------------------------------
      //
      // Admin login uses /api/auth/login, which authenticates against
      // User. Therefore every newly-created administrator must also
      // have a corresponding User record.
      //
      // The User password is passed as plain text because the User
      // model/authentication layer is responsible for its hashing.
      // ------------------------------------------------------------

      createdUser = await User.create({
        fullName: normalizedName,
        email: normalizedEmail,
        password,
        role: 'admin',
        isEmailVerified: false,
      });

      // ------------------------------------------------------------
      // Create the RBAC Admin record
      // ------------------------------------------------------------

      const newAdmin = await Admin.create({
        name: normalizedName,
        email: normalizedEmail,
        password,
        role,
        permissions: finalPermissions,
        isActive: true,
      });

      // ------------------------------------------------------------
      // Audit log
      // ------------------------------------------------------------

      await AuditLog.create({
        actor: {
          id: req.admin.id,
          name: req.admin.name,
          email: req.admin.email,
          role: req.admin.role,
        },

        target: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },

        action: 'admin_created',

        oldPermissions: [],

        newPermissions: finalPermissions,

        details: `Created new ${role} administrator account.`,
      });

      return res.status(201).json({
        success: true,

        message:
          role === 'super_admin'
            ? 'Super Admin created successfully.'
            : 'Administrator created successfully.',

        data: {
          id: newAdmin._id,
          userId: createdUser._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          permissions: newAdmin.permissions,
          isActive: newAdmin.isActive,
        },
      });
    } catch (err) {
      console.error('Error creating administrator:', err);

      // ------------------------------------------------------------
      // Basic rollback protection
      // ------------------------------------------------------------
      //
      // If the Admin document fails after the User was created,
      // remove the newly-created User so we don't leave an orphaned
      // admin login account.
      // ------------------------------------------------------------

      if (createdUser?._id) {
        try {
          await User.findByIdAndDelete(createdUser._id);
        } catch (rollbackError) {
          console.error(
            'Failed to roll back administrator User account:',
            rollbackError
          );
        }
      }

      // Duplicate key protection.
      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error creating administrator account.',
      });
    }
  }
);


// ==================================================================
// LIST ADMINS
// ==================================================================

// GET /api/admin/sub-admins
router.get(
  '/sub-admins',
  auth,
  adminContext,
  requirePermission('roles:manage'),
  async (req, res) => {
    try {
      const subAdmins = await Admin.find({})
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        data: subAdmins,
      });
    } catch (err) {
      console.error('Error fetching administrators:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve administrators.',
      });
    }
  }
);


// ==================================================================
// UPDATE ADMIN
// ==================================================================

// PUT /api/admin/sub-admins/:id/permissions
router.put(
  '/sub-admins/:id/permissions',
  auth,
  adminContext,
  requirePermission('roles:manage'),
  async (req, res) => {
    try {
      const { permissions, isActive, role } = req.body;

      // ------------------------------------------------------------
      // Validate target ID
      // ------------------------------------------------------------

      if (!req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Administrator ID is required.',
        });
      }

      const existingAdmin = await Admin.findById(req.params.id);

      if (!existingAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Administrator not found.',
        });
      }

      // ------------------------------------------------------------
      // Prevent an administrator from modifying their own account
      // through this management endpoint.
      // ------------------------------------------------------------

      if (String(existingAdmin._id) === String(req.admin.id)) {
        return res.status(403).json({
          success: false,
          message:
            'You cannot modify your own administrator account from this endpoint.',
        });
      }

      // ------------------------------------------------------------
      // Validate role when supplied
      // ------------------------------------------------------------

      if (role !== undefined && !ALLOWED_ROLES.has(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid administrator role.',
        });
      }

      // ------------------------------------------------------------
      // Protect Super Admin accounts
      // ------------------------------------------------------------

      if (
        existingAdmin.role === 'super_admin' &&
        req.admin.role !== 'super_admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify a Super Admin account.',
        });
      }

      // ------------------------------------------------------------
      // Determine the new role
      // ------------------------------------------------------------

      const newRole =
        role !== undefined
          ? role
          : existingAdmin.role;

      // ------------------------------------------------------------
      // Determine new permissions
      // ------------------------------------------------------------

      let newPermissions = [...(existingAdmin.permissions || [])];

      if (newRole === 'super_admin') {
        // Server-controlled wildcard.
        newPermissions = ['*'];
      } else if (role !== undefined) {
        // A role change must not retain permissions from the old role.
        //
        // If the frontend supplied a new permission array, validate it.
        // Otherwise the new role starts with no explicitly stored
        // permissions.
        if (permissions === undefined) {
          newPermissions = [];
        } else {
          const permissionResult =
            sanitizePermissions(permissions);

          if (!permissionResult.valid) {
            return res.status(400).json({
              success: false,
              message: permissionResult.message,
            });
          }

          newPermissions = permissionResult.permissions;
        }
      } else if (permissions !== undefined) {
        // Permission-only update.
        const permissionResult =
          sanitizePermissions(permissions);

        if (!permissionResult.valid) {
          return res.status(400).json({
            success: false,
            message: permissionResult.message,
          });
        }

        newPermissions = permissionResult.permissions;
      }

      // ------------------------------------------------------------
      // Prevent accidental empty permission assignment where the
      // caller is explicitly changing permissions for a non-super
      // admin.
      //
      // The frontend/schema can enforce more specific role rules.
      // Backend security does not require every role to have at
      // least one permission because role inheritance may provide
      // permissions through RBAC.
      // ------------------------------------------------------------

      // ------------------------------------------------------------
      // Determine active state
      // ------------------------------------------------------------

      let newIsActive = existingAdmin.isActive;

      if (typeof isActive === 'boolean') {
        newIsActive = isActive;
      }

      // ------------------------------------------------------------
      // Never allow a Super Admin to be disabled accidentally through
      // this endpoint.
      // ------------------------------------------------------------

      if (
        existingAdmin.role === 'super_admin' &&
        newIsActive === false
      ) {
        return res.status(403).json({
          success: false,
          message: 'A Super Admin account cannot be disabled.',
        });
      }

     
          // ------------------------------------------------------------
      // Update Admin record
      // ------------------------------------------------------------

      const oldRole = existingAdmin.role;

      const oldPermissions = [
        ...(existingAdmin.permissions || []),
      ];

      const oldIsActive = existingAdmin.isActive;

      const roleChanged =
        oldRole !== newRole;

      const permissionsChanged =
        JSON.stringify(oldPermissions) !==
        JSON.stringify(newPermissions);

      const statusChanged =
        oldIsActive !== newIsActive;

      existingAdmin.role = newRole;
      existingAdmin.permissions = newPermissions;
      existingAdmin.isActive = newIsActive;

      const updatedAdmin = await existingAdmin.save();

      // ------------------------------------------------------------
      // Keep corresponding User role synchronized
      // ------------------------------------------------------------

      //
      // Admin RBAC records are linked to User accounts by normalized
      // email in the current architecture.
      //
      // The Admin model does not yet have userId, so email remains
      // the bridge.
      //

      const correspondingUser = await User.findOne({
        email: updatedAdmin.email.toLowerCase().trim(),
      });

      if (!correspondingUser) {
        console.error(
          'Administrator/User synchronization error:',
          updatedAdmin.email
        );

        try {
          existingAdmin.role = oldRole;
          existingAdmin.permissions = oldPermissions;
          existingAdmin.isActive = oldIsActive;

          await existingAdmin.save();
        } catch (rollbackError) {
          console.error(
            'Failed to roll back administrator update:',
            rollbackError
          );
        }

        return res.status(500).json({
          success: false,
          message:
            'Administrator was not updated because its authenticated User account could not be found.',
        });
      }

      // Admin RBAC is represented by User.role = admin.
      if (correspondingUser.role !== 'admin') {
        correspondingUser.role = 'admin';
        await correspondingUser.save();
      }

      // ------------------------------------------------------------
      // Audit action
      // ------------------------------------------------------------

      let auditAction = 'permissions_updated';
      let auditDetails = 'Administrator permissions were updated.';

      if (roleChanged) {
        auditAction = 'permissions_updated';
        auditDetails = `Administrator role changed from ${oldRole} to ${newRole}.`;
      } else if (statusChanged) {
        auditAction = 'status_changed';
        auditDetails = `Administrator status changed to ${
          newIsActive ? 'Active' : 'Disabled'
        }.`;
      }

      await AuditLog.create({
        actor: {
          id: req.admin.id,
          name: req.admin.name,
          email: req.admin.email,
          role: req.admin.role,
        },

        target: {
          id: updatedAdmin._id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
        },

        action: auditAction,

        oldPermissions,

        newPermissions: updatedAdmin.permissions,

        details: auditDetails,
      });

      return res.status(200).json({
        success: true,
        message: 'Administrator updated successfully.',
        data: {
          id: updatedAdmin._id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          permissions: updatedAdmin.permissions,
          isActive: updatedAdmin.isActive,
        },
      });
    } catch (err) {
      console.error('Error updating administrator:', err);

      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error updating administrator.',
      });
    }
  }
);


// ==================================================================
// AUDIT LOGS
// ==================================================================

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  auth,
  adminContext,
  requirePermission('roles:manage'),
  async (req, res) => {
    try {
      const logs = await AuditLog.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      return res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs.',
      });
    }
  }
);


module.exports = router;