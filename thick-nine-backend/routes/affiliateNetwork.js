//routes/affiliateNetwork.js

// @route   GET /api/affiliate/network/freelancers
// @desc    Fetch recruited freelancers linked to the current affiliate
router.get('/network/freelancers', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, msg: 'User not found' });
      }
  
      // TODO: Query your User/Freelancer model where referredBy matches req.user.id
      // Example MongoDB query assuming User model with role 'freelancer':
      const freelancers = await User.find({
        referredBy: req.user.id,
        role: 'freelancer'
      }).select('name email avatar status createdAt totalEarnings');
  
      return res.json({
        success: true,
        freelancers: freelancers || []
      });
    } catch (err) {
      console.error('Error fetching recruited freelancers:', err);
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  });
  
  
  
  // @route   GET /api/affiliate/network/customers
  // @desc    Fetch lifetime referred customers linked to the current affiliate
  router.get('/network/customers', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, msg: 'User not found' });
      }
  
      // Query your User/Customer collection for users referred by req.user.id
      const customers = await User.find({
        referredBy: req.user.id,
        role: 'customer'
      }).select('name email avatar status createdAt totalSpent');
  
      return res.json({
        success: true,
        customers: customers || []
      });
    } catch (err) {
      console.error('Error fetching referred customers:', err);
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  });