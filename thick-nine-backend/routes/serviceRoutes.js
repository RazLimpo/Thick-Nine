// routes/serviceRoutes.js
// FULL file — safer route order + production hardening

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Service = require("../models/Service");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const uploadMedia = require("../middleware/upload");

// ---------- constants ----------

const PLACEHOLDER_IMAGES = new Set(["/default-service.png"]);
const VALID_PLANS = ["free", "silver", "gold"];
const VALID_STATUSES = ["active", "paused", "draft"];

// ---------- helpers ----------

function parseJsonField(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function cloudinaryUrls(files = []) {
  return files
    .map((f) => f.path || f.secure_url || f.url || null)
    .filter(Boolean);
}

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

/** Count only real media (exclude known placeholders). */
function countRealMedia(urls = []) {
  return (Array.isArray(urls) ? urls : []).filter(
    (u) => typeof u === "string" && u.length > 0 && !PLACEHOLDER_IMAGES.has(u)
  ).length;
}

/**
 * Merge media safely:
 * - Only keep client "existing" URLs that already belong to the service in DB
 * - Drop deleted keys
 * - Append newly uploaded Cloudinary URLs
 */
function mergeMediaSafe(dbExisting, clientExisting, incoming, deleted) {
  const allowed = new Set(
    (Array.isArray(dbExisting) ? dbExisting : []).filter(Boolean)
  );
  const deletedSet = new Set(
    (Array.isArray(deleted) ? deleted : []).filter(Boolean)
  );

  const kept = (Array.isArray(clientExisting) ? clientExisting : []).filter(
    (url) => allowed.has(url) && !deletedSet.has(url)
  );

  const newOnes = (Array.isArray(incoming) ? incoming : []).filter(Boolean);
  return [...kept, ...newOnes];
}

function buildServicePayloadFromForm(
  req,
  { isUpdate = false, dbImages = [], dbVideos = [], dbAudio = [] } = {}
) {
  const body = req.body || {};

  const packages = parseJsonField(body.packages, {});
  const addons = parseJsonField(body.addons, []);
  const faqs = parseJsonField(body.faqs, []);
  const requirements = parseJsonField(body.requirements, []);
  const attributes = parseJsonField(body.attributes, []);

  const existingImages = parseJsonField(body.existingImages, []);
  const existingVideos = parseJsonField(body.existingVideos, []);
  const existingAudio = parseJsonField(body.existingAudio, []);
  const deletedMediaKeys = parseJsonField(body.deletedMediaKeys, []);

  const newImages = cloudinaryUrls(req.files?.images || []);
  const newVideos = cloudinaryUrls(req.files?.videos || []);
  const newAudio = cloudinaryUrls(req.files?.audio || []);

  // On create there is no DB media yet — only incoming uploads count as images.
  // On update, only trust URLs already stored on the service.
  const images = isUpdate
    ? mergeMediaSafe(dbImages, existingImages, newImages, deletedMediaKeys)
    : [...newImages];
  const videos = isUpdate
    ? mergeMediaSafe(dbVideos, existingVideos, newVideos, deletedMediaKeys)
    : [...newVideos];
  const audio = isUpdate
    ? mergeMediaSafe(dbAudio, existingAudio, newAudio, deletedMediaKeys)
    : [...newAudio];

  const basicPrice = packages?.basic?.price;
  const numericPrice =
    basicPrice !== undefined && basicPrice !== ""
      ? Number(basicPrice)
      : undefined;

  const payload = {
    title: (body.title || "").trim(),
    description: (body.description || "").trim(),
    category: (body.category || "").trim(),
    subCategory: (body.subCategory || "").trim(),
    tags: String(body.keywords || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    packages,
    addons: Array.isArray(addons) ? addons : [],
    faqs: Array.isArray(faqs) ? faqs : [],
    requirements: Array.isArray(requirements) ? requirements : [],
    attributes: Array.isArray(attributes) ? attributes : [],
    selectedPlan: VALID_PLANS.includes(body.selectedPlan)
      ? body.selectedPlan
      : "free",
    images: images.length ? images : undefined,
    videos,
    audio,
    status:
      body.status === "active" || body.status === "paused"
        ? body.status
        : "draft",
  };

  if (numericPrice !== undefined && !Number.isNaN(numericPrice)) {
    payload.price = numericPrice;
  }

  if (!isUpdate && (!payload.images || payload.images.length === 0)) {
    delete payload.images;
  }

  return payload;
}

function assertCanPostServices(user) {
  if (!user) {
    return { status: 401, message: "User not found." };
  }
  const role = user.role || "client";
  if (role !== "freelancer") {
    return {
      status: 403,
      message: "Switch to freelancer mode to post services.",
    };
  }
  const strength = Number(user.accountStrength) || 0;
  if (strength < 60) {
    return {
      status: 403,
      message: "Complete your profile (strength 60%+) before posting services.",
    };
  }
  return null;
}

/**
 * Effective media plan for limit checks.
 * Paid limits require a matching, unexpired subscription.
 * Never trusts stale user.planType for paid tiers.
 */
function getEffectiveMediaPlan(user, requestedPlan = "free") {
  if (!VALID_PLANS.includes(requestedPlan)) {
    return "free";
  }
  if (requestedPlan === "free") {
    return "free";
  }

  const subscription = user?.subscription;
  const hasActiveSubscription =
    subscription?.currentPlan === requestedPlan &&
    (!subscription.expiresAt ||
      new Date(subscription.expiresAt).getTime() > Date.now());

  return hasActiveSubscription ? requestedPlan : "free";
}

function hasActivePlanSubscription(user, plan) {
  if (!plan || plan === "free") return true;
  const subscription = user?.subscription;
  return (
    subscription?.currentPlan === plan &&
    (!subscription.expiresAt ||
      new Date(subscription.expiresAt).getTime() > Date.now())
  );
}

function validateDraftCore(payload) {
  if (!payload.title || payload.title.length < 3) {
    return "Service title is required (min 3 characters).";
  }
  if (!payload.category) {
    return "Category is required.";
  }
  return null;
}

/**
 * Fail closed if canUploadMedia is missing.
 * Counts exclude placeholder images.
 */
function checkMediaLimits(user, imageCount, videoCount, audioCount, effectivePlan) {
  if (typeof user.canUploadMedia !== "function") {
    return "Media limits unavailable. Please try again later.";
  }

  if (!user.canUploadMedia("images", imageCount, effectivePlan)) {
    return "Image count exceeds your plan limit.";
  }
  if (!user.canUploadMedia("videos", videoCount, effectivePlan)) {
    return "Video count exceeds your plan limit.";
  }
  if (!user.canUploadMedia("audio", audioCount, effectivePlan)) {
    return "Audio count exceeds your plan limit.";
  }
  return null;
}

// =====================================================
// 1. GET /api/services/locations
// =====================================================
router.get("/locations", async (req, res) => {
  try {
    const activeSellerIds = await Service.distinct("sellerId", {
      status: "active",
    });

    const users = await User.find(
      { _id: { $in: activeSellerIds } },
      "location"
    ).lean();

    const uniqueLocations = new Set();

    users.forEach((user) => {
      if (!user.location) return;

      const city = user.location.city?.trim();
      const country = user.location.country?.trim();

      let locationStr = "";
      if (city && country) {
        locationStr = `${city}, ${country}`;
      } else if (city || country) {
        locationStr = city || country;
      }

      if (locationStr) {
        uniqueLocations.add(locationStr);
      }
    });

    const locations = Array.from(uniqueLocations)
      .sort((a, b) => a.localeCompare(b))
      .map((loc) => ({ label: loc, value: loc }));

    res.json({ locations });
  } catch (error) {
    console.error("Error fetching filter locations:", error);
    res.status(500).json({ message: "Failed to fetch filter locations" });
  }
});

// =====================================================
// 2. GET /api/services  — public marketplace list
// =====================================================
router.get("/", async (req, res) => {
  try {
    const {
      category,
      subCategory,
      q,
      limit = "24",
      page = "1",
    } = req.query;

    const filter = { status: "active" };

    if (category && String(category).trim()) {
      filter.category = String(category).trim();
    }
    if (subCategory && String(subCategory).trim()) {
      filter.subCategory = String(subCategory).trim();
    }
    if (q && String(q).trim()) {
      const term = String(q).trim();
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { tags: { $regex: term, $options: "i" } },
      ];
    }

    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 24, 1), 100);
    const pg = Math.max(parseInt(String(page), 10) || 1, 1);
    const skip = (pg - 1) * lim;

    const [services, total] = await Promise.all([
      Service.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .populate(
  "sellerId",
  "fullName displayName avatar averageRating location onlineStatus lastSeen isVerified planType level professionalTitle"
)
        .lean(),
      Service.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      services,
      total,
      page: pg,
      limit: lim,
    });
  } catch (error) {
    console.error("GET /api/services error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace services.",
    });
  }
});

// =====================================================
// 3. GET /api/services/my-services
// =====================================================
router.get("/my-services", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { status } = req.query;

    const filter = { sellerId: userId };
    if (status && VALID_STATUSES.includes(String(status))) {
      filter.status = status;
    }

    const services = await Service.find(filter).sort({ updatedAt: -1 }).lean();

    const activeCount = services.filter((s) => s.status === "active").length;
    const totalViews = services.reduce((sum, s) => sum + (s.views || 0), 0);

    return res.status(200).json({
      success: true,
      services,
      stats: {
        activeCount,
        totalViews,
        total: services.length,
      },
    });
  } catch (error) {
    console.error("GET /api/services/my-services error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your services.",
    });
  }
});

// =====================================================
// 4. GET /api/services/draft/:draftId
// =====================================================
router.get("/draft/:draftId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const { draftId } = req.params;
    if (!isValidObjectId(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID." });
    }

    const draft = await Service.findOne({
      _id: draftId,
      sellerId: userId,
    }).lean();

    if (!draft) {
      return res.status(404).json({ message: "Service draft not found." });
    }

    return res.status(200).json({
      draftId: draft._id,
      _id: draft._id,
      title: draft.title,
      description: draft.description,
      category: draft.category,
      subCategory: draft.subCategory,
      keywords: draft.tags || [],
      selectedPlan: draft.selectedPlan || "free",
      packages: draft.packages || {},
      addons: draft.addons || [],
      faqs: draft.faqs || [],
      requirements: draft.requirements || [],
      attributes: draft.attributes || [],
      images: draft.images || [],
      videos: draft.videos || [],
      audio: draft.audio || [],
      existingImages: draft.images || [],
      existingVideos: draft.videos || [],
      existingAudio: draft.audio || [],
      status: draft.status,
      briefIntro: draft.briefIntro || undefined,
    });
  } catch (error) {
    console.error("GET draft error:", error);
    return res.status(500).json({ message: "Server error loading draft." });
  }
});

// =====================================================
// 5. POST /api/services/draft
// =====================================================
router.post("/draft", authMiddleware, uploadMedia, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const payload = buildServicePayloadFromForm(req, { isUpdate: false });
    const validationError = validateDraftCore(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const postGate = assertCanPostServices(user);
    if (postGate) {
      return res.status(postGate.status).json({ message: postGate.message });
    }

    const effectivePlan = getEffectiveMediaPlan(user, payload.selectedPlan);
    const imageCount = countRealMedia(payload.images);
    const videoCount = countRealMedia(payload.videos);
    const audioCount = countRealMedia(payload.audio);

    const mediaError = checkMediaLimits(
      user,
      imageCount,
      videoCount,
      audioCount,
      effectivePlan
    );
    if (mediaError) {
      return res.status(422).json({ message: mediaError });
    }

    const draft = await Service.create({
      ...payload,
      sellerId: userId,
      status: "draft",
    });

    return res.status(201).json({
      success: true,
      message: "Draft created successfully.",
      draftId: draft._id,
      _id: draft._id,
    });
  } catch (error) {
    console.error("POST draft error:", error);
    return res.status(500).json({
      message: error.message || "Server error creating draft.",
    });
  }
});

// =====================================================
// 6. PUT /api/services/draft/update
// =====================================================
router.put("/draft/update", authMiddleware, uploadMedia, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const draftId = req.body?.draftId;
    if (!draftId) {
      return res.status(400).json({ message: "draftId is required." });
    }
    if (!isValidObjectId(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID." });
    }

    const existing = await Service.findOne({ _id: draftId, sellerId: userId });
    if (!existing) {
      return res.status(404).json({ message: "Service draft not found." });
    }

    // Prefer client-provided existing* when present; otherwise seed from DB
    // so merge can still run. Actual trust boundary is mergeMediaSafe vs DB.
    if (!req.body.existingImages) {
      req.body.existingImages = JSON.stringify(existing.images || []);
    }
    if (!req.body.existingVideos) {
      req.body.existingVideos = JSON.stringify(existing.videos || []);
    }
    if (!req.body.existingAudio) {
      req.body.existingAudio = JSON.stringify(existing.audio || []);
    }

    const payload = buildServicePayloadFromForm(req, {
      isUpdate: true,
      dbImages: existing.images || [],
      dbVideos: existing.videos || [],
      dbAudio: existing.audio || [],
    });
    const validationError = validateDraftCore(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const postGate = assertCanPostServices(user);
    if (postGate) {
      return res.status(postGate.status).json({ message: postGate.message });
    }

    const effectivePlan = getEffectiveMediaPlan(user, payload.selectedPlan);
    const imageCount = countRealMedia(payload.images);
    const videoCount = countRealMedia(payload.videos);
    const audioCount = countRealMedia(payload.audio);

    const mediaError = checkMediaLimits(
      user,
      imageCount,
      videoCount,
      audioCount,
      effectivePlan
    );
    if (mediaError) {
      return res.status(422).json({ message: mediaError });
    }

    // Keep drafts as drafts (publish is a separate endpoint)
    if (payload.status === "active") {
      payload.status = "draft";
    }

    Object.assign(existing, payload);
    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Draft updated successfully.",
      draftId: existing._id,
      _id: existing._id,
    });
  } catch (error) {
    console.error("PUT draft/update error:", error);
    return res.status(500).json({
      message: error.message || "Server error updating draft.",
    });
  }
});

// =====================================================
// 7. POST /api/services/publish
// =====================================================
router.post("/publish", authMiddleware, async (req, res) => {
  try {
    const { draftId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    if (!isValidObjectId(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const postGate = assertCanPostServices(user);
    if (postGate) {
      return res.status(postGate.status).json({ message: postGate.message });
    }

    const draft = await Service.findOne({ _id: draftId, sellerId: userId });
    if (!draft) {
      return res.status(404).json({ message: "Service draft not found." });
    }

    const requestedPlan = draft.selectedPlan || "free";

    if (requestedPlan !== "free" && !hasActivePlanSubscription(user, requestedPlan)) {
      return res.status(402).json({
        message: `You do not have an active ${requestedPlan.toUpperCase()} subscription. Please complete checkout to upgrade.`,
        requiresCheckout: true,
        redirectUrl: `/checkout/plan?plan=${requestedPlan}&draftId=${draftId}`,
      });
    }

    const effectivePlan = getEffectiveMediaPlan(user, requestedPlan);
    const mediaError = checkMediaLimits(
      user,
      countRealMedia(draft.images),
      countRealMedia(draft.videos),
      countRealMedia(draft.audio),
      effectivePlan
    );
    if (mediaError) {
      return res.status(422).json({
        message:
          "Your draft exceeds the allowed media uploads for your current plan.",
      });
    }

    draft.status = "active";
    await draft.save();

    return res.status(200).json({
      success: true,
      message: "Service published successfully!",
      serviceId: draft._id,
    });
  } catch (error) {
    console.error("Publish error:", error);
    return res.status(500).json({ message: "Server error during publishing." });
  }
});

// =====================================================
// 8. POST /api/services/:id/view  — record analytics view (public)
// =====================================================
router.post("/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const ServiceView = require("../models/ServiceView");

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, status: "active" }).select(
      "_id"
    );
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or not active.",
      });
    }

    const { source = "unknown", device = "unknown", referrer = "" } =
      req.body || {};

    const allowedSources = [
      "direct",
      "social",
      "external",
      "search",
      "unknown",
    ];
    const allowedDevices = ["desktop", "mobile", "tablet", "unknown"];

    await ServiceView.create({
      serviceId: id,
      source: allowedSources.includes(source) ? source : "unknown",
      device: allowedDevices.includes(device) ? device : "unknown",
      referrer: String(referrer || "").slice(0, 500),
    });

    await Service.updateOne({ _id: id }, { $inc: { views: 1 } });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("POST /api/services/:id/view error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record view." });
  }
});

// =====================================================
// 9. PATCH /api/services/:id/status  — pause / resume
// =====================================================
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { id } = req.params;
    const { status } = req.body; // "active" | "paused"

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "active" or "paused".',
      });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    if (service.status === "draft") {
      return res.status(400).json({
        success: false,
        message: "Publish the service before pausing or resuming it.",
      });
    }

    // Re-check eligibility when resuming to active
    if (status === "active") {
      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found." });
      }

      const postGate = assertCanPostServices(user);
      if (postGate) {
        return res
          .status(postGate.status)
          .json({ success: false, message: postGate.message });
      }

      const plan = service.selectedPlan || "free";
      if (plan !== "free" && !hasActivePlanSubscription(user, plan)) {
        return res.status(402).json({
          success: false,
          message: `Your ${plan.toUpperCase()} subscription is not active. Renew to resume this service.`,
          requiresCheckout: true,
          redirectUrl: `/checkout/plan?plan=${plan}&serviceId=${id}`,
        });
      }

      const mediaError = checkMediaLimits(
        user,
        countRealMedia(service.images),
        countRealMedia(service.videos),
        countRealMedia(service.audio),
        getEffectiveMediaPlan(user, plan)
      );
      if (mediaError) {
        return res.status(422).json({
          success: false,
          message: mediaError,
        });
      }
    }

    service.status = status;
    await service.save();

    return res.status(200).json({
      success: true,
      message: status === "paused" ? "Service paused." : "Service resumed.",
      service: {
        _id: service._id,
        status: service.status,
      },
    });
  } catch (error) {
    console.error("PATCH /api/services/:id/status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service status.",
    });
  }
});

// =====================================================
// 10. GET /api/services/:id/manage — owner only
// =====================================================
router.get("/:id/manage", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId }).lean();
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }
    return res.status(200).json({ success: true, service });
  } catch (error) {
    console.error("GET manage error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load service." });
  }
});

// =====================================================
// 11. GET /api/services/:id/analytics — owner only
// =====================================================
router.get("/:id/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const ServiceView = require("../models/ServiceView");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId })
      .select("_id views")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    const days = Math.min(
      Math.max(parseInt(String(req.query.days || "30"), 10) || 30, 1),
      365
    );
    const since = new Date();
    since.setDate(since.getDate() - days);

    const views = await ServiceView.find({
      serviceId: id,
      createdAt: { $gte: since },
    })
      .select("source device createdAt")
      .lean();

    const total = views.length;

    const sourceCounts = {
      direct: 0,
      social: 0,
      external: 0,
      search: 0,
      unknown: 0,
    };
    views.forEach((v) => {
      const s = v.source || "unknown";
      if (sourceCounts[s] !== undefined) sourceCounts[s] += 1;
      else sourceCounts.unknown += 1;
    });

    const sources = Object.entries(sourceCounts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        key,
        label:
          key === "direct"
            ? "Direct"
            : key === "social"
              ? "Social Media"
              : key === "external"
                ? "External Links"
                : key === "search"
                  ? "Search"
                  : "Other",
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const deviceCounts = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      unknown: 0,
    };
    views.forEach((v) => {
      const d = v.device || "unknown";
      if (deviceCounts[d] !== undefined) deviceCounts[d] += 1;
      else deviceCounts.unknown += 1;
    });

    const devices = {
      desktop: {
        count: deviceCounts.desktop,
        percent: total
          ? Math.round((deviceCounts.desktop / total) * 100)
          : 0,
      },
      mobile: {
        count: deviceCounts.mobile,
        percent: total
          ? Math.round((deviceCounts.mobile / total) * 100)
          : 0,
      },
      tablet: {
        count: deviceCounts.tablet,
        percent: total
          ? Math.round((deviceCounts.tablet / total) * 100)
          : 0,
      },
    };

    const dayMap = {};
    views.forEach((v) => {
      const day = new Date(v.createdAt).toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, count: dayMap[key] || 0 });
    }

    return res.status(200).json({
      success: true,
      days,
      totalViewsInRange: total,
      allTimeViews: service.views || 0,
      sources,
      devices,
      series,
    });
  } catch (error) {
    console.error("GET /api/services/:id/analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load analytics.",
    });
  }
});

// =====================================================
// 12. GET /api/services/:id/orders — owner only
// =====================================================
router.get("/:id/orders", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const Order = require("../models/Order");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId })
      .select("_id title")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1),
      100
    );

    const orders = await Order.find({
      serviceId: id,
      sellerId: userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("clientId", "fullName displayName avatar email")
      .lean();

    const mapped = orders.map((o) => {
      const buyer = o.clientId || o.buyerId || {};
      const buyerName =
        buyer.displayName || buyer.fullName || o.buyerName || "Client";

      return {
        _id: o._id,
        status: o.status || "pending",
        packageName: o.packageName || o.package || o.title || "Package",
        amount: o.subtotal ?? o.price ?? o.total ?? o.grandTotal ?? 0,
        currency: o.currency || "USD",
        buyer: {
          _id: buyer._id || null,
          name: buyerName,
          avatar: buyer.avatar || "/default-avatar.png",
        },
        dueAt: o.dueAt || o.deliveryDueAt || o.deadline || null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      serviceId: id,
      count: mapped.length,
      orders: mapped,
    });
  } catch (error) {
    console.error("GET /api/services/:id/orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load orders.",
    });
  }
});

// =====================================================
// 13. PATCH /api/services/:id — owner partial update
// Media fields are NOT allowed here (use draft update flow).
// =====================================================
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    // Non-media fields only — prevents plan-limit bypass
    const allowed = [
      "title",
      "description",
      "price",
      "category",
      "subCategory",
      "tags",
      "packages",
      "addons",
      "faqs",
      "requirements",
      "attributes",
      "deliveryTime",
    ];

    const body = req.body || {};

    // Explicitly reject media mutation via this endpoint
    if (
      body.images !== undefined ||
      body.videos !== undefined ||
      body.audio !== undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Media cannot be updated via this endpoint. Use the draft update flow.",
      });
    }

    allowed.forEach((key) => {
      if (body[key] !== undefined) {
        service[key] = body[key];
      }
    });

    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service updated.",
      service,
    });
  } catch (error) {
    console.error("PATCH /api/services/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update service.",
    });
  }
});

// =====================================================
// 14. POST /api/services/:id/click
// =====================================================
router.post("/:id/click", async (req, res) => {
  try {
    const { id } = req.params;
    const ServiceClick = require("../models/ServiceClick");

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, status: "active" }).select(
      "_id"
    );
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found." });
    }

    const type = ["continue", "package", "other"].includes(req.body?.type)
      ? req.body.type
      : "continue";

    await ServiceClick.create({ serviceId: id, type });

    await Service.updateOne({ _id: id }, { $inc: { clicks: 1 } }).catch(
      () => {}
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("POST click error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record click." });
  }
});

// =====================================================
// 15. DELETE /api/services/:id — owner only
// =====================================================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID." });
    }

    const service = await Service.findOne({ _id: id, sellerId: userId });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    const Order = require("../models/Order");
    const open = await Order.countDocuments({
      serviceId: id,
      status: { $in: ["pending", "in_escrow", "revision_requested"] },
    });
    if (open > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete while this service has open orders. Pause it instead.",
      });
    }

    await Service.deleteOne({ _id: id });
    return res
      .status(200)
      .json({ success: true, message: "Service deleted." });
  } catch (error) {
    console.error("DELETE /api/services/:id error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete service." });
  }
});

// =====================================================
// 16. GET /api/services/:id  — public active; owner may preview paused/draft (LAST)
// =====================================================
function optionalUserIdFromReq(req) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return null;
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload.id || payload._id || payload.userId || null;
  } catch {
    return null;
  }
}

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    // Load without status filter first — then enforce visibility rules
    const service = await Service.findById(id)
      .populate(
        "sellerId",
        "fullName displayName avatar averageRating location onlineStatus lastSeen isVerified planType level professionalTitle metrics memberSince"
      )
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    const status = String(service.status || "active").toLowerCase();
    const viewerId = optionalUserIdFromReq(req);
    const sellerId = String(
      service.sellerId?._id || service.sellerId || ""
    );
    const isOwner =
      Boolean(viewerId) && Boolean(sellerId) && String(viewerId) === sellerId;

    // Marketplace strangers: active only
    // Owner: active + paused + draft (preview from Service Management)
    if (status !== "active") {
      if (!isOwner || !["paused", "draft"].includes(status)) {
        return res.status(404).json({
          success: false,
          message: "Service not found or not available.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("GET /api/services/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch service.",
    });
  }
});

module.exports = router;
