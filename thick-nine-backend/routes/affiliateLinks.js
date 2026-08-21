const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth'); // Adjust path to your auth middleware if needed
const User = require('../models/User'); // Adjust path to your User model if needed

// @route   GET /api/affiliate/links
// @desc    Fetch all saved affiliate links for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('savedLinks');
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }
    return res.json({ success: true, links: user.savedLinks || [] });
  } catch (err) {
    console.error('Error fetching links:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// @route   GET /api/affiliate/links/performance
// @desc    Fetch live performance metrics (clicks, conversions, analytics) for user's links
router.get('/performance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    // Aggregating metrics from savedLinks or dedicated user metrics
    const links = user.savedLinks || [];
    const totalClicks = links.reduce((acc, link) => acc + (link.clicks || 0), 0);
    const totalConversions = links.reduce((acc, link) => acc + (link.conversions || 0), 0);
    const conversionRate = totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      performance: {
        totalClicks,
        totalConversions,
        conversionRate,
        links: links.map((link) => ({
          id: link._id,
          name: link.name,
          url: link.url,
          clicks: link.clicks || 0,
          conversions: link.conversions || 0,
        })),
      },
    });
  } catch (err) {
    console.error('Error fetching link performance:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// @route   POST /api/affiliate/links
// @desc    Save a new affiliate link
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, msg: 'URL is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    const newLink = {
      _id: new mongoose.Types.ObjectId(),
      name: name || 'Untitled Link',
      url,
      clicks: 0,
      conversions: 0,
      date: new Date().toLocaleDateString()
    };

    user.savedLinks = user.savedLinks || [];
    user.savedLinks.push(newLink);
    await user.save();

    return res.json({ success: true, link: newLink });
  } catch (err) {
    console.error('Error saving link:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// @route   DELETE /api/affiliate/links/:id
// @desc    Delete a saved affiliate link by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    user.savedLinks = (user.savedLinks || []).filter(
      (link) => link._id.toString() !== id && link.id?.toString() !== id
    );

    await user.save();
    return res.json({ success: true, msg: 'Link removed successfully' });
  } catch (err) {
    console.error('Error deleting link:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
});

module.exports = router;