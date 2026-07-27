// ==========================================
// FILE: lib/mappers/serviceMapper.ts
// ==========================================

import type { Service, BackendServiceResponse } from "@/types/service";

/**
 * Maps and sanitizes raw backend service documents into the
 * frontend Service interface used throughout the marketplace UI.
 */
export function mapService(rawService: BackendServiceResponse): Service {
  // ==========================================
  // 1. Extract Seller
  // ==========================================
  const seller = rawService.sellerId;

  // ==========================================
  // 2. Sanitize Numeric Fields
  // ==========================================
  const price =
    typeof rawService.price === "number"
      ? rawService.price
      : Number(rawService.price) || 0;

  const deliveryTime =
    typeof rawService.deliveryTime === "number"
      ? rawService.deliveryTime
      : Number(rawService.deliveryTime) || 3;

  // ==========================================
  // 3. Return Clean Service Object
  // ==========================================
  return {
    // ----------------------------------------
    // Service Identity
    // ----------------------------------------
    _id: rawService._id,
    id: rawService.id ?? rawService._id,

    // ----------------------------------------
    // Service Details
    // ----------------------------------------
    title: rawService.title || "Untitled Service",
    category: rawService.category || "General",
    description: rawService.description || "",

    price,
    deliveryTime,

    images:
      Array.isArray(rawService.images) && rawService.images.length > 0
        ? rawService.images
        : ["/default-service.png"],

    // ----------------------------------------
    // Marketplace Statistics
    // (Backend currently doesn't provide these)
    // ----------------------------------------
    rating: 5,
    reviewsCount: 0,

    // ----------------------------------------
    // Seller Information
    // ----------------------------------------
    sellerName:
      seller?.displayName ||
      seller?.fullName ||
      "Unknown Seller",

    sellerAvatar:
      seller?.avatar ||
      "/default-avatar.png",

    sellerGender: seller?.gender,

    sellerId: seller,

    level:
      seller?.level ||
      "Level 1 Seller",

    isOnline:
      seller?.onlineStatus === "online",

    // ----------------------------------------
    // Marketplace Flags
    // ----------------------------------------
    isFeatured: Boolean(rawService.featured),

    isSponsored: Boolean(rawService.sponsored),

    isFavorited: false,
  };
}