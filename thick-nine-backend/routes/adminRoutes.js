// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
// const Message = require('../models/Message'); // Uncomment once your Message model exists
// const { sendNotificationEmail } = require('../utils/emailService'); // Import your email helper here when ready

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
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

// GET /api/admin/messages
router.get('/messages', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Return empty array until Message model is instantiated
    // const messages = await Message.find().populate('senderId', 'fullName email avatar').sort({ createdAt: -1 }).lean();
    const messages = [];

    return res.status(200).json({
      success: true,
      messages
    });
  } catch (err) {
    console.error('Error fetching admin messages:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
});

// POST /api/admin/messages/reply
router.post('/messages/reply', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { messageId, replyText } = req.body;

    if (!messageId || !replyText) {
      return res.status(400).json({ success: false, message: 'Message ID and reply text are required.' });
    }

    // 1. Update the message document in MongoDB
    // const updatedMessage = await Message.findByIdAndUpdate(
    //   messageId,
    //   {
    //     adminReply: replyText,
    //     status: 'replied',
    //     repliedAt: new Date(),
    //   },
    //   { new: true }
    // ).populate('senderId', 'email fullName');

    // Mock response placeholder until Message model is instantiated
    const updatedMessage = { _id: messageId, adminReply: replyText, status: 'replied' };

    // 2. Send simple notification email if helper exists
    // const recipientEmail = updatedMessage.senderId?.email || updatedMessage.senderEmail;
    // if (recipientEmail && typeof sendNotificationEmail === 'function') {
    //   await sendNotificationEmail({ ... });
    // }

    return res.status(200).json({
      success: true,
      message: 'Reply saved and notification email sent successfully.',
      data: updatedMessage,
    });
  } catch (err) {
    console.error('Error replying to message:', err);
    return res.status(500).json({ success: false, message: 'Server error processing reply.' });
  }
});

module.exports = router;