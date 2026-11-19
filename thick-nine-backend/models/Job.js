// models/Job.js
// Client-posted jobs. Templates live in JobTemplate (not isTemplate on Job).
// Bookmarks may use itemType: "Job".

const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    deliverables: {
      type: String,
      default: "",
      maxlength: 500,
    },

    /** Preferred field (array). Legacy "requiredSkills" accepted in routes and mapped here. */
    skills: {
      type: [String],
      default: [],
    },

    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },

    /** Range used by post form; if only `budget` is sent, routes copy it to both. */
    budgetMin: { type: Number, default: 0, min: 0 },
    budgetMax: { type: Number, default: 0, min: 0 },

    /** Optional single figure (older shape) */
    budget: { type: Number, default: null },

    timelineDays: {
      type: Number,
      default: 7,
      min: 1,
    },

    /** Optional free-text duration label from older UI */
    duration: { type: String, default: "" },

    attachments: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["draft", "open", "in_progress", "completed", "cancelled"],
      default: "draft",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    proposals: [
      {
        freelancerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        coverLetter: { type: String, default: "" },
        bidAmount: { type: Number, required: true },
        deliveryNote: { type: String, default: "" },
        cvUrl: { type: String, default: "" },
        status: {
          type: String,
          enum: ["pending", "shortlisted", "accepted", "rejected", "withdrawn"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    /** Moderation reports from users */
    reports: [
      {
        reporterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reason: {
          type: String,
          enum: ["spam", "payment", "inappropriate", "other"],
          default: "spam",
        },
        note: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

JobSchema.virtual("proposalCount").get(function () {
  return this.proposals ? this.proposals.length : 0;
});

JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ clientId: 1, status: 1, updatedAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.Job) || mongoose.model("Job", JobSchema);
