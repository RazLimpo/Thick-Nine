"use client";

import CategoriesFilter from "./CategoriesFilter";
import BudgetFilter from "./BudgetFilter";
import LocationFilter from "./LocationFilter";
import DeliveryFilter from "./DeliveryFilter";

export default function SearchSidebar() {
  return (
    <aside className="search-sidebar">
      <div className="filter-card">
        <div className="filter-header-row">
          <h2 className="filter-main-title">
            Filter Results
          </h2>

          <button
            id="clear-filters-btn"
            className="clear-link"
            type="button"
          >
            Clear All
          </button>
        </div>

        <CategoriesFilter />

        <BudgetFilter />

        <LocationFilter />

        <DeliveryFilter />
      </div>
    </aside>
  );
}