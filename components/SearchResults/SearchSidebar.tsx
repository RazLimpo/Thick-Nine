"use client";

import { useState } from "react";
import CategoriesFilter from "./CategoriesFilter";
import BudgetFilter from "./BudgetFilter";
import LocationFilter from "./LocationFilter";
import DeliveryFilter from "./DeliveryFilter";

export interface FilterState {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  locations: string[];
  deliveryTime: string; // e.g., "Any", "1", "3", "7"
}

interface SearchSidebarProps {
  filters?: FilterState;
  onFilterChange?: (updatedFilters: FilterState) => void;
  onClearAll?: () => void;
  minBudgetBound?: number;
  maxBudgetBound?: number;
}

// Helper factory for dynamic min/max initialization
const createDefaultFilters = (min: number, max: number): FilterState => ({
  categories: [],
  minPrice: min,
  maxPrice: max,
  locations: ["Any"],
  deliveryTime: "Any",
});

export default function SearchSidebar({
  filters: externalFilters,
  onFilterChange,
  onClearAll,
  minBudgetBound = 0,
  maxBudgetBound = 1000,
}: SearchSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Internal state fallback initialized via helper function
  const [internalFilters, setInternalFilters] = useState<FilterState>(() =>
    createDefaultFilters(minBudgetBound, maxBudgetBound)
  );

  const isControlled = externalFilters !== undefined;
  const currentFilters = isControlled ? externalFilters : internalFilters;

  // Generic state update helper
  const updateFilters = (newPartialFilters: Partial<FilterState>) => {
    const nextState = { ...currentFilters, ...newPartialFilters };
    if (!isControlled) {
      setInternalFilters(nextState);
    }
    onFilterChange?.(nextState);
  };

  // --- Clear All Handler ---
  const handleClearAll = () => {
    const clearedState = createDefaultFilters(minBudgetBound, maxBudgetBound);

    if (!isControlled) {
      setInternalFilters(clearedState);
    }

    onClearAll?.();
    onFilterChange?.(clearedState);
  };

  // --- Category Toggle ---
  const handleToggleCategory = (category: string) => {
    const updated = currentFilters.categories.includes(category)
      ? currentFilters.categories.filter((c) => c !== category)
      : [...currentFilters.categories, category];

    updateFilters({ categories: updated });
  };

  // --- Budget Change ---
  const handleBudgetChange = (min: number, max: number) => {
    updateFilters({ minPrice: min, maxPrice: max });
  };

  // --- Location Toggle ---
  const handleToggleLocation = (location: string) => {
    if (location === "Any") {
      updateFilters({ locations: ["Any"] });
      return;
    }

    let updated = currentFilters.locations.filter((l) => l !== "Any");

    if (updated.includes(location)) {
      updated = updated.filter((l) => l !== location);
    } else {
      updated.push(location);
    }

    if (updated.length === 0) {
      updated = ["Any"];
    }

    updateFilters({ locations: updated });
  };

  // --- Delivery Select ---
  const handleSelectDeliveryTime = (deliveryTime: string) => {
    updateFilters({ deliveryTime });
  };

  // Active filter flag
  const hasActiveFilters =
    currentFilters.categories.length > 0 ||
    currentFilters.minPrice > minBudgetBound ||
    currentFilters.maxPrice < maxBudgetBound ||
    (!currentFilters.locations.includes("Any") &&
      currentFilters.locations.length > 0) ||
    (currentFilters.deliveryTime !== "Any" && Boolean(currentFilters.deliveryTime));

  const filterCardClass = isMobileOpen
    ? "filter-card open"
    : "filter-card";

  return (
    <aside className="search-sidebar">
      <div id="search-filter-panel" className={filterCardClass}>
        <div className="filter-header-row">
          <h2 className="filter-main-title">
            <button
              type="button"
              className="filter-mobile-toggle-btn"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-expanded={isMobileOpen}
              aria-controls="search-filter-panel"
            >
              Filter Results
            </button>
          </h2>

          <button
            id="clear-filters-btn"
            className={`clear-link ${!hasActiveFilters ? "disabled" : ""}`}
            type="button"
            onClick={handleClearAll}
            disabled={!hasActiveFilters}
          >
            Clear All
          </button>
        </div>

        <CategoriesFilter
          selectedCategories={currentFilters.categories}
          onToggleCategory={handleToggleCategory}
        />

        <BudgetFilter
          min={minBudgetBound}
          max={maxBudgetBound}
          currentMin={currentFilters.minPrice}
          currentMax={currentFilters.maxPrice}
          onChange={handleBudgetChange}
        />

        <LocationFilter
          selectedLocations={currentFilters.locations}
          onToggleLocation={handleToggleLocation}
        />

        <DeliveryFilter
          selectedDeliveryTime={currentFilters.deliveryTime}
          onSelectDeliveryTime={handleSelectDeliveryTime}
        />
      </div>
    </aside>
  );
}