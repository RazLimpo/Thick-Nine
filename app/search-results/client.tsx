// app/search-results/client.tsx

"use client";

import { useMemo } from "react";

import SearchSidebar, {
  type FilterState as SidebarFilterState,
} from "@/components/SearchResults/SearchSidebar";

import SponsoredCarousel, {
  type SponsoredAd,
} from "@/components/SearchResults/SponsoredCarousel";

import ResultsControls from "@/components/SearchResults/ResultsControls";
import ResultsGrid from "@/components/SearchResults/ResultsGrid";
import Pagination from "@/components/SearchResults/Pagination";

import { useServices } from "@/hooks/useServices";
import { useSearchFilters } from "@/hooks/useSearchFilters";

import type { Service } from "@/types/service";

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  // ==================================================
  // 1. Fetch Marketplace Services
  // ==================================================
  const { services, loading, error } = useServices();

  // ==================================================
  // 2. Search Filters & Pagination
  // ==================================================
  const {
    searchTerm,
    categories,
    minPrice,
    maxPrice,
    locations,
    delivery,
    isOnlineOnly,
    isFeaturedOnly,
    isProOnly,
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
    setIsProOnly,
    setCurrentPage,
    clearAllFilters,
  } = useSearchFilters(services, 12);

  // ==================================================
  // 3. Sidebar Filter State
  // ==================================================
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

  const handleSidebarFilterChange = (updated: SidebarFilterState) => {
    setCategories(updated.categories);
    setMinPrice(updated.minPrice);
    setMaxPrice(updated.maxPrice);
    setLocations(updated.locations);
    setDelivery(updated.deliveryTime);

    // Always reset pagination after filters change
    setCurrentPage(1);
  };

  // ==================================================
  // 4. Quick Filter Pills
  // ==================================================
  const selectedPills = useMemo(() => {
    const pills: string[] = [];

    if (isOnlineOnly) pills.push("online");
    if (isFeaturedOnly) pills.push("top_rated");
    if (isProOnly) pills.push("pro");

    return pills;
  }, [isOnlineOnly, isFeaturedOnly, isProOnly]);

  const handleTogglePill = (pillId: string) => {
    switch (pillId) {
      case "online":
        setIsOnlineOnly(!isOnlineOnly);
        break;

      case "top_rated":
        setIsFeaturedOnly(!isFeaturedOnly);
        break;

      case "pro":
        setIsProOnly(!isProOnly);
        break;

      default:
        break;
    }

    setCurrentPage(1);
  };

  // ==================================================
  // 5. Sponsored Services
  // ==================================================
  const sponsoredAds: SponsoredAd[] = useMemo(() => {
    return services
      .filter((service: Service) => service.isSponsored)
      .map((service: Service) => ({
        id: service.id ?? service._id ?? "",
        title: service.title,
        price: String(service.price),
        username: service.sellerName ?? "Freelancer",
        gender: service.sellerGender,
        imageUrl: service.images?.[0] ?? "/default-service.png",
        linkUrl: `/services/${service.id ?? service._id}`,
      }));
  }, [services]);

  // ==================================================
  // Render
  // ==================================================
  return (
    <main className="search-page-container">
      {/* Sidebar */}
      <SearchSidebar
        filters={sidebarFilters}
        onFilterChange={handleSidebarFilterChange}
        onClearAll={clearAllFilters}
      />

      <section className="search-main-content">
        {/* Error */}
        {error && (
          <div className="search-error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Sponsored Carousel */}
        <SponsoredCarousel
          ads={sponsoredAds.length > 0 ? sponsoredAds : undefined}
        />

        {/* Controls */}
        <ResultsControls
          totalResults={totalMatches}
          searchQuery={searchTerm}
          selectedPills={selectedPills}
          onTogglePill={handleTogglePill}
        />

        {/* Results */}
        <ResultsGrid
          services={paginatedServices}
          isLoading={loading}
        />

        {/* Pagination */}
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