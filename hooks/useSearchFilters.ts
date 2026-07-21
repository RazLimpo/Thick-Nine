"use client";

import { useState, useMemo } from "react";
import type { Service } from "@/types/service";

export interface FilterState {
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

  // 1. FILTER ENGINE
  const filteredServices = useMemo(() => {
    return initialServices.filter((service) => {
      // Price Filter
      if (service.price < minPrice || service.price > maxPrice) {
        return false;
      }

      // Categories Filter
      if (categories.length > 0 && !categories.includes(service.category)) {
        return false;
      }

      // Quick Toggles
      if (isOnlineOnly && !service.isOnline) return false;
      if (isFeaturedOnly && !service.featured) return false;

      // Location Filter
      const skipLoc = locations.includes("Any") || locations.length === 0;
      if (!skipLoc && !locations.some((loc) => service.location.includes(loc))) {
        return false;
      }

      // Delivery Time Filter
      if (delivery !== "Any") {
        const maxAllowedDelivery = parseInt(delivery, 10);
        if (!isNaN(maxAllowedDelivery) && service.deliveryTime > maxAllowedDelivery) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialServices,
    minPrice,
    maxPrice,
    categories,
    isOnlineOnly,
    isFeaturedOnly,
    locations,
    delivery,
  ]);

  // 2. SORT ENGINE
  const sortedServices = useMemo(() => {
    const list = [...filteredServices];
    if (sortBy === "Popular") {
      return list.sort((a, b) => b.rating - a.rating);
    }
    // Default to Newest
    return list;
  }, [filteredServices, sortBy]);

  // 3. PAGINATION CALCULATIONS
  const totalMatches = sortedServices.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / itemsPerPage));

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedServices.slice(start, start + itemsPerPage);
  }, [sortedServices, currentPage, itemsPerPage]);

  // Reset all filters back to initial state
  const clearAllFilters = () => {
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

    // Computed Output
    paginatedServices,

    // Setters & Actions
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