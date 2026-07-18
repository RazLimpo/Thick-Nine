// lib/mappers/serviceMapper.ts

import { Service, BackendServiceResponse } from "@/types/service";

/**
 * Maps and sanitizes raw backend/database service documents into the 
 * strict, flattened Service layout required by the frontend UI components.
 */
export function mapService(rawService: any): Service {
  // Safe extraction of the populated seller block
  const sellerData = rawService.sellerId && typeof rawService.sellerId === 'object' 
    ? rawService.sellerId 
    : null;

  // Resolve country/city into a clean string layout
  let calculatedLocation = "Remote";
  if (sellerData?.location) {
    const { city, country } = sellerData.location;
    calculatedLocation = city && country ? `${city}, ${country}` : country || city || "Remote";
  } else if (typeof rawService.location === 'string') {
    calculatedLocation = rawService.location;
  }

  // Runtime sanitization: Safely parse strings to numbers to fulfill type guarantees
  const parsedPrice = typeof rawService.price === 'number' 
    ? rawService.price 
    : parseFloat(String(rawService.price || 0));

  const parsedRating = typeof rawService.rating === 'number'
    ? rawService.rating
    : parseFloat(String(rawService.rating || 5.0));

  const parsedDelivery = typeof rawService.deliveryTime === 'number'
    ? rawService.deliveryTime
    : parseInt(String(rawService.deliveryTime || rawService.delivery || 3));

  return {
    // Flattened top-level mapping properties
    id: String(rawService._id || rawService.id),
    title: rawService.title || "Untitled Service",
    category: rawService.category || "General",
    images: Array.isArray(rawService.images) && rawService.images.length > 0 
      ? rawService.images 
      : ["/default-service.png"],
    
    // Hard sanitized numerical primitives matching global interfaces
    price: isNaN(parsedPrice) ? 0 : parsedPrice,
    rating: isNaN(parsedRating) ? 5.0 : parsedRating,
    deliveryTime: isNaN(parsedDelivery) ? 3 : parsedDelivery,
    
    // Explicit visibility flag states mapping to backend schema fields
    featured: Boolean(rawService.featured),
    sponsored: Boolean(rawService.sponsored),

    // Populated fallback bindings reading directly from nested seller models
    seller: sellerData?.fullName || rawService.seller || "Unknown Seller",
    avatar: sellerData?.avatar || rawService.avatar || "/default-avatar.png",
    level: sellerData?.level || rawService.level || "Level 1 Seller",
    isOnline: sellerData?.onlineStatus === 'online' || Boolean(rawService.isOnline),
    location: calculatedLocation,

    // Optional fields
    description: rawService.description || ""
  };
}