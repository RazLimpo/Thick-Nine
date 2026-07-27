//models/User.js


const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
{
    /* ===========================================================
       SECTION 1 — ACCOUNT IDENTITY
       =========================================================== */

    fullName: {
        type: String,
        required: true,
        trim: true
    },

    displayName: {
        type: String,
        trim: true,
        default: ""
    },

    username: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        sparse: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },



    /* ===========================================================
       SECTION 2 — MARKETPLACE ROLE
       =========================================================== */

    role: {
        type: String,
        enum: [
            "client",
            "freelancer",
            "affiliate",
            "admin"
        ],
        default: "client"
    },



    /* ===========================================================
       SECTION 3 — ACCOUNT STATUS
       =========================================================== */

    isEmailVerified: {
        type: Boolean,
        default: false
    },

    isPhoneVerified: {
        type: Boolean,
        default: false
    },

    isIdentityVerified: {
        type: Boolean,
        default: false
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    isProfileComplete: {
        type: Boolean,
        default: false
    },

    verificationToken: {
        type: String,
        default: null
    },

    verificationTokenExpires: {
        type: Date,
        default: null
    },



    /* ===========================================================
       SECTION 4 — PROFILE
       =========================================================== */

    avatar: {
        type: String,
        default: "/default-avatar.png"
    },

    coverImage: {
        type: String,
        default: "/default-cover.jpg"
    },

    professionalTitle: {
        type: String,
        trim: true,
        default: ""
    },

    bio: {
        type: String,
        maxlength: 500,
        default: ""
    },

    gender: {
        type: String,
        enum: ["male", "female"]
    },

    referralCode: {
        type: String,
        trim: true,
        default: ""
    },



    /* ===========================================================
       SECTION 5 — LOCATION
       =========================================================== */

    location: {

        country: {
            type: String,
            default: "Ghana"
        },

        city: {
            type: String,
            default: "Accra"
        }

    },



    /* ===========================================================
       SECTION 6 — PROFESSIONAL PROFILE
       =========================================================== */

    level: {
        type: String,
        enum: [
            "New Seller",
            "Level 1",
            "Level 2",
            "Top Rated"
        ],
        default: "New Seller"
    },

    rank: {
        type: String,
        default: ""
    },

    planType: {
        type: String,
        enum: [
            "free",
            "silver",
            "gold"
        ],
        default: "free"
    },

    onlineStatus: {
        type: String,
        enum: [
            "online",
            "away",
            "offline"
        ],
        default: "offline"
    },

    lastSeen: {
        type: Date,
        default: Date.now
    },

    memberSince: {
        type: Date,
        default: Date.now
    },

    skills: [{
        type: String
    }],

    languages: [{
        type: String
    }],

    education: [{
        school: String,
        degree: String,
        year: String
    }],

    certifications: [{
        title: String,
        issuer: String,
        year: String
    }],

    portfolio: [{
        title: String,
        image: String,
        url: String
    }],
    
    
    
    
        /* ===========================================================
       SECTION 7 — SELLER REPUTATION
       =========================================================== */

    averageRating: {
        type: Number,
        default: 5,
        min: 0,
        max: 5
    },

    totalReviews: {
        type: Number,
        default: 0
    },

    completedOrders: {
        type: Number,
        default: 0
    },

    cancelledOrders: {
        type: Number,
        default: 0
    },

    repeatClients: {
        type: Number,
        default: 0
    },

    responseTime: {
        type: Number,
        default: 60
    },

    trustScore: {
        type: Number,
        default: 100
    },



    /* ===========================================================
       SECTION 8 — PERFORMANCE METRICS
       =========================================================== */

    metrics: {

        responseRate: {
            type: Number,
            default: 100
        },

        onTimeDelivery: {
            type: Number,
            default: 100
        },

        orderCompletion: {
            type: Number,
            default: 100
        },

        earnedThisMonth: {
            type: Number,
            default: 0
        },

        totalEarnings: {
            type: Number,
            default: 0
        },

        totalSpent: {
            type: Number,
            default: 0
        },

        activeOrdersCount: {
            type: Number,
            default: 0
        },

        affiliateClicks: {
            type: Number,
            default: 0
        },

        referralCount: {
            type: Number,
            default: 0
        }

    },



    /* ===========================================================
       SECTION 9 — MARKETPLACE ANALYTICS
       =========================================================== */

    analytics: {

        profileViews: {
            type: Number,
            default: 0
        },

        serviceViews: {
            type: Number,
            default: 0
        },

        totalClicks: {
            type: Number,
            default: 0
        },

        totalImpressions: {
            type: Number,
            default: 0
        },

        conversionRate: {
            type: Number,
            default: 0
        },

        favoritesReceived: {
            type: Number,
            default: 0
        }

    },



    /* ===========================================================
       SECTION 10 — MARKETPLACE STATISTICS
       =========================================================== */

    marketplace: {

        activeServices: {
            type: Number,
            default: 0
        },

        draftServices: {
            type: Number,
            default: 0
        },

        pausedServices: {
            type: Number,
            default: 0
        },

        featuredServices: {
            type: Number,
            default: 0
        },

        sponsoredServices: {
            type: Number,
            default: 0
        }

    },



    /* ===========================================================
       SECTION 11 — SUBSCRIPTION
       =========================================================== */

    subscription: {

        currentPlan: {
            type: String,
            enum: [
                "free",
                "silver",
                "gold"
            ],
            default: "free"
        },

        startedAt: {
            type: Date
        },

        expiresAt: {
            type: Date
        },

        featuredCredits: {
            type: Number,
            default: 0
        },

        boostCredits: {
            type: Number,
            default: 0
        }

    },



    /* ===========================================================
       SECTION 12 — WALLET
       =========================================================== */

    wallet: {

        availableBalance: {
            type: Number,
            default: 0
        },

        pendingBalance: {
            type: Number,
            default: 0
        },

        lifetimeEarnings: {
            type: Number,
            default: 0
        },

        lifetimeWithdrawals: {
            type: Number,
            default: 0
        }

    },



    /* ===========================================================
       SECTION 13 — PAYOUT DETAILS
       =========================================================== */

    payoutDetails: {

        method: {
            type: String,
            enum: [
                "PayPal",
                "Bank",
                "M-Pesa",
                "None"
            ],
            default: "None"
        },

        accountEmail: {
            type: String,
            default: ""
        }

    },



    /* ===========================================================
       SECTION 14 — SOCIAL
       =========================================================== */

    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    favoriteSellers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],



    /* ===========================================================
       SECTION 15 — ACCOUNT HEALTH
       =========================================================== */

    accountStrength: {
        type: Number,
        default: 50
    },
    
    
    
        /* ===========================================================
       SECTION 16 — USER SETTINGS
       =========================================================== */

    settings: {

        emailNotifications: {
            type: Boolean,
            default: true
        },

        smsNotifications: {
            type: Boolean,
            default: false
        },

        marketingEmails: {
            type: Boolean,
            default: true
        },

        publicProfile: {
            type: Boolean,
            default: true
        },

        showOnlineStatus: {
            type: Boolean,
            default: true
        }

    }

},
{
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});



/* ===========================================================
   VIRTUAL FIELDS
   =========================================================== */

UserSchema.virtual("displayLocation").get(function () {

    if (!this.location) return "";

    if (this.location.city && this.location.country) {
        return `${this.location.city}, ${this.location.country}`;
    }

    return this.location.country || "";
});

UserSchema.virtual("profileCompletion").get(function () {

    let score = 0;

    if (this.avatar) score += 10;
    if (this.bio) score += 10;
    if (this.professionalTitle) score += 10;
    if (this.skills.length) score += 10;
    if (this.languages.length) score += 10;
    if (this.location.country) score += 10;
    if (this.location.city) score += 10;
    if (this.isEmailVerified) score += 20;
    if (this.isIdentityVerified) score += 10;

    return Math.min(score, 100);

});


/* ===========================================================
   DATABASE INDEXES
   =========================================================== */

UserSchema.index({ email: 1 });

UserSchema.index({ username: 1 });

UserSchema.index({ role: 1 });

UserSchema.index({ onlineStatus: 1 });

UserSchema.index({ planType: 1 });

UserSchema.index({ averageRating: -1 });

UserSchema.index({ "location.country": 1 });

UserSchema.index({ "location.city": 1 });

UserSchema.index({ completedOrders: -1 });

UserSchema.index({ createdAt: -1 });



/* ===========================================================
   MARKETPLACE METHODS
   =========================================================== */

UserSchema.methods.canUploadMedia = function (
    mediaType,
    currentCount
) {

    const planLimits = {

        free: {
            images: 3,
            videos: 1,
            audio: 1
        },

        silver: {
            images: 6,
            videos: 3,
            audio: 3
        },

        gold: {
            images: 12,
            videos: 6,
            audio: 6
        }

    };

    const plan = planLimits[this.planType] || planLimits.free;

    return currentCount < (plan[mediaType] || 0);

};



UserSchema.methods.calculateStrength = function () {

    let score = 40;

    if (this.bio) score += 10;

    if (
        this.avatar &&
        this.avatar !== "/default-avatar.png"
    ) score += 10;

    if (this.professionalTitle) score += 10;

    if (this.skills.length) score += 10;

    if (this.languages.length) score += 5;

    if (this.isEmailVerified) score += 10;

    if (this.isIdentityVerified) score += 5;

    this.accountStrength = Math.min(score, 100);

    return this.accountStrength;

};



UserSchema.methods.isPremiumSeller = function () {

    return (
        this.planType === "silver" ||
        this.planType === "gold"
    );

};



UserSchema.methods.isTopRatedSeller = function () {

    return (
        this.averageRating >= 4.8 &&
        this.completedOrders >= 50
    );

};


/* ===========================================================
   MODEL EXPORT
   =========================================================== */

module.exports = mongoose.model(
    "User",
    UserSchema
);