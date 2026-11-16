// lib/api/services.ts

import { API_BASE_URL } from "@/lib/constants";
import type { BackendSeller, Service } from "@/types/service";

/**
 * Fetch marketplace services from the Express backend.
 * Returns a raw array for mapService() / normalizeService().
 */
export async function getServices(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/services`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ||
        "Failed to fetch marketplace services."
    );
  }

  // Support both shapes during transition
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray((data as { services?: unknown }).services)) {
    return (data as { services: any[] }).services;
  }

  return [];
}

/**
 * Fetch a single service by ID.
 * Optional `extraHeaders` (Authorization / Cookie) let the backend return
 * paused/draft when the caller is the seller (owner preview).
 * Returns null when missing or not visible to this caller.
 */
export async function getServiceById(
  id: string,
  extraHeaders?: Record<string, string>
): Promise<Service | null> {
  if (!id) return null;

  const response = await fetch(`${API_BASE_URL}/api/services/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(extraHeaders || {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(
      (data as { message?: string }).message || "Failed to fetch service."
    );
  }

  // Support both { success, service } and raw document shapes
  const raw =
    data && typeof data === "object" && "service" in data
      ? (data as { service: unknown }).service
      : data;

  if (!raw || typeof raw !== "object") return null;

  return normalizeService(raw as Record<string, unknown>);
}

/** Align seller level with User.level enum */
function normalizeSellerLevel(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "New Seller";
  // Legacy UI label → enum
  if (/^level\s*1\s*seller$/i.test(raw)) return "Level 1";
  if (/^level\s*2\s*seller$/i.test(raw)) return "Level 2";
  if (/top\s*rated/i.test(raw)) return "Top Rated";
  if (/new\s*seller/i.test(raw)) return "New Seller";
  // Already one of: New Seller | Level 1 | Level 2 | Top Rated
  return raw;
}

/** Normalize backend document → frontend Service shape */
export function normalizeService(raw: Record<string, unknown>): Service {
  const seller = raw.sellerId as Record<string, unknown> | undefined;

  const normalizedSeller: BackendSeller | undefined = seller
    ? {
        _id: String(seller._id ?? ""),
        fullName: String(seller.fullName ?? ""),
        displayName:
          typeof seller.displayName === "string"
            ? seller.displayName
            : undefined,
        avatar: String(seller.avatar ?? "/default-avatar.png"),
        level: normalizeSellerLevel(seller.level),
        onlineStatus:
          typeof seller.onlineStatus === "string"
            ? seller.onlineStatus
            : undefined,
        lastSeen:
          seller.lastSeen != null
            ? (seller.lastSeen as string | Date)
            : null,
        isVerified: Boolean(seller.isVerified),
        planType:
          typeof seller.planType === "string" ? seller.planType : undefined,
        location: seller.location as BackendSeller["location"],
        professionalTitle:
          typeof seller.professionalTitle === "string"
            ? seller.professionalTitle
            : undefined,
        metrics: seller.metrics as BackendSeller["metrics"],
        memberSince:
          typeof seller.memberSince === "string"
            ? seller.memberSince
            : undefined,
      }
    : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ""),
    _id: String(raw._id ?? raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: typeof raw.description === "string" ? raw.description : "",
    category: typeof raw.category === "string" ? raw.category : undefined,
    subCategory:
      typeof raw.subCategory === "string" ? raw.subCategory : undefined,
    price: Number(raw.price) || 0,
    images: Array.isArray(raw.images) ? (raw.images as string[]) : [],
    videos: Array.isArray(raw.videos) ? (raw.videos as string[]) : [],
    audio: Array.isArray(raw.audio) ? (raw.audio as string[]) : [],
    deliveryTime: (raw.deliveryTime as number | string) ?? 3,
    rating: Number(raw.rating) || 0,
    reviewsCount: Number(raw.reviewsCount) || 0,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    attributes: Array.isArray(raw.attributes)
      ? (raw.attributes as string[])
      : [],
    packages: (raw.packages as Service["packages"]) ?? {},
    addons: Array.isArray(raw.addons) ? (raw.addons as Service["addons"]) : [],
    faqs: Array.isArray(raw.faqs) ? (raw.faqs as Service["faqs"]) : [],
    requirements: Array.isArray(raw.requirements)
      ? (raw.requirements as string[])
      : [],
    selectedPlan:
      typeof raw.selectedPlan === "string" ? raw.selectedPlan : "free",
    status: typeof raw.status === "string" ? raw.status : "active",
    isFeatured: Boolean(raw.featured),
    isSponsored: Boolean(raw.sponsored),
    sellerId: normalizedSeller,
    sellerName:
      normalizedSeller?.displayName ||
      normalizedSeller?.fullName ||
      undefined,
    sellerAvatar: normalizedSeller?.avatar,
    // Seller level lives on the user — never invent "Level 1 Seller"
    level: normalizedSeller?.level ?? "New Seller",
    isOnline: normalizedSeller?.onlineStatus === "online",
  };
}

/** Map a list of backend services (from getServices) into UI Service shape */
export function mapServices(rawList: any[]): Service[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((row) => row && typeof row === "object")
    .map((row) => normalizeService(row as Record<string, unknown>));
}
