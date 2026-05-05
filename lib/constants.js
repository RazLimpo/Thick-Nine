// lib/constants.js

const BRAND = {
  pretty: "Thick 9",        // Used for UI text
  slug: "thick-nine",       // Used for URLs and folder logic
  dbName: "freelancingDB"   // Explicitly targets your marketplace database
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://thicknine-adwk--5000--4c73681d.local-credentialless.webcontainer.io';

module.exports = { BRAND, API_BASE_URL };