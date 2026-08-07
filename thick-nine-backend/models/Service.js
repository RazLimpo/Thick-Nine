// thick-nine-backend/models/Service.js

const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------
    // SECTION 1: Ownership & Primary Info
    // ----------------------------------------------------
    sellerId: {
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

    price: {
      type: Number,
      required: false, // Optional on initial draft save
      default: 5,
      min: 0,
    },

    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subCategory: {
      type: String,
      trim: true,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    // ----------------------------------------------------
    // SECTION 2: Media Files (URLs / Paths)
    // ----------------------------------------------------
    images: {
      type: [String],
      default: ["/default-service.png"],
    },

    videos: {
      type: [String],
      default: [],
    },

    audio: {
      type: [String],
      default: [],
    },

    // ----------------------------------------------------
    // SECTION 3: Service Packages & Details
    // ----------------------------------------------------
    packages: {
      type: mongoose.Schema.Types.Mixed, // Stores basic, standard, premium tier objects
      default: {},
    },

    attributes: {
      type: [String],
      default: [],
    },

    addons: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    faqs: {
      type: [
        {
          question: String,
          answer: String,
        },
      ],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    selectedPlan: {
      type: String,
      enum: ["free", "silver", "gold"],
      default: "free",
    },

    // ----------------------------------------------------
    // SECTION 4: Fulfillment & Performance
    // ----------------------------------------------------
    deliveryTime: {
      type: Number, // In days
      default: 3,
      min: 1,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    orders: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ----------------------------------------------------
    // SECTION 5: Flags & Status
    // ----------------------------------------------------
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    sponsored: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "paused", "draft"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ServiceSchema.index({ category: 1, status: 1, price: 1 });
ServiceSchema.index({ sponsored: 1, status: 1, createdAt: -1 });
ServiceSchema.index({ featured: 1, status: 1, rating: -1 });

module.exports = (mongoose.models && mongoose.models.Service) 
  ? mongoose.models.Service 
  : mongoose.model("Service", ServiceSchema);