"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import SearchSidebar, {
  type FilterState as SidebarFilterState,
} from "@/components/SearchResults/SearchSidebar";

import SponsoredCarousel from "@/components/SearchResults/SponsoredCarousel";

import ResultsGrid from "@/components/SearchResults/ResultsGrid";
import Pagination from "@/components/SearchResults/Pagination";

import { useServices } from "@/hooks/useServices";
import { useSearchFilters } from "@/hooks/useSearchFilters";

import { CATEGORIES } from "@/lib/categories";
import { pickPromoSlot } from "@/lib/marketplace/promoSlot";

import "@/styles/pages/search-results.css";
import "@/styles/pages/service-card.css";

export default function SearchResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
    setSearchTerm,
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

  const activeCategoryLabels = useMemo(() => {
    return (categories || [])
      .map((slug) => CATEGORIES[slug as keyof typeof CATEGORIES]?.label)
      .filter(Boolean) as string[];
  }, [categories]);

  useEffect(() => {
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");

    const nextSearchText = [q, subcategory]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(" ");

    setSearchTerm(nextSearchText);
    setCategories(category?.trim() ? [category.trim()] : []);
    setCurrentPage(1);
  }, [searchParams, setSearchTerm, setCategories, setCurrentPage]);

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
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    clearAllFilters();
    router.replace("/search-results");
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
  // 5. Promo strip — Sponsored if any, else Featured top performers
  // ==================================================
  const promo = useMemo(() => pickPromoSlot(services || []), [services]);

  // ==================================================
  // Render
  // ==================================================
  return (
    <main className="search-page-container">
      <SearchSidebar
        filters={sidebarFilters}
        onFilterChange={handleSidebarFilterChange}
        onClearAll={handleClearAll}
      />

      <section className="search-main-content">
        {error && (
          <div className="search-error-banner" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Paid Sponsored wins the slot; otherwise free Featured top performers */}
        {promo.mode !== "empty" && (
          <SponsoredCarousel ads={promo.ads} mode={promo.mode} />
        )}

        {/* Optional: keep ResultsControls if you still import it elsewhere */}
        {/* activeCategoryLabels / selectedPills available for controls */}

        <ResultsGrid services={paginatedServices} isLoading={loading} />

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
