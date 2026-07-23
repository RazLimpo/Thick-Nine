"use client";

import SearchSidebar from "@/components/SearchResults/SearchSidebar";
import SponsoredCarousel from "@/components/SearchResults/SponsoredCarousel";
import ResultsControls from "@/components/SearchResults/ResultsControls";
import ResultsGrid from "@/components/SearchResults/ResultsGrid";
import Pagination from "@/components/SearchResults/Pagination";

import { useServices } from "@/hooks/useServices";
import { useSearchFilters } from "@/hooks/useSearchFilters";

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  // 1. Primary Data Source
  const { services, loading, error } = useServices();

  // 2. Centralized Filter, Search, Sort & Pagination Hook
  const {
    filters,
    setSearchTerm,
    setCategories,
    setPriceRange,
    setLocations,
    setDeliveryTime,
    toggleQuickFilterPill,
    setSortBy,
    clearAllFilters,
    filteredServices,
    paginatedServices,
    sponsoredServices,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useSearchFilters(services);

  return (
    <main className="search-page-container">
      {/* Sidebar Controls - Unified with hook actions */}
      <SearchSidebar
        filters={filters}
        onCategoryChange={setCategories}
        onPriceChange={setPriceRange}
        onLocationChange={setLocations}
        onDeliveryChange={setDeliveryTime}
        onClearAll={clearAllFilters}
      />

      <section className="search-main-content">
        {/* Error Banner */}
        {error && (
          <div className="search-error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Sponsored Carousel */}
        {sponsoredServices.length > 0 && (
          <SponsoredCarousel services={sponsoredServices} />
        )}

        {/* Controls, Quick Pills, Search Input & Sorting */}
        <ResultsControls
          totalResults={filteredServices.length}
          searchQuery={filters.searchTerm}
          onSearchChange={setSearchTerm}
          selectedPills={filters.selectedPills}
          onTogglePill={toggleQuickFilterPill}
          sortBy={filters.sortBy}
          onSortChange={setSortBy}
        />

        {/* Main Service Grid */}
        <ResultsGrid
          services={paginatedServices}
          isLoading={loading}
        />

        {/* Pagination Bar */}
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