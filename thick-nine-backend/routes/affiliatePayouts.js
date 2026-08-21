// @route   GET /api/affiliate/analytics/daily-commissions
// @desc    Fetch daily aggregated commission totals for chart visualization
router.get('/analytics/daily-commissions', authMiddleware, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7; // Default to last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
  
      // TODO: Query your Transactions/Commissions Collection
      // Aggregating completed earnings grouped by date
      const dailyData = await Transaction.aggregate([
        {
          $match: {
            affiliateId: new mongoose.Types.ObjectId(req.user.id),
            type: 'commission',
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: "$amount" }
          }
        },
        { $sort: { _id: 1 } }
      ]);
  
      // Format output to guarantee continuous dates (filling zero-earning days)
      const formattedChartData = [];
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().split('T')[0];
        const found = dailyData.find(item => item._id === dateStr);
  
        formattedChartData.push({
          date: dateStr,
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          amount: found ? parseFloat(found.amount.toFixed(2)) : 0
        });
      }
  
      return res.json({ success: true, chartData: formattedChartData });
    } catch (err) {
      console.error('Error fetching analytics chart data:', err);
      return res.status(500).json({ success: false, msg: 'Server error' });
    }
  });