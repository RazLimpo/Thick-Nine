// lib/constants.js

// ==========================================
// BLOCK 1: BRANDING & ENVIRONMENT CONFIG
// ==========================================

export const BRAND = {
  pretty: "Thick 9",        // Used for UI text
  slug: "thick-nine",       // Used for URLs and folder logic
  dbName: "freelancingDB"   // Explicitly targets your marketplace database
};

// Evaluate and cache the environment variable immediately on module load
const CACHED_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://thick-nine-backend.onrender.com';

export const API_BASE_URL = CACHED_API_URL;


// ==========================================
// BLOCK 2: MARKETPLACE FEE & PLAN LIMITS
// ==========================================

// Marketplace platform fee set to 12%
export const MARKETPLACE_FEE_PERCENTAGE = 0.12;

export const PLAN_LIMITS = {
  free: {
    images: 1,
    videos: 0,
    audio: 0,
    label: "Free Plan"
  },
  silver: {
    images: 3,
    videos: 1,
    audio: 1,
    label: "Silver Plan"
  },
  gold: {
    images: 5,
    videos: 3,
    audio: 3,
    label: "Gold Plan"
  }
};


// ==========================================
// BLOCK 3: DEFAULT STATES & INITIAL VALUES
// ==========================================

export const INITIAL_PACKAGE_STATE = {
  basic: {
    title: "",
    desc: "",
    price: "",
    delivery: "3 Days",
    revisions: "1 Revision",
    features: ""
  },
  standard: {
    title: "",
    desc: "",
    price: "",
    delivery: "5 Days",
    revisions: "3 Revisions",
    features: ""
  },
  premium: {
    title: "",
    desc: "",
    price: "",
    delivery: "7 Days",
    revisions: "Unlimited Revisions",
    features: ""
  }
};

export const DEFAULT_DESIGN_BRIEF = {
  intro: "",
  req1: "",
  req2: "",
  req3: "",
  req4: ""
};