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