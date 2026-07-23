"use client";

import { useMemo, useState } from "react";

// 1. IMPORT FilterState FROM SearchSidebar
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

  // 2. PASTE THE STATE HERE
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    minPrice: 0,
    maxPrice: 1000,
    locations: ["Any"],
    deliveryTime: "Any",
  });

  const toggleQuickFilter = (pill: string) => {
    setSelectedPills((previous) =>
      previous.includes(pill)
        ? previous.filter((p) => p !== pill)
        : [...previous, pill]
    );
  };

  /* ==========================================================
     FILTER LOGIC (UPDATED WITH SIDEBAR FILTERS)
  ========================================================== */
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // Search Query Match
      const matchesSearch =
        !searchQuery ||
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.seller.toLowerCase().includes(searchQuery.toLowerCase());

      // Quick Pills Match
      const matchesPills =
        selectedPills.length === 0 ||
        selectedPills.every((pill) => {
          const lowerPill = pill.toLowerCase();
          if (lowerPill === "pro services" || lowerPill === "pro") {
            return service.level.toLowerCase().includes("top") || service.level.toLowerCase().includes("level 2");
          }
          if (lowerPill === "online sellers" || lowerPill === "online") {
            return service.isOnline;
          }
          if (lowerPill === "featured") {
            return service.isFeatured;
          }
          return true;
        });

      // Sidebar Filters Match
      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(service.category);

      const matchesBudget =
        service.price >= filters.minPrice &&
        service.price <= filters.maxPrice;

      const matchesLocation =
        filters.locations.includes("Any") ||
        filters.locations.some((loc) =>
          service.location.toLowerCase().includes(loc.toLowerCase())
        );

      const matchesDelivery =
        filters.deliveryTime === "Any" ||
        service.deliveryTime <= parseInt(filters.deliveryTime, 10);

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

  const sponsoredServices = useMemo(() => {
    return services.filter((service) => service.sponsored);
  }, [services]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  return (
    <main className="search-page-container">
      {/* 3. PASTE THE COMPONENT WITH PROPS HERE */}
      <SearchSidebar
        filters={filters}
        onFilterChange={setFilters}
        onClearAll={() => {
          setFilters({
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
          onSearchChange={setSearchQuery}
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