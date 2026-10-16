// ==========================================
// FILE: lib/mappers/serviceMapper.ts
// ==========================================

import type { Service, BackendServiceResponse } from "@/types/service";
import { isUserOnline } from "@/lib/presence";

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

  const raw = rawService as BackendServiceResponse & {
    rating?: number;
    reviewsCount?: number;
  };

  const rating =
    typeof raw.rating === "number" && !Number.isNaN(raw.rating) ? raw.rating : 0;
  const reviewsCount =
    typeof raw.reviewsCount === "number" && !Number.isNaN(raw.reviewsCount)
      ? raw.reviewsCount
      : 0;

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
    // ----------------------------------------
    rating,
    reviewsCount,

    // ----------------------------------------
    // Seller Information
    // ----------------------------------------
    sellerName:
      seller?.displayName || seller?.fullName || "Unknown Seller",

    sellerAvatar: seller?.avatar || "/default-avatar.png",

    sellerGender: seller?.gender,

    // Pass full seller object (includes onlineStatus + lastSeen when API populates them)
    sellerId: seller,

    level: seller?.level || "Level 1 Seller",

    isOnline: isUserOnline({
      onlineStatus: seller?.onlineStatus,
      lastSeen: seller?.lastSeen,
    }),

    // ----------------------------------------
    // Marketplace Flags
    // ----------------------------------------
    isFeatured: Boolean(rawService.featured),

    isSponsored: Boolean(rawService.sponsored),

    isFavorited: false,
  };
}
