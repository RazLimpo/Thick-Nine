"use client";

import { useMemo, useState } from "react";

import SearchSidebar, { FilterState } from "@/components/SearchResults/SearchSidebar";
import SponsoredCarousel from "@/components/SearchResults/SponsoredCarousel";
import ResultsControls from "@/components/SearchResults/ResultsControls";
import ResultsGrid from "@/components/SearchResults/ResultsGrid";
import Pagination from "@/components/SearchResults/Pagination";

import { useServices } from "@/hooks/useServices";
import type { Service } from "@/types/service";

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  const { services, loading, error } = useServices();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPills, setSelectedPills] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    minPrice: 0,
    maxPrice: 1000,
    locations: ["Any"],
    deliveryTime: "Any",
  });

  /* ==========================================================
     STATE HANDLERS (WITH PAGINATION RESET)
  ========================================================== */
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const toggleQuickFilter = (pill: string) => {
    setSelectedPills((previous) =>
      previous.includes(pill)
        ? previous.filter((p) => p !== pill)
        : [...previous, pill]
    );
    setCurrentPage(1);
  };

  /* ==========================================================
     FILTER LOGIC (TYPESAFE)
  ========================================================== */
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // 1. Safe extraction for seller identification
      const sellerName =
        typeof service.sellerId === "object"
          ? service.sellerId?.name || service.sellerId?.username || ""
          : String(service.sellerId || "");

      // 2. Search Query Match
      const matchesSearch =
        !searchQuery ||
        (service.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        sellerName.toLowerCase().includes(searchQuery.toLowerCase());

      // 3. Quick Pills Match
      const matchesPills =
        selectedPills.length === 0 ||
        selectedPills.every((pill) => {
          const lowerPill = pill.toLowerCase();
          const level = (service.level || "").toLowerCase();

          if (lowerPill === "pro services" || lowerPill === "pro") {
            return level.includes("top") || level.includes("level 2");
          }
          if (lowerPill === "online sellers" || lowerPill === "online") {
            return Boolean(service.isOnline);
          }
          if (lowerPill === "featured") {
            return Boolean(service.isFeatured);
          }
          return true;
        });

      // 4. Sidebar Filters Match
      const matchesCategory =
        filters.categories.length === 0 ||
        (service.category ? filters.categories.includes(service.category) : false);

      const matchesBudget =
        (service.price ?? 0) >= filters.minPrice &&
        (service.price ?? 0) <= filters.maxPrice;

      const matchesLocation =
        filters.locations.includes("Any") ||
        filters.locations.some((loc) =>
          (service.location || "").toLowerCase().includes(loc.toLowerCase())
        );

      const matchesDelivery =
        filters.deliveryTime === "Any" ||
        (service.deliveryTime ?? 0) <= parseInt(filters.deliveryTime, 10);

      return (
        matchesSearch &&
        matchesPills &&
        matchesCategory &&
        matchesBudget &&
        matchesLocation &&
        matchesDelivery
      );
    });
  }, [services, searchQuery, selectedPills, filters]);

  /* ==========================================================
     SPONSORED & PAGINATION COMPUTATION
  ========================================================== */
  const sponsoredServices = useMemo(() => {
    return services.filter((service) => service.sponsored);
  }, [services]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <main className="search-page-container">
      <SearchSidebar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={() => {
          handleFilterChange({
            categories: [],
            minPrice: 0,
            maxPrice: 1000,
            locations: ["Any"],
            deliveryTime: "Any",
          });
        }}
      />

      <section className="search-main-content">
        {error && (
          <div className="search-error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {sponsoredServices.length > 0 && (
          <SponsoredCarousel services={sponsoredServices} />
        )}

        <ResultsControls
          totalResults={filteredServices.length}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedPills={selectedPills}
          onTogglePill={toggleQuickFilter}
        />

        <ResultsGrid
          services={paginatedServices}
          isLoading={loading}
        />

        {!loading && filteredServices.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </section>
    </main>
  );
}