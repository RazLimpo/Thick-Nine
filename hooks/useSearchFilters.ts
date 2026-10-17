"use client";

import { useState, useMemo } from "react";
import type { Service } from "@/types/service";
import { isUserOnline } from "@/lib/presence";

export interface FilterState {
  searchTerm: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  locations: string[];
  delivery: string;
  isOnlineOnly: boolean;
  isFeaturedOnly: boolean;
  isFavoriteOnly: boolean;
  isProOnly: boolean;
  sortBy: string;
  currentPage: number;
}

const DEFAULT_FILTERS: FilterState = {
  searchTerm: "",
  categories: [],
  minPrice: 5,
  maxPrice: 1000,
  locations: ["Any"],
  delivery: "Any",
  isOnlineOnly: false,
  isFeaturedOnly: false,
  isFavoriteOnly: false,
  isProOnly: false,
  sortBy: "Newest",
  currentPage: 1,
};

export function useSearchFilters(
  initialServices: Service[] = [],
  itemsPerPage = 20
) {
  const [searchTerm, setSearchTerm] = useState<string>(DEFAULT_FILTERS.searchTerm);
  const [categories, setCategories] = useState<string[]>(DEFAULT_FILTERS.categories);
  const [minPrice, setMinPrice] = useState<number>(DEFAULT_FILTERS.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_FILTERS.maxPrice);
  const [locations, setLocations] = useState<string[]>(DEFAULT_FILTERS.locations);
  const [delivery, setDelivery] = useState<string>(DEFAULT_FILTERS.delivery);
  const [isOnlineOnly, setIsOnlineOnly] = useState<boolean>(DEFAULT_FILTERS.isOnlineOnly);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState<boolean>(DEFAULT_FILTERS.isFeaturedOnly);
  const [isFavoriteOnly, setIsFavoriteOnly] = useState<boolean>(DEFAULT_FILTERS.isFavoriteOnly);
  const [isProOnly, setIsProOnly] = useState<boolean>(DEFAULT_FILTERS.isProOnly);
  const [sortBy, setSortBy] = useState<string>(DEFAULT_FILTERS.sortBy);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_FILTERS.currentPage);

  // Main Filter Logic (including search)
  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return initialServices.filter((service) => {
      const svcAny = service as Service & {
        location?: string | { city?: string; country?: string };
        sellerName?: string;
        seller?: { fullName?: string; isPro?: boolean };
        featured?: boolean;
        isFavorite?: boolean;
        isPro?: boolean;
        sellerLevel?: string;
        createdAt?: string;
      };

      // 1. Search Term (Title, Seller, Description, Category, Tags, Location)
      if (term) {
        const locCity =
          typeof svcAny.location === "object" ? svcAny.location?.city : null;
        const locCountry =
          typeof svcAny.location === "object" ? svcAny.location?.country : null;
        const locString =
          typeof svcAny.location === "string" ? svcAny.location : null;

        const seller = service.sellerId;
        const tagText = Array.isArray(service.tags)
          ? service.tags.join(" ")
          : "";

        const searchableText = [
          service.title,
          service.sellerName,
          seller?.fullName,
          seller?.displayName,
          service.category,
          service.subCategory,
          service.description,
          tagText,
          locString,
          locCity,
          locCountry,
          seller?.location?.city,
          seller?.location?.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        // Match whole term or any whitespace-separated token (multi-word queries)
        const tokens = term.split(/\s+/).filter(Boolean);
        const matchesAllTokens = tokens.every((t) =>
          searchableText.includes(t)
        );
        if (!matchesAllTokens) {
          return false;
        }
      }

      // 2. Price Filter
      const price = Number(service.price);
      if (isNaN(price) || price < minPrice || price > maxPrice) {
        return false;
      }

      // 3. Categories Filter
      if (
        categories.length > 0 &&
        !categories.includes(service.category || "")
      ) {
        return false;
      }

      // 4. Quick Toggles — online uses shared presence helper
      if (
        isOnlineOnly &&
        !isUserOnline({
          isOnline: service.isOnline,
          onlineStatus: service.sellerId?.onlineStatus,
          lastSeen: service.sellerId?.lastSeen,
        })
      ) {
        return false;
      }

      const isFeatured = Boolean(service.isFeatured || svcAny.featured);
      if (isFeaturedOnly && !isFeatured) return false;

      const isFavorited = Boolean(service.isFavorited || svcAny.isFavorite);
      if (isFavoriteOnly && !isFavorited) return false;

      // Pro: plan-based (matches ServiceCard)
      const isProSeller = Boolean(
        service.sellerId?.planType === "gold" ||
          service.sellerId?.planType === "silver" ||
          svcAny.isPro ||
          svcAny.seller?.isPro
      );
      if (isProOnly && !isProSeller) return false;

      // 5. Location Filter
      if (!locations.includes("Any") && locations.length > 0) {
        const locCity =
          typeof svcAny.location === "object" ? svcAny.location?.city : null;
        const locCountry =
          typeof svcAny.location === "object" ? svcAny.location?.country : null;
        const locString =
          typeof svcAny.location === "string" ? svcAny.location : null;
        const sellerLoc = service.sellerId?.location;

        const serviceLoc = [
          locCity,
          locCountry,
          locString,
          sellerLoc?.city,
          sellerLoc?.country,
        ]
          .filter(Boolean)
          .join(", ");

        if (!locations.some((loc) => serviceLoc.includes(loc))) {
          return false;
        }
      }

      // 6. Delivery Filter
      if (delivery !== "Any") {
        const maxDays = parseInt(delivery, 10);
        const serviceDays = Number(service.deliveryTime);
        if (
          !isNaN(maxDays) &&
          !isNaN(serviceDays) &&
          serviceDays > maxDays
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialServices,
    searchTerm,
    minPrice,
    maxPrice,
    categories,
    locations,
    delivery,
    isOnlineOnly,
    isFeaturedOnly,
    isFavoriteOnly,
    isProOnly,
  ]);

  // Sorting
  const sortedServices = useMemo(() => {
    const list = [...filteredServices];

    if (sortBy === "Popular") {
      return list.sort(
        (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
    }

    if (sortBy === "Newest") {
      return list.sort((a, b) => {
        const dateA = new Date(
          (a as Service & { createdAt?: string }).createdAt || 0
        ).getTime();
        const dateB = new Date(
          (b as Service & { createdAt?: string }).createdAt || 0
        ).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [filteredServices, sortBy]);

  // Pagination
  const totalMatches = sortedServices.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / itemsPerPage));

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedServices.slice(start, start + itemsPerPage);
  }, [sortedServices, currentPage, itemsPerPage]);

  const clearAllFilters = () => {
    setSearchTerm(DEFAULT_FILTERS.searchTerm);
    setCategories(DEFAULT_FILTERS.categories);
    setMinPrice(DEFAULT_FILTERS.minPrice);
    setMaxPrice(DEFAULT_FILTERS.maxPrice);
    setLocations(DEFAULT_FILTERS.locations);
    setDelivery(DEFAULT_FILTERS.delivery);
    setIsOnlineOnly(DEFAULT_FILTERS.isOnlineOnly);
    setIsFeaturedOnly(DEFAULT_FILTERS.isFeaturedOnly);
    setIsFavoriteOnly(DEFAULT_FILTERS.isFavoriteOnly);
    setIsProOnly(DEFAULT_FILTERS.isProOnly);
    setSortBy(DEFAULT_FILTERS.sortBy);
    setCurrentPage(DEFAULT_FILTERS.currentPage);
  };

  return {
    searchTerm,
    categories,
    minPrice,
    maxPrice,
    locations,
    delivery,
    isOnlineOnly,
    isFeaturedOnly,
    isFavoriteOnly,
    isProOnly,
    sortBy,
    currentPage,
    totalPages,
    totalMatches,
    paginatedServices,
    setSearchTerm,
    setCategories,
    setMinPrice,
    setMaxPrice,
    setLocations,
    setDelivery,
    setIsOnlineOnly,
    setIsFeaturedOnly,
    setIsFavoriteOnly,
    setIsProOnly,
    setSortBy,
    setCurrentPage,
    clearAllFilters,
  };
}
