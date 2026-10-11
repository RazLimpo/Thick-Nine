// routes/adminRoutes

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const bcrypt = require('bcryptjs');

const auth = require('../middleware/auth');
const adminContext = require('../middleware/adminContext');
const {
  requirePermission,
  resolveRolePermissions,
} = require('../middleware/rbac');

const User = require('../models/User');
const Service = require('../models/Service');
const Message = require('../models/Message');
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
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
  async (req, res, next) => {
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





// =============================================================================
// EXPRESS — add to routes/adminRoutes.js (near the top, after GENERAL ADMIN)
// GET /api/admin/me
// Returns the Admin RBAC identity for the logged-in staff user.
// =============================================================================

// GET /api/admin/me
router.get(
  "/me",
  auth,
  adminContext,
  async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        admin: {
          id: req.admin.id,
          userId: req.admin.userId,
          name: req.admin.name,
          email: req.admin.email,
          role: req.admin.role, // e.g. "super_admin" | "admin" | "support"
          permissions: req.admin.permissions || [],
          isActive: req.admin.isActive,
        },
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role, // marketplace User.role — should be "admin" for staff
        },
      });
    } catch (err) {
      console.error("Error in GET /api/admin/me:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to load administrator profile.",
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
  async (req, res, next) => {
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

// GET /api/admin/messages/unread-count
router.get(
  "/messages/unread-count",
  auth,
  adminContext,
  requirePermission("messages:read"),
  async (req, res) => {
    try {
      const count = await Message.countDocuments({ status: "unread" });
      return res.status(200).json({
        success: true,
        count,
      });
    } catch (err) {
      console.error("Error counting unread messages:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to count unread messages.",
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
  async (req, res, next) => {
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
// NOTIFICATION COUNTS + FEED (Header bell / sidebar badges)
// ==================================================================

const SUPER_ADMIN_ONLY_PERMISSIONS = new Set([
  'roles:manage',
  'payouts:read',
]);

/**
 * Same effective-permission rules as rbac.js (role presets + saved perms).
 */
function adminCan(req, requiredPermission) {
  if (!req.admin) return false;

  const adminRole = (req.admin.role || '').toLowerCase();
  const savedPermissions = Array.isArray(req.admin.permissions)
    ? req.admin.permissions
    : [];

  if (adminRole === 'super_admin' || savedPermissions.includes('*')) {
    return true;
  }

  if (SUPER_ADMIN_ONLY_PERMISSIONS.has(requiredPermission)) {
    return false;
  }

  const inheritedPermissions = resolveRolePermissions(adminRole);
  const effectivePermissions = new Set([
    ...savedPermissions,
    ...inheritedPermissions,
  ]);

  effectivePermissions.delete('*');
  SUPER_ADMIN_ONLY_PERMISSIONS.forEach((permission) => {
    effectivePermissions.delete(permission);
  });

  return effectivePermissions.has(requiredPermission);
}

// GET /api/admin/notifications/counts
router.get(
  '/notifications/counts',
  auth,
  adminContext,
  async (req, res) => {
    try {
      const counts = {
        messages: 0,
        orders: 0,
        disputes: 0,
        withdrawals: 0,
        clients: 0,
      };

      if (adminCan(req, 'messages:read')) {
        counts.messages = await Message.countDocuments({ status: 'unread' });
      }

      if (adminCan(req, 'orders:read')) {
        counts.orders = await Order.countDocuments({
          status: { $in: ['pending', 'in_escrow', 'disputed', 'revision_requested'] },
        });
        counts.disputes = await Order.countDocuments({ status: 'disputed' });
      }

      if (adminCan(req, 'payouts:read')) {
        counts.withdrawals = await Transaction.countDocuments({
          type: 'withdrawal',
          status: 'pending',
        });
      }
      
      if (adminCan(req, "users:read")) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  counts.clients = await User.countDocuments({
    role: "client",
    $or: [
      { createdAt: { $gte: sevenDaysAgo } },
      { isEmailVerified: false },
    ],
  });
}

      return res.status(200).json({
        success: true,
        counts,
      });
    } catch (err) {
      console.error('Error loading notification counts:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load notification counts.',
      });
    }
  }
);

// GET /api/admin/notifications/feed
// Bell dropdown: orders + withdrawals only (not messages)
router.get(
  '/notifications/feed',
  auth,
  adminContext,
  async (req, res) => {
    try {
      const items = [];

      if (adminCan(req, 'orders:read')) {
        const orders = await Order.find({
          status: { $in: ['pending', 'in_escrow', 'disputed', 'revision_requested'] },
        })
          .sort({ updatedAt: -1 })
          .limit(15)
          .select('_id status grandTotal createdAt updatedAt disputedAt')
          .lean();

        for (const o of orders) {
          let title = 'Order update';
          if (o.status === 'disputed') title = 'Order disputed';
          else if (o.status === 'in_escrow') title = 'Order in escrow';
          else if (o.status === 'revision_requested') title = 'Revision requested';
          else title = 'New pending order';
          items.push({
            id: String(o._id),
            type: o.status === 'disputed' ? 'dispute' : 'order',
            title,
            subtitle: `Order #${String(o._id).slice(-6)} · $${Number(
              o.grandTotal || 0
            ).toFixed(2)}`,
            href: o.status === 'disputed' ? '/admin/orders?status=disputed' : '/admin/orders',
            createdAt: o.disputedAt || o.updatedAt || o.createdAt,
          });
        }
      }

      if (adminCan(req, 'payouts:read')) {
        const withdrawals = await Transaction.find({
          type: 'withdrawal',
          status: 'pending',
        })
          .sort({ createdAt: -1 })
          .limit(15)
          .select('_id amount status createdAt description')
          .lean();

        for (const w of withdrawals) {
          items.push({
            id: String(w._id),
            type: 'withdrawal',
            title: 'Withdrawal request',
            subtitle: `$${Number(w.amount || 0).toFixed(2)}${
              w.description ? ` · ${w.description}` : ''
            }`,
            href: '/admin/withdrawals',
            createdAt: w.createdAt,
          });
        }
      }

      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.status(200).json({
        success: true,
        items: items.slice(0, 20),
      });
    } catch (err) {
      console.error('Error loading notification feed:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load notification feed.',
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
  'orders:write',

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
  if (
  cleanedPermissions.includes('roles:manage') ||
  cleanedPermissions.includes('payouts:read')
) {
  return {
    valid: false,
    permissions: [],
    message:
      'The roles:manage and payouts:read permissions cannot be assigned manually.',
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
  async (req, res, next) => {
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
const hashedUserPassword = await bcrypt.hash(password, 10);

createdUser = await User.create({
  fullName: normalizedName,
  email: normalizedEmail,
  password: hashedUserPassword,
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
  async (req, res, next) => {
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
  async (req, res, next) => {
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
  async (req, res, next) => {
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




// ==================================================================
// ORDERS & DISPUTES
// ==================================================================

// GET /api/admin/orders?status=&q=
router.get(
  '/orders',
  auth,
  adminContext,
  requirePermission('orders:read'),
  async (req, res) => {
    try {
      const filter = {};
      const status = String(req.query.status || '').trim();
      if (status && status !== 'all') {
        filter.status = status;
      }
      const q = String(req.query.q || '').trim();
      if (q && mongoose.Types.ObjectId.isValid(q)) {
        filter._id = q;
      }

      const orders = await Order.find(filter)
        .sort({ updatedAt: -1 })
        .limit(100)
        .populate('clientId', 'fullName displayName email avatar')
        .populate('sellerId', 'fullName displayName email avatar')
        .populate('serviceId', 'title')
        .lean();

      let totalVolume = 0;
      let grossAdminProfit = 0;
      let inEscrow = 0;
      let disputedCount = 0;

      for (const o of orders) {
        totalVolume += Number(o.grandTotal) || 0;
        grossAdminProfit +=
          (Number(o.buyerServiceFee) || 0) + (Number(o.sellerPlatformFee) || 0);
        if (['pending', 'in_escrow', 'revision_requested'].includes(o.status)) {
          inEscrow += Number(o.grandTotal) || 0;
        }
        if (o.status === 'disputed') disputedCount += 1;
      }

      // If filtered list is partial, still compute platform-wide disputed for summary
      const disputedTotal =
        status === 'disputed'
          ? orders.length
          : await Order.countDocuments({ status: 'disputed' });

      return res.status(200).json({
        success: true,
        orders,
        summary: {
          totalOrders: orders.length,
          totalVolume,
          grossAdminProfit,
          inEscrow,
          disputedCount: disputedTotal,
        },
      });
    } catch (err) {
      console.error('GET /api/admin/orders error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load orders.',
      });
    }
  }
);

// POST /api/admin/orders/:id/resolve-dispute
// Body: { resolution: 'refund_buyer'|'pay_seller'|'partial'|'withdrawn', note?: string, partialAmount?: number }
router.post(
  '/orders/:id/resolve-dispute',
  auth,
  adminContext,
  requirePermission('orders:read'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const resolution = String(req.body?.resolution || '').trim();
      const note = String(req.body?.note || '').trim().slice(0, 2000);
      const partialAmount = Number(req.body?.partialAmount);

      const allowed = ['refund_buyer', 'pay_seller', 'partial', 'withdrawn'];
      if (!allowed.includes(resolution)) {
        return res.status(400).json({
          success: false,
          message:
            'resolution must be refund_buyer, pay_seller, partial, or withdrawn.',
        });
      }
      if (resolution === 'partial' && (!Number.isFinite(partialAmount) || partialAmount < 0)) {
        return res.status(400).json({
          success: false,
          message: 'partialAmount is required for partial resolution.',
        });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
      if (order.status !== 'disputed') {
        return res.status(400).json({
          success: false,
          message: `Order is not disputed (status: ${order.status}).`,
        });
      }

      order.disputeResolution = resolution;
      order.disputeResolvedAt = new Date();
      if (note) {
        order.disputeReason = `${order.disputeReason || ''}\n\n[Admin resolution] ${note}`.slice(0, 2000);
      }

      // Outcome mapping (ledger/payout automation can hook here later)
      if (resolution === 'refund_buyer' || resolution === 'withdrawn') {
        order.status = 'cancelled';
      } else if (resolution === 'pay_seller') {
        order.status = 'completed';
        if (!order.escrowReleaseDate) {
          const release = new Date();
          release.setDate(release.getDate() + 14);
          order.escrowReleaseDate = release;
        }
      } else if (resolution === 'partial') {
        // Keep completed for seller portion; note amount for finance
        order.status = 'completed';
        order.deliveryNote = `${order.deliveryNote || ''}\nPartial resolve amount: $${partialAmount}`.slice(0, 2000);
        if (!order.escrowReleaseDate) {
          const release = new Date();
          release.setDate(release.getDate() + 14);
          order.escrowReleaseDate = release;
        }
      }

      await order.save();

      try {
        const Notification = require('../models/Notification');
        const short = String(order._id).slice(-6).toUpperCase();
        const msg = `Dispute on order #${short} resolved: ${resolution.replace(/_/g, ' ')}.`;
        await Notification.create({
          userId: order.clientId,
          type: 'dispute_resolved',
          title: 'Dispute resolved',
          message: msg,
          link: `/orders/${order._id}`,
          orderId: order._id,
          read: false,
        });
        await Notification.create({
          userId: order.sellerId,
          type: 'dispute_resolved',
          title: 'Dispute resolved',
          message: msg,
          link: `/orders/${order._id}`,
          orderId: order._id,
          read: false,
        });
      } catch (_) {}

      try {
        await AuditLog.create({
          actor: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
          },
          target: {
            id: order._id,
            name: `Order #${String(order._id).slice(-6)}`,
            email: '',
            role: resolution,
          },
          action: 'dispute_resolved',
          oldPermissions: [],
          newPermissions: [],
          details: `Resolved dispute as ${resolution}. ${note || ''}`.trim(),
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: 'Dispute resolved.',
        order: {
          _id: order._id,
          status: order.status,
          disputeResolution: order.disputeResolution,
          disputeResolvedAt: order.disputeResolvedAt,
        },
      });
    } catch (err) {
      console.error('resolve-dispute error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to resolve dispute.',
      });
    }
  }
);


// ==================================================================
// CLIENT MODERATION
// ==================================================================

// PATCH /api/admin/clients/:id/status
// Body: { status: 'active'|'suspended'|'pending', warn?: boolean, warnMessage?: string }
router.patch(
  '/clients/:id/status',
  auth,
  adminContext,
  requirePermission('users:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const status = String(req.body?.status || '').trim();
      const allowed = ['active', 'suspended', 'pending'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'status must be active, suspended, or pending.',
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Use administrator management for staff accounts.',
        });
      }

      const prev = user.status || user.accountStatus || 'active';
      // Support either status or accountStatus field names
      if (user.schema.path('status')) {
        user.status = status;
      }
      if (user.schema.path('accountStatus')) {
        user.accountStatus = status;
      }
      // Common flags
      if (typeof user.isSuspended === 'boolean' || 'isSuspended' in user) {
        user.isSuspended = status === 'suspended';
      }
      await user.save();

      if (req.body?.warn) {
        const warnMessage = String(
          req.body?.warnMessage ||
            'Your account is under review due to suspicious activity. Contact support if you have questions.'
        ).slice(0, 500);
        try {
          const Notification = require('../models/Notification');
          await Notification.create({
            userId: user._id,
            type: 'account_warning',
            title: 'Account warning',
            message: warnMessage,
            link: '/messages',
            read: false,
          });
        } catch (_) {}
      }

      try {
        await AuditLog.create({
          actor: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
          },
          target: {
            id: user._id,
            name: user.fullName || user.displayName || '',
            email: user.email || '',
            role: user.role || 'user',
          },
          action: 'user_status_changed',
          oldPermissions: [],
          newPermissions: [],
          details: `Status ${prev} → ${status}${req.body?.warn ? ' (+ warning)' : ''}`,
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: `User status set to ${status}.`,
        client: {
          _id: user._id,
          status,
        },
      });
    } catch (err) {
      console.error('PATCH client status error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user status.',
      });
    }
  }
);

// POST /api/admin/clients/:id/warn
router.post(
  '/clients/:id/warn',
  auth,
  adminContext,
  requirePermission('users:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const message = String(
        req.body?.message ||
          'Warning: activity on your account was flagged as suspicious. Further issues may result in suspension.'
      ).slice(0, 500);

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      try {
        const Notification = require('../models/Notification');
        await Notification.create({
          userId: user._id,
          type: 'account_warning',
          title: 'Account warning',
          message,
          link: '/messages',
          read: false,
        });
      } catch (e) {
        return res.status(500).json({
          success: false,
          message: 'Notification model unavailable; could not send warning.',
        });
      }

      try {
        await AuditLog.create({
          actor: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
          },
          target: {
            id: user._id,
            name: user.fullName || '',
            email: user.email || '',
            role: user.role || 'user',
          },
          action: 'user_warned',
          oldPermissions: [],
          newPermissions: [],
          details: message,
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: 'Warning sent to user.',
      });
    } catch (err) {
      console.error('POST client warn error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to warn user.',
      });
    }
  }
);

// DELETE /api/admin/clients/:id — soft-delete preferred (suspend + anonymize flag)
router.delete(
  '/clients/:id',
  auth,
  adminContext,
  requirePermission('users:write'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const hard = String(req.query.hard || '') === '1';

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete administrator accounts here.',
        });
      }

      if (hard) {
        await User.findByIdAndDelete(id);
      } else {
        // Soft delete
        if (user.schema.path('status')) user.status = 'suspended';
        if (user.schema.path('accountStatus')) user.accountStatus = 'suspended';
        user.isSuspended = true;
        user.email = `deleted_${Date.now()}_${user.email || id}`;
        if (user.fullName) user.fullName = 'Deleted User';
        if (user.displayName) user.displayName = 'Deleted User';
        await user.save();
      }

      try {
        await AuditLog.create({
          actor: {
            id: req.admin.id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
          },
          target: {
            id: user._id,
            name: user.fullName || '',
            email: user.email || '',
            role: user.role || 'user',
          },
          action: hard ? 'user_hard_deleted' : 'user_soft_deleted',
          oldPermissions: [],
          newPermissions: [],
          details: hard ? 'Hard deleted' : 'Soft deleted / suspended',
        });
      } catch (_) {}

      return res.status(200).json({
        success: true,
        message: hard ? 'User permanently deleted.' : 'User soft-deleted and suspended.',
      });
    } catch (err) {
      console.error('DELETE client error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user.',
      });
    }
  }
);


module.exports = router;