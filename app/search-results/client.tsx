"use client";

import { useMemo } from "react";

import SearchSidebar, {
  type FilterState as SidebarFilterState,
} from "@/components/SearchResults/SearchSidebar";
import SponsoredCarousel from "@/components/SearchResults/SponsoredCarousel";
import ResultsControls from "@/components/SearchResults/ResultsControls";
import ResultsGrid from "@/components/SearchResults/ResultsGrid";
import Pagination from "@/components/SearchResults/Pagination";

import { useServices } from "@/hooks/useServices";
import { useSearchFilters } from "@/hooks/useSearchFilters";

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  // 1. Data Source
  const { services, loading, error } = useServices();

  // 2. Filter & Pagination Hook
  const {
    searchTerm,
    categories,
    minPrice,
    maxPrice,
    locations,
    delivery,
    isOnlineOnly,
    isFeaturedOnly,
    currentPage,
    totalPages,
    totalMatches,
    paginatedServices,
    setCategories,
    setMinPrice,
    setMaxPrice,
    setLocations,
    setDelivery,
    setIsOnlineOnly,
    setIsFeaturedOnly,
    setCurrentPage,
    clearAllFilters,
  } = useSearchFilters(services, 12);

  // 3. Map Hook State -> SearchSidebar Filter State
  const sidebarFilters: SidebarFilterState = useMemo(
    () => ({
      categories,
      minPrice,
      maxPrice,
      locations,
      deliveryTime: delivery,
    }),
    [categories, minPrice, maxPrice, locations, delivery]
  );

  // Bridge Sidebar onFilterChange back to individual Hook setters
  const handleSidebarFilterChange = (updated: SidebarFilterState) => {
    setCategories(updated.categories);
    setMinPrice(updated.minPrice);
    setMaxPrice(updated.maxPrice);
    setLocations(updated.locations);
    setDelivery(updated.deliveryTime);
    setCurrentPage(1); // Reset pagination on sidebar filter change
  };

  // 4. Handle Quick Pills ("online", "top_rated", "pro")
  const selectedPills = useMemo(() => {
    const pills: string[] = [];
    if (isOnlineOnly) pills.push("online");
    if (isFeaturedOnly) pills.push("pro"); // Maps "pro" to isFeaturedOnly filter
    return pills;
  }, [isOnlineOnly, isFeaturedOnly]);

  const handleTogglePill = (pillId: string) => {
    if (pillId === "online") {
      setIsOnlineOnly(!isOnlineOnly);
    } else if (pillId === "pro" || pillId === "top_rated") {
      setIsFeaturedOnly(!isFeaturedOnly);
    }
    setCurrentPage(1); // Reset pagination on pill toggle
  };

  // 5. Sponsored Services Computation
  const sponsoredServices = useMemo(() => {
    return services.filter((service) => (service as any).sponsored);
  }, [services]);

  return (
    <main className="search-page-container">
      {/* Sidebar Navigation & Filters */}
      <SearchSidebar
        filters={sidebarFilters}
        onFilterChange={handleSidebarFilterChange}
        onClearAll={clearAllFilters}
      />

      <section className="search-main-content">
        {/* Error Banner */}
        {error && (
          <div className="search-error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Sponsored Services Carousel */}
        {sponsoredServices.length > 0 && (
          <SponsoredCarousel services={sponsoredServices} />
        )}

        {/* Top Controls & Quick Pills */}
        <ResultsControls
          totalResults={totalMatches}
          searchQuery={searchTerm}
          selectedPills={selectedPills}
          onTogglePill={handleTogglePill}
        />

        {/* Main Service Grid */}
        <ResultsGrid
          services={paginatedServices}
          isLoading={loading}
        />

        {/* Pagination Controls */}
        {!loading && totalMatches > 0 && (
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