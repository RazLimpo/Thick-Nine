// routes/contactRoutes.js

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// POST /api/contact
router.post('/contact', async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    if (!firstName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'First name, email, and message are required fields.',
      });
    }

    const newMessage = await Message.create({
      senderName: `${firstName} ${lastName || ''}`.trim(),
      senderEmail: email,
      subject: subject || 'General Inquiry',
      message: message,
      status: 'unread',
    });

    return res.status(201).json({
      success: true,
      message: 'Your message has been submitted successfully.',
      ticketId: newMessage._id,
    });
  } catch (err) {
    console.error('Error submitting contact message:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error saving message. Please try again later.',
    });
  }
});

module.exports = router;