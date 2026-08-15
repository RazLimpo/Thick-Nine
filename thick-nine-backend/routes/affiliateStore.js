const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// @route   POST /api/affiliate/store/video
// @desc    Update featured YouTube video URL
router.post('/video', authMiddleware, async (req, res) => {
  try {
    const { videoUrl } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    if (!user.storeConfig) user.storeConfig = {};
    user.storeConfig.featuredVideoUrl = videoUrl || '';

    await user.save();
    return res.json({ 
      success: true, 
      msg: 'Video URL saved successfully', 
      featuredVideoUrl: user.storeConfig.featuredVideoUrl 
    });
  } catch (err) {
    console.error('Error saving store video:', err);
    return res.status(500).json({ success: false, msg: 'Server error saving video' });
  }
});

// @route   POST /api/affiliate/store/services
// @desc    Persist pinned handpicked services & display order
router.post('/services', authMiddleware, async (req, res) => {
  try {
    const { services } = req.body; // Expects Array of { serviceId, displayOrder }

    if (!Array.isArray(services)) {
      return res.status(400).json({ success: false, msg: 'Services payload must be an array' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: 'User not found' });
    }

    if (!user.storeConfig) user.storeConfig = {};
    user.storeConfig.pinnedServices = services.map((s, index) => ({
      serviceId: s.serviceId || s.id,
      displayOrder: typeof s.displayOrder === 'number' ? s.displayOrder : index
    }));

    await user.save();
    return res.json({ 
      success: true, 
      msg: 'Handpicked services saved successfully', 
      pinnedServices: user.storeConfig.pinnedServices 
    });
  } catch (err) {
    console.error('Error saving handpicked services:', err);
    return res.status(500).json({ success: false, msg: 'Server error saving services' });
  }
});

module.exports = router;