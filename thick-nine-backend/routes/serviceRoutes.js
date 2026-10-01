// routes/serviceRoutes.js
// FULL file — safer route order

const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const uploadMedia = require("../middleware/upload");

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

function buildServicePayloadFromForm(req, { isUpdate = false } = {}) {
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

  const mergeMedia = (existing, incoming, deleted) => {
    const kept = (Array.isArray(existing) ? existing : []).filter(
      (url) => !deleted.includes(url)
    );
    return [...kept, ...incoming];
  };

  const images = mergeMedia(existingImages, newImages, deletedMediaKeys);
  const videos = mergeMedia(existingVideos, newVideos, deletedMediaKeys);
  const audio = mergeMedia(existingAudio, newAudio, deletedMediaKeys);

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
    selectedPlan: ["free", "silver", "gold"].includes(body.selectedPlan)
      ? body.selectedPlan
      : "free",
    images: images.length ? images : undefined,
    videos,
    audio,
    status:
      body.status === "active" || body.status === "paused" ? body.status : "draft",
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

function validateDraftCore(payload) {
  if (!payload.title || payload.title.length < 3) {
    return "Service title is required (min 3 characters).";
  }
  if (!payload.category) {
    return "Category is required.";
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
          "fullName displayName avatar averageRating location"
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
    if (status && ["active", "draft", "paused"].includes(String(status))) {
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

    const imageCount = payload.images?.length || 0;
    const videoCount = payload.videos?.length || 0;
    const audioCount = payload.audio?.length || 0;

    if (typeof user.canUploadMedia === "function") {
      if (!user.canUploadMedia("images", imageCount)) {
        return res
          .status(422)
          .json({ message: "Image count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("videos", videoCount)) {
        return res
          .status(422)
          .json({ message: "Video count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("audio", audioCount)) {
        return res
          .status(422)
          .json({ message: "Audio count exceeds your plan limit." });
      }
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

    const existing = await Service.findOne({ _id: draftId, sellerId: userId });
    if (!existing) {
      return res.status(404).json({ message: "Service draft not found." });
    }

    if (!req.body.existingImages) {
      req.body.existingImages = JSON.stringify(existing.images || []);
    }
    if (!req.body.existingVideos) {
      req.body.existingVideos = JSON.stringify(existing.videos || []);
    }
    if (!req.body.existingAudio) {
      req.body.existingAudio = JSON.stringify(existing.audio || []);
    }

    const payload = buildServicePayloadFromForm(req, { isUpdate: true });
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

    if (typeof user.canUploadMedia === "function") {
      const imageCount = payload.images?.length || 0;
      const videoCount = payload.videos?.length || 0;
      const audioCount = payload.audio?.length || 0;
      if (!user.canUploadMedia("images", imageCount)) {
        return res
          .status(422)
          .json({ message: "Image count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("videos", videoCount)) {
        return res
          .status(422)
          .json({ message: "Video count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("audio", audioCount)) {
        return res
          .status(422)
          .json({ message: "Audio count exceeds your plan limit." });
      }
    }

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

    const hasActiveSubscription =
      user.subscription &&
      user.subscription.currentPlan === requestedPlan &&
      (!user.subscription.expiresAt ||
        new Date(user.subscription.expiresAt) > new Date());

    if (requestedPlan !== "free" && !hasActiveSubscription) {
      return res.status(402).json({
        message: `You do not have an active ${requestedPlan.toUpperCase()} subscription. Please complete checkout to upgrade.`,
        requiresCheckout: true,
        redirectUrl: `/checkout/plan?plan=\( {requestedPlan}&draftId= \){draftId}`,
      });
    }

    const canAddImages = user.canUploadMedia(
      "images",
      draft.images?.length || 0
    );
    const canAddVideos = user.canUploadMedia(
      "videos",
      draft.videos?.length || 0
    );
    const canAddAudio = user.canUploadMedia("audio", draft.audio?.length || 0);

    if (!canAddImages || !canAddVideos || !canAddAudio) {
      return res.status(422).json({
        message: `Your draft exceeds the allowed media uploads for your current plan.`,
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

    if (!id || !require("mongoose").Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID." });
    }

    // Only count views for active services
    const service = await Service.findOne({ _id: id, status: "active" }).select("_id");
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found or not active." });
    }

    const { source = "unknown", device = "unknown", referrer = "" } = req.body || {};

    const allowedSources = ["direct", "social", "external", "search", "unknown"];
    const allowedDevices = ["desktop", "mobile", "tablet", "unknown"];

    await ServiceView.create({
      serviceId: id,
      source: allowedSources.includes(source) ? source : "unknown",
      device: allowedDevices.includes(device) ? device : "unknown",
      referrer: String(referrer || "").slice(0, 500),
    });

    // Keep existing aggregate counter in sync
    await Service.updateOne({ _id: id }, { $inc: { views: 1 } });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("POST /api/services/:id/view error:", error);
    return res.status(500).json({ success: false, message: "Failed to record view." });
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
    return res.status(500).json({ success: false, message: "Failed to load service." });
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

    // Must own the service
    const service = await Service.findOne({ _id: id, sellerId: userId })
      .select("_id views")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or you do not own it.",
      });
    }

    // Optional range: ?days=7 | 30 | 90 (default 30)
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

    // Traffic sources
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

    // Device usage
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
        percent: total ? Math.round((deviceCounts.desktop / total) * 100) : 0,
      },
      mobile: {
        count: deviceCounts.mobile,
        percent: total ? Math.round((deviceCounts.mobile / total) * 100) : 0,
      },
      tablet: {
        count: deviceCounts.tablet,
        percent: total ? Math.round((deviceCounts.tablet / total) * 100) : 0,
      },
    };

    // Simple daily series for chart (last `days`, capped labels later on client)
    const dayMap = {};
    views.forEach((v) => {
      const day = new Date(v.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
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
// 12. GET /api/services/:id  — public single active service (LAST)
// =====================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !require("mongoose").Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const service = await Service.findOne({ _id: id, status: "active" })
      .populate(
        "sellerId",
        "fullName displayName avatar averageRating location onlineStatus isVerified planType level professionalTitle metrics memberSince"
      )
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or not active.",
      });
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