const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // 1. ACCOUNT AUTH & IDENTITY
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  googleId: { type: String }, // For Social Login

  // 2. ROLE & STATUS (Critical for dashboard logic)
  role: { 
    type: String, 
    enum: ['client', 'freelancer', 'affiliate', 'admin'], 
    default: 'client' 
  },
  planType: { 
    type: String, 
    enum: ['free', 'silver', 'gold'], 
    default: 'free' 
  },
  onlineStatus: { 
    type: String, 
    enum: ['online', 'away', 'offline'], 
    default: 'offline' 
  },
  isEmailVerified: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false }, // Professional Checkmark

  // 3. PROFILE BRANDING (From your Hero/Profile designs)
  avatar: { type: String, default: 'default-avatar.png' },
  coverImage: { type: String, default: 'raz.jpg' }, 
  professionalTitle: { type: String }, 
  bio: { type: String, maxlength: 500 },
  location: {
    country: { type: String, default: 'Ghana' },
    city: { type: String, default: 'Accra' }
  },

  // 4. PERFORMANCE METRICS (Updated automatically by backend events)
  // These support the gauges and bars in your dashboards
  metrics: {
    responseRate: { type: Number, default: 100 },      // %
    onTimeDelivery: { type: Number, default: 100 },    // %
    orderCompletion: { type: Number, default: 100 },   // %
    earnedThisMonth: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },          // For Client Dashboard
    activeOrdersCount: { type: Number, default: 0 },   // Badge count
    affiliateClicks: { type: Number, default: 0 },     // For Affiliate Dashboard
    referralCount: { type: Number, default: 0 }
  },

  // 5. REPUTATION & SOCIAL
  level: { 
    type: String, 
    enum: ['New Seller', 'Level 1', 'Level 2', 'Top Rated'], 
    default: 'New Seller' 
  },
  rank: { type: String }, // e.g., "Gold Affiliate"
  achievements: [String], // Array for fire/trophy icons
  skills: [String],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // 6. PRIVATE SETTINGS & COMPLIANCE (From Settings files)
  payoutDetails: {
    method: { type: String, enum: ['PayPal', 'Bank', 'M-Pesa', 'None'], default: 'None' },
    accountEmail: String,
    taxId: String
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: true }
  },
  isDeactivated: { type: Boolean, default: false },

  memberSince: { type: Date, default: Date.now }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 7. VIRTUALS (Calculated properties)
// Automatically calculates average rating from a "Reviews" collection (to be created)
UserSchema.virtual('averageRating').get(function() {
  return 5.0; // Placeholder until Review model is linked
});




/**
 * RESTRICTION LOGIC
 * This method checks if a user is allowed to upload more media
 * based on the limits defined in your post-service.js
 */
UserSchema.methods.canUploadMedia = function(mediaType, currentCount) {
  const planLimits = {
    free:   { images: 3, videos: 1, audio: 1 },
    silver: { images: 5, videos: 2, audio: 2 },
    gold:   { images: 8, videos: 4, audio: 4 }
  };

  const userPlan = this.planType; // 'free', 'silver', or 'gold'
  const limits = planLimits[userPlan];

  if (!limits[mediaType]) return false;

  // Check if currentCount is already at or above the limit
  return currentCount < limits[mediaType];
};

module.exports = mongoose.model('User', UserSchema);



module.exports = mongoose.model('User', UserSchema);