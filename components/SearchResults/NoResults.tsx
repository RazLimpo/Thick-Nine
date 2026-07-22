"use client";

import React from "react";

interface NoResultsProps {
  searchQuery?: string;
  onResetFilters?: () => void;
}

export default function NoResults({
  searchQuery = "",
  onResetFilters,
}: NoResultsProps) {
  return (
    <div className="no-results-wrapper">
      <div className="no-results-icon" aria-hidden="true">
        <i className="fas fa-search-minus" />
      </div>

      <h3 className="no-results-title">
        {searchQuery.trim()
          ? `No matches found for "${searchQuery}"`
          : "No services found"}
      </h3>

      <p className="no-results-description">
        Try checking your spelling, removing active filter pills, or adjusting your budget and delivery expectations.
      </p>

      {onResetFilters && (
        <button
          type="button"
          className="reset-filters-btn"
          onClick={onResetFilters}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
          <span>Clear All Filters</span>
        </button>
      )}
    </div>
  );
}