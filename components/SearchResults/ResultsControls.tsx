"use client";

export interface QuickFilterOption {
  id: string;
  label: string;
  iconClass?: string;
}

interface ResultsControlsProps {
  totalResults: number;
  searchQuery?: string;
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
  selectedPills = [],
  onTogglePill,
  quickFilters = DEFAULT_QUICK_FILTERS,
}: ResultsControlsProps) {
  return (
    <section className="results-control-wrapper">
      <div className="results-count-row">
        <h2>
          {searchQuery.trim() ? (
            <>
              Results for{" "}
              <span className="query-highlight">
                "{searchQuery}"
              </span>
            </>
          ) : (
            "All Services"
          )}{" "}
          <span className="count-badge">
            ({totalResults})
          </span>
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
            <label
              key={filter.id}
              className="toggle-pill"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onTogglePill?.(filter.id)}
                aria-label={filter.label}
              />

              <span className="pill-content">
                {filter.iconClass && (
                  <i
                    className={filter.iconClass}
                    aria-hidden="true"
                  />
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