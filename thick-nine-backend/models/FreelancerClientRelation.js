// models/FreelancerClientRelation.js
// Per-seller relationship flags + private notes for a client (buyer)

const mongoose = require("mongoose");

const FreelancerClientRelationSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isFriend: { type: Boolean, default: false },
    isSaved: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    notes: { type: String, default: "", maxlength: 5000 },
  },
  { timestamps: true }
);

FreelancerClientRelationSchema.index(
  { sellerId: 1, clientId: 1 },
  { unique: true }
);

module.exports =
  (mongoose.models && mongoose.models.FreelancerClientRelation) ||
  mongoose.model("FreelancerClientRelation", FreelancerClientRelationSchema);
