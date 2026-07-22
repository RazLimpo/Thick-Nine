const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const User = require("../models/User");

// GET /api/services/locations
// Returns distinct locations of sellers who have active services
router.get("/locations", async (req, res) => {
  try {
    // 1. Find all seller IDs with active services
    const activeSellerIds = await Service.distinct("sellerId", { status: "active" });

    // 2. Retrieve location data for those active sellers
    const users = await User.find(
      { _id: { $in: activeSellerIds } },
      "location"
    ).lean();

    // 3. Format locations into "City, Country" strings
    const uniqueLocations = new Set();

    users.forEach((user) => {
      if (!user.location) return;

      const city = user.location.city?.trim();
      const country = user.location.country?.trim();

      let locationStr = "";
      if (city && country) {
        locationStr = `${city}, ${country}`;
      } else if (city || country) {
        locationStr = city || country;
      }

      if (locationStr) {
        uniqueLocations.add(locationStr);
      }
    });

    // 4. Convert to an array sorted alphabetically
    const locations = Array.from(uniqueLocations)
      .sort((a, b) => a.localeCompare(b))
      .map((loc) => ({ label: loc, value: loc }));

    res.json({ locations });
  } catch (error) {
    console.error("Error fetching filter locations:", error);
    res.status(500).json({ message: "Failed to fetch filter locations" });
  }
});

module.exports = router;