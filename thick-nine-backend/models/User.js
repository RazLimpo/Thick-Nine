const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // 1. ACCOUNT AUTH & IDENTITY
  fullName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Security: Hidden from queries by default
  googleId: { type: String }, 

  // 2. ROLE & STATUS
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
  isVerified: { type: Boolean, default: false }, 

  // ADD THIS LINE HERE
  accountStrength: { type: Number, default: 50 },

  // 3. PROFILE BRANDING
  avatar: { type: String, default: 'default-avatar.png' },
  coverImage: { type: String, default: 'raz.jpg' }, 
  professionalTitle: { type: String }, 
  bio: { type: String, maxlength: 500 },
  location: {
    country: { type: String, default: 'Ghana' },
    city: { type: String, default: 'Accra' }
  },

  // 4. PERFORMANCE METRICS (For Dashboard Gauges)
  metrics: {
    responseRate: { type: Number, default: 100 },
    onTimeDelivery: { type: Number, default: 100 },
    orderCompletion: { type: Number, default: 100 },
    earnedThisMonth: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    activeOrdersCount: { type: Number, default: 0 },
    affiliateClicks: { type: Number, default: 0 },
    referralCount: { type: Number, default: 0 }
  },

  // 5. REPUTATION & SOCIAL
  level: { 
    type: String, 
    enum: ['New Seller', 'Level 1', 'Level 2', 'Top Rated'], 
    default: 'New Seller' 
  },
  rank: { type: String }, 
  skills: [String],
  walletBalance: { type: Number, default: 0 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // 6. PRIVATE SETTINGS
  payoutDetails: {
    method: { type: String, enum: ['PayPal', 'Bank', 'M-Pesa', 'None'], default: 'None' },
    accountEmail: String
  },
  memberSince: { type: Date, default: Date.now }
}, {
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 7. VIRTUALS
UserSchema.virtual('averageRating').get(function() {
  return 5.0; // Placeholder
});

// 8. CUSTOM LOGIC METHODS
UserSchema.methods.canUploadMedia = function(mediaType, currentCount) {
  const planLimits = {
    free:   { images: 3, videos: 1, audio: 1 },
    silver: { images: 5, videos: 2, audio: 2 },
    gold:   { images: 8, videos: 4, audio: 4 }
  };
  const limits = planLimits[this.planType];
  return currentCount < (limits[mediaType] || 0);
};



UserSchema.methods.calculateStrength = function() {
  let score = 50; // Base score for creating an account
  if (this.bio) score += 10;
  if (this.avatar !== 'default-avatar.png') score += 10;
  if (this.skills && this.skills.length > 0) score += 15;
  if (this.isEmailVerified) score += 15;
  
  this.accountStrength = Math.min(score, 100); // Cap at 100%
  return this.accountStrength;
};

module.exports = mongoose.model('User', UserSchema);