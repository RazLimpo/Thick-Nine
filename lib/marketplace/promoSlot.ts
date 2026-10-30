// lib/marketplace/promoSlot.ts
// Priority for the search/home promo strip:
// 1) Paid / flagged Sponsored (Service.sponsored → isSponsored)
// 2) Else Featured = top performing active services (computed, free)

import type { Service } from "@/types/service";

export type PromoMode = "sponsored" | "featured" | "empty";

export type PromoAd = {
  id: string;
  title: string;
  price: string;
  username: string;
  gender?: "male" | "female";
  imageUrl: string;
  linkUrl: string;
  /** UI label: Sponsored vs Featured */
  badge: "Sponsored" | "Featured";
};

const FEATURED_LIMIT = 20;

/** Simple performance score — higher is better. */
export function performanceScore(s: Service & { orders?: number; views?: number; clicks?: number }): number {
  const rating = typeof s.rating === "number" ? s.rating : 0;
  const reviews = typeof s.reviewsCount === "number" ? s.reviewsCount : 0;
  const orders = typeof (s as { orders?: number }).orders === "number"
    ? (s as { orders: number }).orders
    : 0;
  const views = typeof (s as { views?: number }).views === "number"
    ? (s as { views: number }).views
    : 0;
  const clicks = typeof (s as { clicks?: number }).clicks === "number"
    ? (s as { clicks: number }).clicks
    : 0;

  // Weighted: completed demand + quality signal + attention
  return orders * 12 + rating * Math.log10(reviews + 1) * 8 + clicks * 0.5 + views * 0.05;
}

function toAd(service: Service, badge: "Sponsored" | "Featured"): PromoAd | null {
  const id = String(service.id ?? service._id ?? "");
  if (!id) return null;
  return {
    id,
    title: service.title || "Service",
    price: String(service.price ?? 0),
    username: service.sellerName ?? "Freelancer",
    gender: service.sellerGender,
    imageUrl: service.images?.[0] ?? "/default-service.png",
    linkUrl: `/services/details/${id}`,
    badge,
  };
}

/**
 * Pick promo strip content.
 * - If any isSponsored → only those (paid / manual flag)
 * - Else top performers as Featured (up to FEATURED_LIMIT)
 * - Else empty (caller should hide carousel)
 */
export function pickPromoSlot(services: Service[]): {
  mode: PromoMode;
  ads: PromoAd[];
} {
  const active = (services || []).filter((s) => {
    const status = (s as { status?: string }).status;
    // If status missing (list API), treat as eligible
    return !status || status === "active";
  });

  const now = Date.now();
  const sponsored = active.filter((s) => {
    if (!s.isSponsored) return false;
    const until = (s as { sponsoredUntil?: string | Date | null }).sponsoredUntil;
    if (!until) return true; // legacy permanent flag
    const ts = new Date(until).getTime();
    return !Number.isNaN(ts) && ts > now;
  });
  if (sponsored.length > 0) {
    const ads = sponsored
      .map((s) => toAd(s, "Sponsored"))
      .filter((a): a is PromoAd => !!a);
    return { mode: "sponsored", ads };
  }

  const ranked = [...active]
    .sort((a, b) => performanceScore(b) - performanceScore(a))
    .slice(0, FEATURED_LIMIT);

  // Only show Featured if there is something meaningful (at least one with signal or any active)
  const ads = ranked
    .map((s) => toAd(s, "Featured"))
    .filter((a): a is PromoAd => !!a);

  if (ads.length === 0) {
    return { mode: "empty", ads: [] };
  }

  return { mode: "featured", ads };
}

/** How many cards visible per homepage carousel page */
export const HOME_PROMO_PAGE_SIZE = 5;

/**
 * Build pages of services for the homepage multi-card carousel.
 * Last page wrap-fills from the start when remainder < pageSize
 * e.g. 12 items → pages [0-4], [5-9], [10,11,0,1,2]
 */
export function buildWrapPages<T>(items: T[], pageSize = HOME_PROMO_PAGE_SIZE): T[][] {
  if (!items.length) return [];
  if (items.length <= pageSize) return [items];

  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    const slice = items.slice(i, i + pageSize);
    if (slice.length < pageSize && pages.length > 0) {
      const need = pageSize - slice.length;
      pages.push([...slice, ...items.slice(0, need)]);
    } else {
      pages.push(slice);
    }
  }
  return pages;
}

/**
 * Same priority as pickPromoSlot, but returns full Service objects
 * for rendering ServiceCard on the homepage.
 */
export function pickPromoServices(services: Service[]): {
  mode: PromoMode;
  services: Service[];
} {
  const { mode, ads } = pickPromoSlot(services);
  if (mode === "empty" || ads.length === 0) {
    return { mode: "empty", services: [] };
  }

  const byId = new Map<string, Service>();
  (services || []).forEach((s) => {
    const id = String(s.id ?? s._id ?? "");
    if (id) byId.set(id, s);
  });

  const list = ads
    .map((a) => byId.get(a.id))
    .filter((s): s is Service => !!s);

  return { mode, services: list };
}
