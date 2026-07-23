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

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  // 1. Fetch Services Data
  const { services, loading, error } = useServices();

  // 2. Custom Filtering & Pagination Hook
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

  // Bridge Sidebar updates back to individual Hook setters
  const handleSidebarFilterChange = (updated: SidebarFilterState) => {
    setCategories(updated.categories);
    setMinPrice(updated.minPrice);
    setMaxPrice(updated.maxPrice);
    setLocations(updated.locations);
    setDelivery(updated.deliveryTime);
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  // 4. Manage Quick Pill Toggles ("online", "top_rated", "pro")
  const selectedPills = useMemo(() => {
    const pills: string[] = [];
    if (isOnlineOnly) pills.push("online");
    if (isFeaturedOnly) pills.push("pro");
    return pills;
  }, [isOnlineOnly, isFeaturedOnly]);

  const handleTogglePill = (pillId: string) => {
    if (pillId === "online") {
      setIsOnlineOnly(!isOnlineOnly);
    } else if (pillId === "pro" || pillId === "top_rated") {
      setIsFeaturedOnly(!isFeaturedOnly);
    }
    setCurrentPage(1);
  };

  // 5. Map Sponsored Services to SponsoredAd Format
  const sponsoredAds: SponsoredAd[] = useMemo(() => {
    return services
      .filter((s: any) => Boolean(s.sponsored || s.isSponsored))
      .map((s: any) => ({
        id: s._id || s.id || String(Math.random()),
        title: s.title || "Featured Service",
        price: typeof s.price === "number" ? `$${s.price}` : String(s.price || "$0"),
        username: s.sellerName || s.seller?.fullName || s.username || "Verified Seller",
        gender: s.gender === "male" || s.gender === "female" ? s.gender : undefined,
        imageUrl: s.coverImage || s.image || s.imageUrl || "/default-service.png",
        linkUrl: `/service-details?id=${s._id || s.id}`,
      }));
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
        <SponsoredCarousel ads={sponsoredAds.length > 0 ? sponsoredAds : undefined} />

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