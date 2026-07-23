"use client";

import { useState, useMemo } from "react";
import type { Service } from "@/types/service";

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
  sortBy: "Newest",
  currentPage: 1,
};

export function useSearchFilters(initialServices: Service[] = [], itemsPerPage = 20) {
  const [searchTerm, setSearchTerm] = useState<string>(DEFAULT_FILTERS.searchTerm);
  const [categories, setCategories] = useState<string[]>(DEFAULT_FILTERS.categories);
  const [minPrice, setMinPrice] = useState<number>(DEFAULT_FILTERS.minPrice);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_FILTERS.maxPrice);
  const [locations, setLocations] = useState<string[]>(DEFAULT_FILTERS.locations);
  const [delivery, setDelivery] = useState<string>(DEFAULT_FILTERS.delivery);
  const [isOnlineOnly, setIsOnlineOnly] = useState<boolean>(DEFAULT_FILTERS.isOnlineOnly);
  const [isFeaturedOnly, setIsFeaturedOnly] = useState<boolean>(DEFAULT_FILTERS.isFeaturedOnly);
  const [isFavoriteOnly, setIsFavoriteOnly] = useState<boolean>(DEFAULT_FILTERS.isFavoriteOnly);
  const [sortBy, setSortBy] = useState<string>(DEFAULT_FILTERS.sortBy);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_FILTERS.currentPage);

  // Main Filter Logic (including search)
  const filteredServices = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return initialServices.filter((service) => {
      const svcAny = service as any;

      // 1. Search Term (Title, Seller, Description, Category, Location)
      if (term) {
        const locCity = typeof svcAny.location === "object" ? svcAny.location?.city : null;
        const locCountry = typeof svcAny.location === "object" ? svcAny.location?.country : null;
        const locString = typeof svcAny.location === "string" ? svcAny.location : null;

        const searchableText = [
          service.title,
          svcAny.sellerName,
          svcAny.seller?.fullName,
          service.category,
          service.description,
          locString,
          locCity,
          locCountry,
        ].filter(Boolean).join(" ").toLowerCase();

        if (!searchableText.includes(term)) {
          return false;
        }
      }

      // 2. Price Filter
      const price = Number(service.price);
      if (isNaN(price) || price < minPrice || price > maxPrice) {
        return false;
      }

      // 3. Categories Filter
      if (categories.length > 0 && !categories.includes(service.category || "")) {
        return false;
      }

      // 4. Quick Toggles
      if (isOnlineOnly && !svcAny.isOnline) return false;
      
      const isFeatured = Boolean(svcAny.isFeatured || svcAny.featured);
      if (isFeaturedOnly && !isFeatured) return false;

      const isFavorited = Boolean(svcAny.isFavorited || svcAny.isFavorite);
      if (isFavoriteOnly && !isFavorited) return false;

      // 5. Location Filter
      if (!locations.includes("Any") && locations.length > 0) {
        const locCity = typeof svcAny.location === "object" ? svcAny.location?.city : null;
        const locCountry = typeof svcAny.location === "object" ? svcAny.location?.country : null;
        const locString = typeof svcAny.location === "string" ? svcAny.location : null;

        const serviceLoc = [locCity, locCountry, locString].filter(Boolean).join(", ");

        if (!locations.some((loc) => serviceLoc.includes(loc))) {
          return false;
        }
      }

      // 6. Delivery Filter
      if (delivery !== "Any") {
        const maxDays = parseInt(delivery, 10);
        const serviceDays = Number(svcAny.deliveryTime);
        if (!isNaN(maxDays) && !isNaN(serviceDays) && serviceDays > maxDays) {
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
  ]);

  // Sorting
  const sortedServices = useMemo(() => {
    const list = [...filteredServices];

    if (sortBy === "Popular") {
      return list.sort((a, b) => ((b as any).rating ?? 0) - ((a as any).rating ?? 0));
    }

    if (sortBy === "Newest") {
      return list.sort((a, b) => {
        const dateA = new Date((a as any).createdAt || 0).getTime();
        const dateB = new Date((b as any).createdAt || 0).getTime();
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
    setSortBy(DEFAULT_FILTERS.sortBy);
    setCurrentPage(DEFAULT_FILTERS.currentPage);
  };

  return {
    // State
    searchTerm,
    categories,
    minPrice,
    maxPrice,
    locations,
    delivery,
    isOnlineOnly,
    isFeaturedOnly,
    isFavoriteOnly,
    sortBy,
    currentPage,
    totalPages,
    totalMatches,

    // Computed
    paginatedServices,

    // Actions
    setSearchTerm,
    setCategories,
    setMinPrice,
    setMaxPrice,
    setLocations,
    setDelivery,
    setIsOnlineOnly,
    setIsFeaturedOnly,
    setIsFavoriteOnly,
    setSortBy,
    setCurrentPage,
    clearAllFilters,
  };
}