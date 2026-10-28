"use client";

export interface QuickFilterOption {
  id: string;
  label: string;
  iconClass?: string;
}

interface ResultsControlsProps {
  totalResults: number;
  searchQuery?: string;
  activeCategories?: string[];
  selectedPills?: string[];
  onTogglePill?: (pillId: string) => void;
  quickFilters?: QuickFilterOption[];
}

const DEFAULT_QUICK_FILTERS: QuickFilterOption[] = [
  {
    id: "online",
    label: "Online Now",
    iconClass: "fas fa-circle",
  },
  {
    id: "top_rated",
    label: "Top Rated",
    iconClass: "fas fa-star",
  },
  {
    id: "pro",
    label: "Pro Sellers",
    iconClass: "fas fa-award",
  },
];

export default function ResultsControls({
  totalResults,
  searchQuery = "",
  activeCategories = [],
  selectedPills = [],
  onTogglePill,
  quickFilters = DEFAULT_QUICK_FILTERS,
}: ResultsControlsProps) {
  const categoryCount = activeCategories.length;

  const categorySummary =
    categoryCount === 0
      ? null
      : categoryCount === 1
      ? activeCategories[0]
      : categoryCount <= 3
      ? activeCategories
      : `Filtered by ${categoryCount} categories`;

  const renderCategoryHeading = () => {
    if (!categorySummary) {
      return searchQuery.trim() ? (
        <>
          Results for <span className="query-highlight">&quot;{searchQuery}&quot;</span>
        </>
      ) : (
        "All Services"
      );
    }

    if (categoryCount === 1) {
      return (
        <>
          Results for <span className="query-highlight">&quot;{categorySummary}&quot;</span>
        </>
      );
    }

    if (categoryCount <= 3) {
      return (
        <>
          Results for{" "}
          <span className="category-chip-row">
            {(categorySummary as string[]).map((label) => (
              <span key={label} className="category-chip">
                {label}
              </span>
            ))}
          </span>
        </>
      );
    }

    return (
      <>
        Results for <span className="query-highlight">{categorySummary}</span>
      </>
    );
  };

  return (
    <section className="results-control-wrapper">
      <div className="results-count-row">
        <h2>
          {renderCategoryHeading()}{" "}
          <span className="count-badge">({totalResults})</span>
        </h2>
      </div>

      <div
        className="quick-filter-toggles"
        role="group"
        aria-label="Quick filters"
      >
        {quickFilters.map((filter) => {
          const isChecked = selectedPills.includes(filter.id);

          return (
            <label key={filter.id} className="toggle-pill">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onTogglePill?.(filter.id)}
                aria-label={filter.label}
              />

              <span className="pill-content">
                {filter.iconClass && (
                  <i className={filter.iconClass} aria-hidden="true" />
                )}

                {filter.label}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}