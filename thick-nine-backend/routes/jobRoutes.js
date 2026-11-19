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
        .populate("clientId", "fullName displayName avatar location onlineStatus createdAt memberSince")
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


/* ---------- POST /api/jobs/:id/proposals — freelancer applies ---------- */
router.post("/:id/proposals", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const user = await User.findById(userId).select("role isActive fullName displayName");
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account deactivated." });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.status !== "open") {
      return res.status(404).json({ success: false, message: "Open job not found." });
    }

    if (String(job.clientId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot propose on your own job.",
      });
    }

    const already = (job.proposals || []).some(
      (p) => String(p.freelancerId) === String(userId)
    );
    if (already) {
      return res.status(400).json({
        success: false,
        message: "You already submitted a proposal for this job.",
      });
    }

    const coverLetter = String(req.body?.coverLetter || "").trim();
    const bidAmount = Number(req.body?.bidAmount);
    const deliveryNote = String(req.body?.deliveryNote || "").trim().slice(0, 200);
    const cvUrl = String(req.body?.cvUrl || "").trim().slice(0, 500);

    if (coverLetter.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Cover letter must be at least 20 characters.",
      });
    }
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid bid amount.",
      });
    }

    job.proposals.push({
      freelancerId: userId,
      coverLetter: coverLetter.slice(0, 4000),
      bidAmount,
      deliveryNote,
      cvUrl,
      status: "pending",
      createdAt: new Date(),
    });
    await job.save();

    // Notify client (best-effort)
    try {
      const Notification = require("../models/Notification");
      if (Notification) {
        await Notification.create({
          user: job.clientId,
          type: "job_proposal",
          title: "New proposal on your job",
          message: `${user.displayName || user.fullName || "A freelancer"} proposed on "${job.title}".`,
          link: `/jobs/${job._id}`,
          meta: { jobId: job._id, freelancerId: userId },
        });
      }
    } catch (err) {
      console.warn("proposal notification skipped:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Proposal submitted.",
      proposalCount: job.proposals.length,
    });
  } catch (e) {
    console.error("POST /api/jobs/:id/proposals:", e);
    return res.status(500).json({ success: false, message: "Failed to submit proposal." });
  }
});

/* ---------- POST /api/jobs/:id/report — flag for admins ---------- */
router.post("/:id/report", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const job = await Job.findById(req.params.id).select("title clientId status reports");
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    const allowed = ["spam", "payment", "inappropriate", "other"];
    let reason = String(req.body?.reason || "spam").toLowerCase();
    if (!allowed.includes(reason)) reason = "other";
    const note = String(req.body?.note || "").trim().slice(0, 500);

    const recent = (job.reports || []).find(
      (r) =>
        String(r.reporterId) === String(userId) &&
        Date.now() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000
    );
    if (recent) {
      return res.status(429).json({
        success: false,
        message: "You already reported this job recently.",
      });
    }

    job.reports = job.reports || [];
    job.reports.push({
      reporterId: userId,
      reason,
      note,
      createdAt: new Date(),
    });
    await job.save();

    // Notify all admins (best-effort)
    try {
      const Notification = require("../models/Notification");
      const admins = await User.find({
        role: { $in: ["admin", "superadmin", "moderator"] },
      })
        .select("_id")
        .limit(20)
        .lean();
      if (Notification && admins.length) {
        await Notification.insertMany(
          admins.map((a) => ({
            user: a._id,
            type: "job_report",
            title: "Job reported",
            message: `Job "${job.title}" reported (${reason}).`,
            link: `/admin/jobs/${job._id}`,
            meta: { jobId: job._id, reason, reporterId: userId },
          }))
        );
      }
    } catch (err) {
      console.warn("report notification skipped:", err.message);
    }

    return res.json({
      success: true,
      message: "Report submitted for moderation.",
    });
  } catch (e) {
    console.error("POST /api/jobs/:id/report:", e);
    return res.status(500).json({ success: false, message: "Failed to submit report." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("clientId", "fullName displayName avatar location onlineStatus createdAt memberSince")
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
