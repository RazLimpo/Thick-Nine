// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Message = require('../models/Message'); 
const Admin = require('../models/Admin');
const { requirePermission } = require('../middleware/rbac');
// const { sendNotificationEmail } = require('../utils/emailService'); // Import your email helper here when ready

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'sub_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
    }

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

// GET /api/admin/messages - Protected by 'messages:read'
router.get('/messages', auth, requirePermission('messages:read'), async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('senderId', 'fullName email avatar')
      .populate('repliedBy', 'fullName email')
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

// POST /api/admin/messages/reply - Protected by 'messages:reply'
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
// SUB-ADMIN MANAGEMENT ROUTES (Protected by 'roles:manage')
// ==================================================================

// 1. POST /api/admin/sub-admins - Create a new Sub-Admin
router.post('/sub-admins', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'An admin with this email already exists.' });
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newSubAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: 'sub_admin',
      permissions: permissions || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully.',
      data: {
        id: newSubAdmin._id,
        name: newSubAdmin.name,
        email: newSubAdmin.email,
        role: newSubAdmin.role,
        permissions: newSubAdmin.permissions,
      },
    });
  } catch (err) {
    console.error('Error creating sub-admin:', err);
    return res.status(500).json({ success: false, message: 'Server error creating sub-admin.' });
  }
});

// 2. GET /api/admin/sub-admins - List all Sub-Admins
router.get('/sub-admins', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const subAdmins = await Admin.find({ role: 'sub_admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: subAdmins,
    });
  } catch (err) {
    console.error('Error fetching sub-admins:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve sub-admins.' });
  }
});

// 3. PUT /api/admin/sub-admins/:id/permissions - Update permissions or status
router.put('/sub-admins/:id/permissions', auth, requirePermission('roles:manage'), async (req, res) => {
  try {
    const { permissions, isActive } = req.body;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      {
        ...(permissions && { permissions }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
      { new: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: 'Sub-admin not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Sub-admin permissions updated successfully.',
      data: updatedAdmin,
    });
  } catch (err) {
    console.error('Error updating sub-admin:', err);
    return res.status(500).json({ success: false, message: 'Server error updating sub-admin.' });
  }
});

module.exports = router;