// models/JobTemplate.js
const mongoose = require("mongoose");

const JobTemplateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    internalName: { type: String, required: true, trim: true, maxlength: 120 },
    jobTitle: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, default: "", trim: true },
    description: { type: String, default: "", maxlength: 5000 },
    deliverables: { type: String, default: "", maxlength: 3000 },
    skills: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

JobTemplateSchema.index({ user: 1, updatedAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.JobTemplate) ||
  mongoose.model("JobTemplate", JobTemplateSchema);
