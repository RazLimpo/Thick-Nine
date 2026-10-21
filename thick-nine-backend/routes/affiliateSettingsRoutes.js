// routes/affiliateSettingsRoutes.js
// Mount: app.use("/api/affiliate-settings", require("./routes/affiliateSettingsRoutes"));

const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const auth = require("../middleware/auth");
const User = require("../models/User");
const AffiliateApiKey = require("../models/AffiliateApiKey");
const AffiliatePayoutRequest = require("../models/AffiliatePayoutRequest");

function uid(req) {
  return req.user?.id || req.user?._id;
}

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "X-Twitter"];

/* ===========================================================
   SOCIAL CONNECTIONS
   =========================================================== */

/** GET /api/affiliate-settings/social */
router.get("/social", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select("socialAccounts").lean();
    return res.json({
      success: true,
      socialAccounts: user?.socialAccounts || [],
    });
  } catch (e) {
    console.error("GET social:", e);
    return res.status(500).json({ success: false, message: "Failed to load social." });
  }
});

/**
 * POST /api/affiliate-settings/social
 * body: { platform, handle?, profileUrl? }
 * Manual connect (no OAuth app keys required).
 * When OAuth env is present later, use /social/oauth/:platform instead.
 */
router.post("/social", auth, async (req, res) => {
  try {
    const { platform, handle, profileUrl } = req.body || {};
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `platform must be one of: ${PLATFORMS.join(", ")}`,
      });
    }

    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (!user.socialAccounts) user.socialAccounts = [];

    // One entry per platform
    user.socialAccounts = user.socialAccounts.filter((s) => s.platform !== platform);
    user.socialAccounts.push({
      platform,
      handle: String(handle || "").trim().slice(0, 80),
      profileUrl: String(profileUrl || "").trim().slice(0, 300),
      connectedAt: new Date(),
      verified: false, // true only after real OAuth
    });

    await user.save();
    return res.status(201).json({
      success: true,
      socialAccounts: user.socialAccounts,
      message: `${platform} connected. OAuth verification available when app credentials are configured.`,
    });
  } catch (e) {
    console.error("POST social:", e);
    return res.status(500).json({ success: false, message: "Failed to connect." });
  }
});

/** DELETE /api/affiliate-settings/social/:platform */
router.delete("/social/:platform", auth, async (req, res) => {
  try {
    const platform = req.params.platform;
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.socialAccounts = (user.socialAccounts || []).filter(
      (s) => s.platform !== platform
    );
    await user.save();
    return res.json({ success: true, socialAccounts: user.socialAccounts });
  } catch (e) {
    console.error("DELETE social:", e);
    return res.status(500).json({ success: false, message: "Failed to disconnect." });
  }
});

/**
 * GET /api/affiliate-settings/social/oauth/:platform
 * Returns authorize URL when env credentials exist; otherwise 501 with setup hint.
 *
 * Env (optional, per platform):
 *   OAUTH_INSTAGRAM_CLIENT_ID / SECRET
 *   OAUTH_FACEBOOK_CLIENT_ID / SECRET
 *   OAUTH_LINKEDIN_CLIENT_ID / SECRET
 *   OAUTH_TWITTER_CLIENT_ID / SECRET
 *   OAUTH_REDIRECT_URI=https://thick-nine.vercel.app/api/affiliate-settings/social/callback
 */
router.get("/social/oauth/:platform", auth, async (req, res) => {
  try {
    const platform = req.params.platform;
    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ success: false, message: "Invalid platform." });
    }

    const map = {
      Instagram: {
        id: process.env.OAUTH_INSTAGRAM_CLIENT_ID,
        auth: "https://api.instagram.com/oauth/authorize",
        scope: "user_profile",
      },
      Facebook: {
        id: process.env.OAUTH_FACEBOOK_CLIENT_ID,
        auth: "https://www.facebook.com/v18.0/dialog/oauth",
        scope: "public_profile,email",
      },
      LinkedIn: {
        id: process.env.OAUTH_LINKEDIN_CLIENT_ID,
        auth: "https://www.linkedin.com/oauth/v2/authorization",
        scope: "openid profile",
      },
      "X-Twitter": {
        id: process.env.OAUTH_TWITTER_CLIENT_ID,
        auth: "https://twitter.com/i/oauth2/authorize",
        scope: "users.read tweet.read offline.access",
      },
    };

    const cfg = map[platform];
    const redirect =
      process.env.OAUTH_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "https://thick-nine.vercel.app"}/affiliate-settings?oauth=${platform}`;

    if (!cfg?.id) {
      return res.status(501).json({
        success: false,
        oauthConfigured: false,
        message:
          "OAuth app credentials not configured. Use manual connect, or set OAUTH_*_CLIENT_ID env vars.",
        platform,
      });
    }

    const state = Buffer.from(
      JSON.stringify({ u: String(uid(req)), p: platform, t: Date.now() })
    ).toString("base64url");

    const url = new URL(cfg.auth);
    url.searchParams.set("client_id", cfg.id);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", cfg.scope);
    url.searchParams.set("state", state);

    return res.json({
      success: true,
      oauthConfigured: true,
      authorizeUrl: url.toString(),
      state,
    });
  } catch (e) {
    console.error("OAuth start:", e);
    return res.status(500).json({ success: false, message: "OAuth start failed." });
  }
});

/* ===========================================================
   AFFILIATE API KEYS
   =========================================================== */

/** GET /api/affiliate-settings/api-keys */
router.get("/api-keys", auth, async (req, res) => {
  try {
    const keys = await AffiliateApiKey.find({
      user: uid(req),
      revokedAt: null,
    })
      .sort({ createdAt: -1 })
      .select("-keyHash")
      .lean();

    return res.json({
      success: true,
      keys: keys.map((k) => ({
        id: k._id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        /** Masked display */
        display: `${k.keyPrefix}${"•".repeat(12)}`,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    });
  } catch (e) {
    console.error("GET api-keys:", e);
    return res.status(500).json({ success: false, message: "Failed to list keys." });
  }
});

/**
 * POST /api/affiliate-settings/api-keys
 * body: { name? }
 * Returns full raw key ONCE in response.rawKey
 */
router.post("/api-keys", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const count = await AffiliateApiKey.countDocuments({
      user: userId,
      revokedAt: null,
    });
    if (count >= 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 active API keys. Revoke one first.",
      });
    }

    const raw = AffiliateApiKey.generateRawKey();
    const keyPrefix = raw.slice(0, 16);
    const doc = await AffiliateApiKey.create({
      user: userId,
      name: String(req.body?.name || "Production Key").trim().slice(0, 80),
      keyPrefix,
      keyHash: AffiliateApiKey.hashKey(raw),
    });

    return res.status(201).json({
      success: true,
      message: "Copy this key now — it will not be shown again.",
      rawKey: raw,
      key: {
        id: doc._id,
        name: doc.name,
        keyPrefix: doc.keyPrefix,
        display: `${doc.keyPrefix}${"•".repeat(12)}`,
        createdAt: doc.createdAt,
      },
    });
  } catch (e) {
    console.error("POST api-keys:", e);
    return res.status(500).json({ success: false, message: "Failed to create key." });
  }
});

/** DELETE /api/affiliate-settings/api-keys/:id  (soft revoke) */
router.delete("/api-keys/:id", auth, async (req, res) => {
  try {
    const key = await AffiliateApiKey.findOne({
      _id: req.params.id,
      user: uid(req),
      revokedAt: null,
    });
    if (!key) {
      return res.status(404).json({ success: false, message: "Key not found." });
    }
    key.revokedAt = new Date();
    await key.save();
    return res.json({ success: true, message: "Key revoked." });
  } catch (e) {
    console.error("DELETE api-keys:", e);
    return res.status(500).json({ success: false, message: "Failed to revoke key." });
  }
});

/* ===========================================================
   AI / BANNER GENERATION (SVG — no external AI bill required)
   =========================================================== */

/**
 * POST /api/affiliate-settings/generate-banner
 * body: { title?, subtitle?, brandColor?, audience?, width?, height? }
 * Returns SVG data URL suitable for download / preview.
 */
router.post("/generate-banner", auth, async (req, res) => {
  try {
    const {
      title = "Thick 9",
      subtitle = "Start freelancing smarter",
      brandColor = "#d96464",
      audience = "Freelancers",
      width = 728,
      height = 90,
    } = req.body || {};

    const w = Math.min(Math.max(Number(width) || 728, 200), 1200);
    const h = Math.min(Math.max(Number(height) || 90, 60), 1920);
    const color = String(brandColor).match(/^#[0-9a-fA-F]{3,8}$/)
      ? brandColor
      : "#d96464";
    const safeTitle = String(title).slice(0, 60).replace(/[<>&]/g, "");
    const safeSub = String(subtitle).slice(0, 80).replace(/[<>&]/g, "");
    const safeAud = String(audience).slice(0, 40).replace(/[<>&]/g, "");

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="8" fill="url(#g)"/>
  <text x="24" y="${Math.round(h * 0.42)}" fill="#ffffff" font-family="Arial,sans-serif" font-size="${Math.max(16, Math.round(h * 0.28))}" font-weight="700">${safeTitle}</text>
  <text x="24" y="${Math.round(h * 0.75)}" fill="rgba(255,255,255,0.9)" font-family="Arial,sans-serif" font-size="${Math.max(11, Math.round(h * 0.16))}">${safeSub} · ${safeAud}</text>
</svg>`;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

    return res.json({
      success: true,
      format: "svg",
      width: w,
      height: h,
      dataUrl,
      svg,
    });
  } catch (e) {
    console.error("generate-banner:", e);
    return res.status(500).json({ success: false, message: "Generation failed." });
  }
});

/* ===========================================================
   OVERVIEW: referral link, earnings, conversions, tracking prefs
   =========================================================== */

/**
 * GET /api/affiliate-settings/overview
 * Referral code, link, wallet snapshot, pending payouts, recent conversions
 */
router.get("/overview", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select(
      "referralCode wallet metrics affiliateProfile payoutDetails"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Ensure shareable referral code
    if (!user.referralCode) {
      const base = (user.username || String(user._id).slice(-6)).toLowerCase().replace(/[^a-z0-9]/g, "");
      user.referralCode = `${base || "aff"}${String(user._id).slice(-4)}`;
      await user.save();
    }

    const frontend =
      process.env.FRONTEND_URL ||
      process.env.BASE_URL ||
      "https://thick-nine.vercel.app";
    const referralLink = `${frontend.replace(/\/$/, "")}/?ref=${encodeURIComponent(user.referralCode)}`;

    const lifetime =
      user.wallet?.lifetimeEarnings ?? user.metrics?.totalEarnings ?? 0;
    const available =
      user.wallet?.availableBalance ??
      user.wallet?.balance ??
      user.wallet?.pendingBalance ??
      0;
    const pendingWallet = user.wallet?.pendingBalance ?? 0;

    // This month: if wallet has monthly fields use them; else 0 until ledger exists
    const thisMonth =
      user.wallet?.thisMonthEarnings ??
      user.affiliateProfile?.thisMonthEarnings ??
      0;

    const pendingRequests = await AffiliatePayoutRequest.countDocuments({
      user: user._id,
      status: "pending",
    });

    // Conversions: users attributed to this affiliate
    const code = user.referralCode;
    const conversions = await User.find({
      $or: [
        { referredBy: code },
        { referredBy: String(user._id) },
        { "affiliateProfile.referredByCode": code },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("fullName displayName email role isEmailVerified createdAt")
      .lean();

    const threshold =
      user.affiliateProfile?.autoPayoutThreshold ??
      user.payoutDetails?.autoThreshold ??
      50;

    return res.json({
      success: true,
      referralCode: user.referralCode,
      referralLink,
      earnings: {
        lifetime: Number(lifetime) || 0,
        available: Number(available) || 0,
        pending: Number(pendingWallet) || 0,
        thisMonth: Number(thisMonth) || 0,
      },
      minPayout: Number(threshold) || 50,
      pendingPayoutRequests: pendingRequests,
      conversions: conversions.map((c) => ({
        id: c._id,
        name: c.displayName || c.fullName || "User",
        email: c.email,
        role: c.role,
        verified: !!c.isEmailVerified,
        joinedAt: c.createdAt,
      })),
      tracking: {
        cookieDays: user.affiliateProfile?.cookieDays ?? 90,
        postbackUrl: user.affiliateProfile?.postbackUrl ?? "",
      },
      payoutDetails: user.payoutDetails || {},
    });
  } catch (e) {
    console.error("GET overview:", e);
    return res.status(500).json({ success: false, message: "Failed to load overview." });
  }
});

/** PUT /api/affiliate-settings/tracking  body: { cookieDays, postbackUrl } */
router.put("/tracking", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (!user.affiliateProfile) user.affiliateProfile = {};

    if (req.body?.cookieDays != null) {
      const d = Number(req.body.cookieDays);
      if ([30, 90, 180].includes(d)) user.affiliateProfile.cookieDays = d;
    }
    if (req.body?.postbackUrl != null) {
      user.affiliateProfile.postbackUrl = String(req.body.postbackUrl).trim().slice(0, 500);
    }
    if (req.body?.autoPayoutThreshold != null) {
      const t = Number(req.body.autoPayoutThreshold);
      if (t >= 50 && t <= 10000) user.affiliateProfile.autoPayoutThreshold = t;
    }

    await user.save();
    return res.json({
      success: true,
      tracking: {
        cookieDays: user.affiliateProfile.cookieDays ?? 90,
        postbackUrl: user.affiliateProfile.postbackUrl ?? "",
        autoPayoutThreshold: user.affiliateProfile.autoPayoutThreshold ?? 50,
      },
    });
  } catch (e) {
    console.error("PUT tracking:", e);
    return res.status(500).json({ success: false, message: "Failed to save tracking." });
  }
});

/**
 * POST /api/affiliate-settings/postback/test
 * Fires a GET to stored postback URL with sample query params (best-effort).
 */
router.post("/postback/test", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select("affiliateProfile referralCode");
    const url = user?.affiliateProfile?.postbackUrl;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Save a postback URL first.",
      });
    }
    let target;
    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid postback URL." });
    }
    target.searchParams.set("test", "1");
    target.searchParams.set("ref", user.referralCode || "");
    target.searchParams.set("event", "test");

    let status = 0;
    let ok = false;
    try {
      const r = await fetch(target.toString(), {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });
      status = r.status;
      ok = r.ok;
    } catch (err) {
      return res.json({
        success: false,
        message: `Ping failed: ${err.message || "network error"}`,
        url: target.toString(),
      });
    }
    return res.json({
      success: ok,
      httpStatus: status,
      url: target.toString(),
      message: ok ? "Postback responded OK." : `Postback returned HTTP ${status}.`,
    });
  } catch (e) {
    console.error("postback test:", e);
    return res.status(500).json({ success: false, message: "Test failed." });
  }
});

/* ===========================================================
   PAYOUT REQUESTS
   =========================================================== */

/** GET /api/affiliate-settings/payouts */
router.get("/payouts", auth, async (req, res) => {
  try {
    const rows = await AffiliatePayoutRequest.find({ user: uid(req) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, payouts: rows });
  } catch (e) {
    console.error("GET payouts:", e);
    return res.status(500).json({ success: false, message: "Failed to load payouts." });
  }
});

/**
 * POST /api/affiliate-settings/payouts
 * body: { amount? } — defaults to full available balance
 * Requires available balance >= min threshold and no other pending request.
 */
router.post("/payouts", auth, async (req, res) => {
  try {
    const user = await User.findById(uid(req));
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const min =
      user.affiliateProfile?.autoPayoutThreshold ??
      user.payoutDetails?.autoThreshold ??
      50;
    const available =
      user.wallet?.availableBalance ?? user.wallet?.balance ?? 0;

    const amount =
      req.body?.amount != null ? Number(req.body.amount) : Number(available);

    if (!amount || amount < min) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout is $${min}. Available: $${Number(available).toFixed(2)}.`,
        minPayout: min,
        available,
      });
    }
    if (amount > available) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds available balance ($${Number(available).toFixed(2)}).`,
      });
    }

    const existing = await AffiliatePayoutRequest.findOne({
      user: user._id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending payout request.",
        requestId: existing._id,
      });
    }

    const method = user.payoutDetails?.method || "Payoneer";
    const doc = await AffiliatePayoutRequest.create({
      user: user._id,
      amount,
      method: ["Payoneer", "Bank", "None"].includes(method) ? method : "Payoneer",
      destination: {
        email: user.payoutDetails?.accountEmail || user.payoutDetails?.payoneerEmail || "",
        accountName: user.payoutDetails?.accountName || "",
        bankName: user.payoutDetails?.bankName || "",
      },
      status: "pending",
      note: String(req.body?.note || "").slice(0, 500),
    });

    // Optionally hold funds (pending) — soft hold on available
    if (user.wallet) {
      const bal = Number(user.wallet.availableBalance ?? user.wallet.balance ?? 0);
      user.wallet.availableBalance = Math.max(0, bal - amount);
      user.wallet.pendingBalance =
        Number(user.wallet.pendingBalance || 0) + amount;
      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: "Payout request submitted. An admin will process it.",
      payout: doc,
    });
  } catch (e) {
    console.error("POST payouts:", e);
    return res.status(500).json({ success: false, message: "Failed to request payout." });
  }
});

module.exports = router;
