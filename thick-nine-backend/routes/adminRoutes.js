// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Message = require('../models/Message'); 
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

    // Fetches real messages from MongoDB sorted by newest first
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

    // 1. Update the message document directly in MongoDB
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

    // 2. Optional: Send notification email if helper is active
    // const recipientEmail = updatedMessage.senderId?.email || updatedMessage.senderEmail;
    // if (recipientEmail && typeof sendNotificationEmail === 'function') {
    //   await sendNotificationEmail({
    //     to: recipientEmail,
    //     subject: 'You have a new reply to your message',
    //     html: `<p>An admin has replied to your inquiry. Log in to your dashboard to view it.</p>`
    //   });
    // }

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

module.exports = router;