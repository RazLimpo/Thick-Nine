// routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Service = require('../models/Service');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// ----------------------------------------------------
// 1. Direct Checkout Endpoint (Proxied from Next.js API)
// ----------------------------------------------------
router.post('/checkout/plan', authMiddleware, async (req, res) => {
  try {
    const { draftId, plan } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. User session not found.' });
    }

    // Find the service draft belonging to this seller
    const draft = await Service.findOne({ _id: draftId, sellerId: userId });

    if (!draft) {
      return res.status(404).json({ message: 'Service draft not found.' });
    }

    // Process payment gateway logic here (e.g., charge card via gateway API)

    // On payment success: update service status & upgrade user plan
    draft.status = 'active';
    draft.selectedPlan = plan;
    await draft.save();

    await User.findByIdAndUpdate(userId, {
      'subscription.currentPlan': plan,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment processed and service activated successfully!',
      redirectUrl: '/freelancer-dashboard?status=success',
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ message: err.message || 'Payment processing failed.' });
  }
});

// ----------------------------------------------------
// 2. Webhook Listener (Server-to-Server Gateway Events)
// ----------------------------------------------------
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-provider-signature'];

    // Verify Request Signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYMENT_PROVIDER_SECRET_KEY)
      .update(req.body)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());

    // Listen for Successful Charge Event
    if (event.event === 'charge.success' || event.status === 'successful') {
      const { draftId, userId, targetPlan } = event.data.metadata;

      // Find the service draft and set status to active
      const service = await Service.findOne({ _id: draftId, sellerId: userId });

      if (service) {
        service.status = 'active';
        service.selectedPlan = targetPlan;
        await service.save();

        // Update user subscription plan path
        await User.findByIdAndUpdate(userId, {
          'subscription.currentPlan': targetPlan,
        });
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('Webhook Error:', err);
    return res.status(500).json({ message: 'Webhook handler failed' });
  }
});

module.exports = router;