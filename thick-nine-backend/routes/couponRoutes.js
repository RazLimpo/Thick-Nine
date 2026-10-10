/**
 * routes/couponRoutes.js
 * Mount: app.use("/api/coupons", require("./routes/couponRoutes"));
 * Static paths (/validate) registered before /:id
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Coupon = require("../models/Coupon");
const Service = require("../models/Service");

function uid(req) {
  return req.user?.id || req.user?._id;
}

// GET /api/coupons?serviceId=
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const filter = { sellerId: userId };
    if (req.query.serviceId && mongoose.Types.ObjectId.isValid(String(req.query.serviceId))) {
      filter.$or = [{ serviceId: req.query.serviceId }, { serviceId: null }];
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error("GET coupons error:", error);
    return res.status(500).json({ success: false, message: "Failed to load coupons." });
  }
});

// POST /api/coupons — create
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!code || code.length < 3) {
      return res.status(400).json({ success: false, message: "Code must be at least 3 characters." });
    }

    const discountType =
      req.body?.discountType === "fixed_amount" ? "fixed_amount" : "percentage";
    const discountValue = Number(req.body?.discountValue);
    if (!discountValue || discountValue <= 0) {
      return res.status(400).json({ success: false, message: "discountValue must be > 0." });
    }
    if (discountType === "percentage" && discountValue > 90) {
      return res.status(400).json({ success: false, message: "Percentage max is 90%." });
    }

    let serviceId = req.body?.serviceId || null;
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({ success: false, message: "Invalid serviceId." });
      }
      const svc = await Service.findById(serviceId).select("sellerId").lean();
      const owner = svc?.sellerId?._id || svc?.sellerId;
      if (!svc || String(owner) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not your service." });
      }
    }

    const coupon = await Coupon.create({
      sellerId: userId,
      serviceId,
      code,
      name: String(req.body?.name || code).slice(0, 120),
      discountType,
      discountValue,
      maxDiscountAmount:
        req.body?.maxDiscountAmount != null ? Number(req.body.maxDiscountAmount) : null,
      minimumSpend: Number(req.body?.minimumSpend) || 0,
      usageLimitPerUser: Number(req.body?.usageLimitPerUser) || 1,
      totalUsageLimit:
        req.body?.totalUsageLimit != null ? Number(req.body.totalUsageLimit) : null,
      customerType: ["all", "new_customers_only", "inactive_60_days"].includes(
        req.body?.customerType
      )
        ? req.body.customerType
        : "all",
      startDate: req.body?.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body?.endDate ? new Date(req.body.endDate) : null,
      isActive: req.body?.isActive !== false,
    });

    return res.status(201).json({ success: true, coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You already have this code." });
    }
    console.error("POST coupon error:", error);
    return res.status(500).json({ success: false, message: "Failed to create coupon." });
  }
});

// POST /api/coupons/validate — BEFORE /:id
// Body: { code, serviceId?, orderAmount }
router.post("/validate", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const code = String(req.body?.code || "").trim().toUpperCase();
    const orderAmount = Number(req.body?.orderAmount) || 0;
    const serviceId = req.body?.serviceId || null;

    if (!code) {
      return res.status(400).json({ success: false, message: "code required." });
    }

    const coupon = await Coupon.findOne({ code, isActive: true }).lean();
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon." });
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return res.status(400).json({ success: false, message: "Coupon not active yet." });
    }
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return res.status(400).json({ success: false, message: "Coupon expired." });
    }
    if (coupon.totalUsageLimit != null && coupon.usedCount >= coupon.totalUsageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached." });
    }
    if (coupon.minimumSpend && orderAmount < coupon.minimumSpend) {
      return res.status(400).json({
        success: false,
        message: `Minimum spend is $${coupon.minimumSpend}.`,
      });
    }
    if (coupon.serviceId && serviceId && String(coupon.serviceId) !== String(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Coupon not valid for this service.",
      });
    }

    if (userId && coupon.usageLimitPerUser) {
      const entry = (coupon.redemptions || []).find(
        (r) => String(r.userId) === String(userId)
      );
      if (entry && entry.count >= coupon.usageLimitPerUser) {
        return res.status(400).json({
          success: false,
          message: "You already used this coupon.",
        });
      }
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount != null) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.min(discount, orderAmount);
    discount = Math.round(discount * 100) / 100;

    return res.status(200).json({
      success: true,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount: discount,
      finalAmount: Math.max(0, Math.round((orderAmount - discount) * 100) / 100),
    });
  } catch (error) {
    console.error("validate coupon error:", error);
    return res.status(500).json({ success: false, message: "Validation failed." });
  }
});

// PATCH /api/coupons/:id
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon || String(coupon.sellerId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    if (typeof req.body?.isActive === "boolean") coupon.isActive = req.body.isActive;
    if (req.body?.name != null) coupon.name = String(req.body.name).slice(0, 120);
    if (req.body?.endDate !== undefined) {
      coupon.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }
    await coupon.save();
    return res.status(200).json({ success: true, coupon });
  } catch (error) {
    console.error("PATCH coupon error:", error);
    return res.status(500).json({ success: false, message: "Failed to update coupon." });
  }
});

// DELETE /api/coupons/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon || String(coupon.sellerId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }
    await Coupon.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: "Coupon deleted." });
  } catch (error) {
    console.error("DELETE coupon error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete coupon." });
  }
});

module.exports = router;
