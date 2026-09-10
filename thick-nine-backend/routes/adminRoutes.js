// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Message = require('../models/Message'); 
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const { requirePermission } = require('../middleware/rbac');

// ==================================================================
// GENERAL ADMIN ROUTES
// ==================================================================

// GET /api/admin/stats
router.get('/stats', auth, requirePermission('users:read'), async (req, res) => {
  try {
    const totalClients = await User.countDocuments({ role: 'client' });

    const pendingPayoutsAgg = await Service.aggregate([
      { $match: { status: 'pending_payout' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const revenueAgg = await Service.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalClients,
        pendingPayouts: pendingPayoutsAgg[0]?.total || 0,
        platformRevenue: revenueAgg[0]?.total || 0
      }
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/messages
router.get('/messages', auth, requirePermission('messages:read'), async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('senderId', 'fullName email avatar')
      .populate({ path: 'repliedBy', model: 'Admin', select: 'name email' })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      messages: messages || []
    });
  } catch (err) {
    console.error('Error fetching admin messages:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
});

// POST /api/admin/messages/reply
router.post('/messages/reply', auth, requirePermission('messages:reply'), async (req, res) => {
  try {
    const { messageId, replyText } = req.body;

    if (!messageId || !replyText) {
      return res.status(400).json({ success: false, message: 'Message ID and reply text are required.' });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        adminReply: replyText,
        repliedBy: req.user.id,
        status: 'replied',
        repliedAt: new Date(),
      },
      { new: true }
    ).populate('senderId', 'email fullName');

    if (!updatedMessage) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Reply saved successfully.',
      data: updatedMessage,
    });
  } catch (err) {
    console.error('Error replying to message:', err);
    return res.status(500).json({ success: false, message: 'Server error processing reply.' });
  }
});

// ==================================================================
// SUB-ADMIN & SUPER ADMIN MANAGEMENT ROUTES
// ==================================================================

// 1. POST /api/admin/sub-admins - Create Admin
router.post('/sub-admins', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const { name, email, password, permissions, role = 'custom' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'An admin with this email already exists.' });
    }

    const finalPermissions = role === 'super_admin' ? ['*'] : (permissions || []);

    // Pass plain password to Admin.create so schema pre('save') hook handles hashing safely
    const newAdmin = await Admin.create({
      name,
      email,
      password, 
      role,
      permissions: finalPermissions,
    });

    // ========== AUDIT LOG ==========
    await AuditLog.create({
      actor: {
        id: req.user.id || req.user._id,
        name: req.user.name || req.user.fullName || 'Admin User',
        email: req.user.email,
        role: req.user.role,
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
      details: `Created new ${role} account`,
    });
    // ===============================

    return res.status(201).json({
      success: true,
      message: `${role === 'super_admin' ? 'Super Admin' : 'Admin'} created successfully.`,
      data: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions,
      },
    });
  } catch (err) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ success: false, message: 'Server error creating admin account.' });
  }
});

// 2. GET /api/admin/sub-admins - List Admins
router.get('/sub-admins', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const subAdmins = await Admin.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: subAdmins,
    });
  } catch (err) {
    console.error('Error fetching admins:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve admins.' });
  }
});

// 3. PUT /api/admin/sub-admins/:id/permissions - Update Admin
router.put('/sub-admins/:id/permissions', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const { permissions, isActive, role } = req.body;

    const existingAdmin = await Admin.findById(req.params.id);
    if (!existingAdmin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    // Protection: Don't allow modification of super_admin unless executing user is also super_admin
    if (existingAdmin.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify Super Admin accounts.' });
    }

    const oldPermissions = [...existingAdmin.permissions];

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      {
        ...(role && { role }),
        ...(permissions && { permissions: role === 'super_admin' ? ['*'] : permissions }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
      { new: true }
    ).select('-password');

    // ========== AUDIT LOG ==========
    await AuditLog.create({
      actor: {
        id: req.user.id || req.user._id,
        name: req.user.name || req.user.fullName || 'Admin User',
        email: req.user.email,
        role: req.user.role,
      },
      target: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
      },
      action: permissions ? 'permissions_updated' : 'status_changed',
      oldPermissions,
      newPermissions: updatedAdmin.permissions,
      details: role
        ? `Role updated to ${role}`
        : permissions
        ? 'Permissions were updated'
        : `Status changed to ${updatedAdmin.isActive ? 'Active' : 'Disabled'}`,
    });
    // ===============================

    return res.status(200).json({
      success: true,
      message: 'Admin updated successfully.',
      data: updatedAdmin,
    });
  } catch (err) {
    console.error('Error updating admin:', err);
    return res.status(500).json({ success: false, message: 'Server error updating admin.' });
  }
});

// 4. GET /api/admin/audit-logs - View Audit History
router.get('/audit-logs', auth, requirePermission('roles:manage'), async (req, res) => {
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
});

module.exports = router;