// routes/serviceRoutes.js
// FULL file: locations + publish + draft GET/POST/PUT (with uploadMedia)

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

function validateDraftCore(payload) {
  if (!payload.title || payload.title.length < 3) {
    return "Service title is required (min 3 characters).";
  }
  if (!payload.category) {
    return "Category is required.";
  }
  return null;
}

// GET /api/services/locations
router.get("/locations", async (req, res) => {
  try {
    const activeSellerIds = await Service.distinct("sellerId", { status: "active" });

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

// GET /api/services/draft/:draftId
router.get("/draft/:draftId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User session not found." });
    }

    const { draftId } = req.params;
    const draft = await Service.findOne({ _id: draftId, sellerId: userId }).lean();

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

// POST /api/services/draft
router.post("/draft", authMiddleware, uploadMedia, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User session not found." });
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

    const imageCount = payload.images?.length || 0;
    const videoCount = payload.videos?.length || 0;
    const audioCount = payload.audio?.length || 0;

    if (typeof user.canUploadMedia === "function") {
      if (!user.canUploadMedia("images", imageCount)) {
        return res.status(422).json({ message: "Image count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("videos", videoCount)) {
        return res.status(422).json({ message: "Video count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("audio", audioCount)) {
        return res.status(422).json({ message: "Audio count exceeds your plan limit." });
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

// PUT /api/services/draft/update
router.put("/draft/update", authMiddleware, uploadMedia, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User session not found." });
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
    if (user && typeof user.canUploadMedia === "function") {
      const imageCount = payload.images?.length || 0;
      const videoCount = payload.videos?.length || 0;
      const audioCount = payload.audio?.length || 0;
      if (!user.canUploadMedia("images", imageCount)) {
        return res.status(422).json({ message: "Image count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("videos", videoCount)) {
        return res.status(422).json({ message: "Video count exceeds your plan limit." });
      }
      if (!user.canUploadMedia("audio", audioCount)) {
        return res.status(422).json({ message: "Audio count exceeds your plan limit." });
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

// POST /api/services/publish
router.post("/publish", authMiddleware, async (req, res) => {
  try {
    const { draftId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User session not found." });
    }

    const user = await User.findById(userId);
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
        redirectUrl: `/checkout/plan?plan=${requestedPlan}&draftId=${draftId}`,
      });
    }

    const canAddImages = user.canUploadMedia("images", draft.images?.length || 0);
    const canAddVideos = user.canUploadMedia("videos", draft.videos?.length || 0);
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

module.exports = router;
