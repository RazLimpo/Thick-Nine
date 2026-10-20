// routes/clientSettingsRoutes.js
// Mount: app.use("/api/client", require("./routes/clientSettingsRoutes"));
//
// Covers: job templates, login activity, payment methods, deactivate

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const User = require("../models/User");
const JobTemplate = require("../models/JobTemplate");
const LoginActivity = require("../models/LoginActivity");

function uid(req) {
  return req.user?.id || req.user?._id;
}

function parseDevice(ua = "") {
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return "mobile";
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return "tablet";
  if (ua) return "desktop";
  return "unknown";
}

/* ===========================================================
   JOB TEMPLATES
   =========================================================== */

/** GET /api/client/templates */
router.get("/templates", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const templates = await JobTemplate.find({ user: userId })
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ success: true, templates });
  } catch (e) {
    console.error("GET templates:", e);
    return res.status(500).json({ success: false, message: "Failed to load templates." });
  }
});

/** POST /api/client/templates */
router.post("/templates", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const {
      internalName,
      jobTitle,
      category,
      description,
      deliverables,
      skills,
    } = req.body || {};

    if (!internalName?.trim() || !jobTitle?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name and job title are required.",
      });
    }

    const tpl = await JobTemplate.create({
      user: userId,
      internalName: String(internalName).trim().slice(0, 120),
      jobTitle: String(jobTitle).trim().slice(0, 200),
      category: String(category || "").trim(),
      description: String(description || "").slice(0, 5000),
      deliverables: String(deliverables || "").slice(0, 3000),
      skills: String(skills || "").slice(0, 500),
    });

    return res.status(201).json({ success: true, template: tpl });
  } catch (e) {
    console.error("POST templates:", e);
    return res.status(500).json({ success: false, message: "Failed to save template." });
  }
});

/** PUT /api/client/templates/:id */
router.put("/templates/:id", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const tpl = await JobTemplate.findOne({ _id: id, user: userId });
    if (!tpl) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    const b = req.body || {};
    if (b.internalName != null) tpl.internalName = String(b.internalName).trim().slice(0, 120);
    if (b.jobTitle != null) tpl.jobTitle = String(b.jobTitle).trim().slice(0, 200);
    if (b.category != null) tpl.category = String(b.category).trim();
    if (b.description != null) tpl.description = String(b.description).slice(0, 5000);
    if (b.deliverables != null) tpl.deliverables = String(b.deliverables).slice(0, 3000);
    if (b.skills != null) tpl.skills = String(b.skills).slice(0, 500);

    await tpl.save();
    return res.json({ success: true, template: tpl });
  } catch (e) {
    console.error("PUT templates:", e);
    return res.status(500).json({ success: false, message: "Failed to update template." });
  }
});

/** DELETE /api/client/templates/:id */
router.delete("/templates/:id", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    const deleted = await JobTemplate.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    return res.json({ success: true, message: "Template deleted." });
  } catch (e) {
    console.error("DELETE templates:", e);
    return res.status(500).json({ success: false, message: "Failed to delete template." });
  }
});

/* ===========================================================
   LOGIN ACTIVITY
   =========================================================== */

/** GET /api/client/login-activity?limit=20 */
router.get("/login-activity", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const rows = await LoginActivity.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, activity: rows });
  } catch (e) {
    console.error("GET login-activity:", e);
    return res.status(500).json({ success: false, message: "Failed to load activity." });
  }
});

/**
 * Helper export for authRoutes after successful login:
 *   const { recordLoginActivity } = require("./clientSettingsRoutes");
 * Or duplicate this small helper in authRoutes.
 */
async function recordLoginActivity(userId, req, success = true) {
  try {
    const ua = req.headers["user-agent"] || "";
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.ip ||
      "";
    await LoginActivity.create({
      user: userId,
      ip: String(ip).slice(0, 100),
      userAgent: String(ua).slice(0, 500),
      device: parseDevice(ua),
      success: !!success,
    });
    // Keep last 50
    const extra = await LoginActivity.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(50)
      .select("_id");
    if (extra.length) {
      await LoginActivity.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
    }
  } catch (e) {
    console.warn("recordLoginActivity:", e.message);
  }
}

module.exports.recordLoginActivity = recordLoginActivity;

/* ===========================================================
   PAYMENT METHODS (stored on user — no card processor yet)
   =========================================================== */

/** GET /api/client/payment-methods */
router.get("/payment-methods", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select("paymentMethods").lean();
    return res.json({
      success: true,
      paymentMethods: user?.paymentMethods || [],
    });
  } catch (e) {
    console.error("GET payment-methods:", e);
    return res.status(500).json({ success: false, message: "Failed to load methods." });
  }
});

/** POST /api/client/payment-methods
 * body: { brand, last4, label, isDefault }
 * Does NOT store full card numbers — placeholder until Stripe/Paystack.
 */
router.post("/payment-methods", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const { brand, last4, label, isDefault } = req.body || {};
    if (!last4 || String(last4).replace(/\D/g, "").length < 4) {
      return res.status(400).json({
        success: false,
        message: "Enter the last 4 digits (full card numbers are never stored).",
      });
    }

    if (!user.paymentMethods) user.paymentMethods = [];

    const entry = {
      _id: new mongoose.Types.ObjectId(),
      brand: String(brand || "Card").trim().slice(0, 40),
      last4: String(last4).replace(/\D/g, "").slice(-4),
      label: String(label || "").trim().slice(0, 80),
      isDefault: !!isDefault,
      addedAt: new Date(),
    };

    if (entry.isDefault) {
      user.paymentMethods.forEach((m) => {
        m.isDefault = false;
      });
    }
    if (!user.paymentMethods.length) entry.isDefault = true;

    user.paymentMethods.push(entry);
    await user.save();

    return res.status(201).json({
      success: true,
      paymentMethods: user.paymentMethods,
    });
  } catch (e) {
    console.error("POST payment-methods:", e);
    return res.status(500).json({ success: false, message: "Failed to add method." });
  }
});

/** DELETE /api/client/payment-methods/:id */
router.delete("/payment-methods/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const before = (user.paymentMethods || []).length;
    user.paymentMethods = (user.paymentMethods || []).filter(
      (m) => String(m._id) !== String(req.params.id)
    );
    if (user.paymentMethods.length === before) {
      return res.status(404).json({ success: false, message: "Method not found." });
    }
    if (user.paymentMethods.length && !user.paymentMethods.some((m) => m.isDefault)) {
      user.paymentMethods[0].isDefault = true;
    }
    await user.save();
    return res.json({ success: true, paymentMethods: user.paymentMethods });
  } catch (e) {
    console.error("DELETE payment-methods:", e);
    return res.status(500).json({ success: false, message: "Failed to remove method." });
  }
});

/* ===========================================================
   ACCOUNT DEACTIVATION (soft)
   =========================================================== */

/** POST /api/client/deactivate  body: { confirm: true } */
router.post("/deactivate", auth, async (req, res) => {
  try {
    if (!req.body?.confirm) {
      return res.status(400).json({
        success: false,
        message: 'Send { "confirm": true } to deactivate.',
      });
    }
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.onlineStatus = "offline";
    await user.save();

    return res.json({
      success: true,
      message: "Account deactivated. Contact support to reactivate.",
    });
  } catch (e) {
    console.error("POST deactivate:", e);
    return res.status(500).json({ success: false, message: "Deactivation failed." });
  }
});

/* ===========================================================
   2FA TOGGLE (flag only — login challenge still later)
   =========================================================== */

/** POST /api/client/2fa  body: { enabled: boolean } */
router.post("/2fa", auth, async (req, res) => {
  try {
    const enabled = !!req.body?.enabled;
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.twoFactorEnabled = enabled;
    // Full TOTP secret + QR + login challenge: later in header/login
    await user.save();

    return res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      message: enabled
        ? "2FA flag enabled. Login challenge will be required once the login flow is wired."
        : "2FA disabled.",
    });
  } catch (e) {
    console.error("POST 2fa:", e);
    return res.status(500).json({ success: false, message: "Failed to update 2FA." });
  }
});

router.recordLoginActivity = recordLoginActivity;
module.exports = router;
