// lib/constants.js

// 1. App Branding Details
export const BRAND = {
  pretty: "Thick 9",        // Used for UI text
  slug: "thick-nine",       // Used for URLs and folder logic
  dbName: "freelancingDB"   // Explicitly targets your marketplace database
};

// 2. Evaluate and cache the environment variable immediately on module load
const CACHED_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://thick-nine-backend.onrender.com';

// 3. Export the static cached string value
export const API_BASE_URL = CACHED_API_URL;

// ----------------------------------------------------
// 4. Service Post & Marketplace Configuration
// ----------------------------------------------------

export const MARKETPLACE_FEE_PERCENTAGE = 0.10; // 10% platform fee

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