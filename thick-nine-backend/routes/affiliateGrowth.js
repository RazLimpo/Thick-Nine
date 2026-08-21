// @route   GET /api/affiliate/progression/monthly-sales
// @desc    Get monthly sales aggregation for the partner growth progress bar
router.get('/progression/monthly-sales', authMiddleware, async (req, res) => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
  
      // Aggregate completed orders/commissions referred by this affiliate for current month
      const monthlyStats = await Transaction.aggregate([
        {
          $match: {
            affiliateId: new mongoose.Types.ObjectId(req.user.id),
            status: 'completed',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);
  
      const currentSales = monthlyStats.length > 0 ? monthlyStats[0].totalSales : 0;
      const monthlyTarget = 5000; // Target value (or dynamic based on user tier)
  
      return res.json({
        success: true,
        monthlySales: currentSales,
        targetSales: monthlyTarget,
        progressPercentage: Math.min(Math.round((currentSales / monthlyTarget) * 100), 100)
      });
    } catch (err) {
      console.error('Error fetching monthly sales progression:', err);
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  });