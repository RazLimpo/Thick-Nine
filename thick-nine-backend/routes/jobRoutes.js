// routes/jobRoutes.js
// Mount: app.use("/api/jobs", require("./routes/jobRoutes"));

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Job = require("../models/Job");
const User = require("../models/User");

function uid(req) {
  return req.user?.id || req.user?._id;
}

function parseSkills(raw) {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
  }
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeBudgetType(v) {
  const s = String(v || "fixed").toLowerCase();
  if (s.includes("hour")) return "hourly";
  return "fixed";
}

function buildPayload(body = {}) {
  const title = String(body.title || "").trim().slice(0, 100);
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim().slice(0, 2000);
  const deliverables = String(body.deliverables || "").trim().slice(0, 500);
  const skills = parseSkills(body.skills || body.requiredSkills);

  const budgetType = normalizeBudgetType(body.budgetType);
  let budgetMin = Number(body.budgetMin);
  let budgetMax = Number(body.budgetMax);
  const single = Number(body.budget);
  if ((!budgetMin || budgetMin <= 0) && single > 0) budgetMin = single;
  if ((!budgetMax || budgetMax <= 0) && single > 0) budgetMax = single;
  if (!Number.isFinite(budgetMin) || budgetMin < 0) budgetMin = 0;
  if (!Number.isFinite(budgetMax) || budgetMax < budgetMin) budgetMax = budgetMin;

  const timelineDays = Math.max(
    1,
    Math.min(
      365,
      Number(body.timelineDays) ||
        parseInt(String(body.timeline || body.duration || "7").replace(/\D/g, ""), 10) ||
        7
    )
  );

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((u) => typeof u === "string" && u.length > 0).slice(0, 10)
    : [];

  return {
    title,
    category,
    description,
    deliverables,
    skills,
    budgetType,
    budgetMin,
    budgetMax,
    budget: single > 0 ? single : budgetMax || budgetMin || null,
    timelineDays,
    duration: body.duration ? String(body.duration) : `${timelineDays} days`,
    attachments,
  };
}

function validatePublish(p) {
  if (!p.title || p.title.length < 5) return "Project title is required (min 5 characters).";
  if (!p.category) return "Category is required.";
  if (!p.description || p.description.length < 20)
    return "Description is required (min 20 characters).";
  if (!p.deliverables) return "Key deliverables are required.";
  if (!p.skills.length) return "Add at least one required skill.";
  if (p.budgetMin < 10) return "Minimum budget should be at least $10.";
  if (p.budgetMax < p.budgetMin) return "Max budget must be ≥ min budget.";
  return null;
}

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "24"), 10) || 24, 1), 100);
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const filter = { status: "open" };
    if (req.query.category) filter.category = String(req.query.category).trim();
    if (req.query.q) {
      const term = String(req.query.q).trim();
      filter.$or = [
        { title: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
        { skills: { $regex: term, $options: "i" } },
      ];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("clientId", "fullName displayName avatar location")
        .lean(),
      Job.countDocuments(filter),
    ]);

    return res.json({ success: true, jobs, total, page, limit });
  } catch (e) {
    console.error("GET /api/jobs:", e);
    return res.status(500).json({ success: false, message: "Failed to load jobs." });
  }
});

router.get("/mine", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const jobs = await Job.find({ clientId: userId }).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, jobs });
  } catch (e) {
    console.error("GET /api/jobs/mine:", e);
    return res.status(500).json({ success: false, message: "Failed to load your jobs." });
  }
});

router.post("/draft", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const user = await User.findById(userId).select("role isActive");
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }

    const payload = buildPayload(req.body);
    if (!payload.title || payload.title.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Enter at least a short title to save a draft.",
      });
    }

    const jobId = req.body?.jobId || req.body?.draftId;
    let job;
    if (jobId) {
      job = await Job.findOne({ _id: jobId, clientId: userId });
      if (!job) {
        return res.status(404).json({ success: false, message: "Draft not found." });
      }
      if (job.status !== "draft") {
        return res.status(400).json({
          success: false,
          message: "Only drafts can be updated this way.",
        });
      }
      Object.assign(job, payload, { status: "draft" });
      await job.save();
    } else {
      job = await Job.create({
        ...payload,
        clientId: userId,
        status: "draft",
      });
    }

    return res.status(jobId ? 200 : 201).json({
      success: true,
      message: "Draft saved.",
      jobId: job._id,
      job,
    });
  } catch (e) {
    console.error("POST /api/jobs/draft:", e);
    return res.status(500).json({ success: false, message: "Failed to save draft." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const user = await User.findById(userId).select("role isActive");
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }

    const payload = buildPayload(req.body);
    const err = validatePublish(payload);
    if (err) return res.status(400).json({ success: false, message: err });

    const jobId = req.body?.jobId || req.body?.draftId;
    let job;
    if (jobId) {
      job = await Job.findOne({ _id: jobId, clientId: userId });
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found." });
      }
      Object.assign(job, payload, {
        status: "open",
        publishedAt: job.publishedAt || new Date(),
      });
      await job.save();
    } else {
      job = await Job.create({
        ...payload,
        clientId: userId,
        status: "open",
        publishedAt: new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      message: "Job posted successfully.",
      jobId: job._id,
      job,
    });
  } catch (e) {
    console.error("POST /api/jobs:", e);
    return res.status(500).json({ success: false, message: "Failed to post job." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("clientId", "fullName displayName avatar location")
      .lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    if (job.status !== "open") {
      try {
        const h = req.headers.authorization || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : null;
        if (token) {
          const jwt = require("jsonwebtoken");
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          const viewer = String(payload.id || payload._id || "");
          if (viewer && viewer === String(job.clientId?._id || job.clientId)) {
            return res.json({ success: true, job });
          }
        }
      } catch {
        /* not owner */
      }
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    return res.json({ success: true, job });
  } catch (e) {
    console.error("GET /api/jobs/:id:", e);
    return res.status(500).json({ success: false, message: "Failed to load job." });
  }
});

module.exports = router;
