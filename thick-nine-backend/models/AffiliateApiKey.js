// models/AffiliateApiKey.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const AffiliateApiKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, default: "Production Key", trim: true, maxlength: 80 },
    /** Prefix shown in UI, e.g. pk_live_8821 */
    keyPrefix: { type: String, required: true },
    /** SHA-256 of full secret — never store plaintext after create response */
    keyHash: { type: String, required: true, select: false },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AffiliateApiKeySchema.index({ user: 1, revokedAt: 1 });

AffiliateApiKeySchema.statics.hashKey = function (raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
};

AffiliateApiKeySchema.statics.generateRawKey = function () {
  const body = crypto.randomBytes(24).toString("hex");
  return `pk_live_${body}`;
};

module.exports =
  (mongoose.models && mongoose.models.AffiliateApiKey) ||
  mongoose.model("AffiliateApiKey", AffiliateApiKeySchema);
