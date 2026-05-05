// lib/constants.ts

export const BRAND = {
    pretty: "Thick 9",        // Use this for: Headers, Footers, UI Text
    slug: "thick-nine",       // Use this for: URLs, folder logic, GitHub
    dbName: "freelancingDB"   // Use this for: MongoDB connection
  };


  // Add this line below the BRAND object
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://thicknine-adwk--5000--4c73681d.local-credentialless.webcontainer.io';