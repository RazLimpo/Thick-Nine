"use client";

import { useState } from "react";

export interface LocationOption {
  label: string;
  value: string;
}

interface LocationFilterProps {
  availableLocations?: LocationOption[];
  selectedLocations?: string[];
  onToggleLocation?: (location: string) => void;
}

// Fallback options in case data is still loading from backend
const FALLBACK_LOCATIONS: LocationOption[] = [
  { label: "United States", value: "United States" },
  { label: "United Kingdom", value: "United Kingdom" },
  { label: "Canada", value: "Canada" },
  { label: "Australia", value: "Australia" },
];

export default function LocationFilter({
  availableLocations = FALLBACK_LOCATIONS,
  selectedLocations = [],
  onToggleLocation,
}: LocationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isGlobalChecked =
    selectedLocations.includes("Any") || selectedLocations.length === 0;

  // Use dynamic list if available, otherwise fallback to defaults
  const locationsToDisplay =
    availableLocations.length > 0 ? availableLocations : FALLBACK_LOCATIONS;

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
  className="filter-toggle"
  type="button"
  onClick={() => setIsOpen((prev) => !prev)}
  aria-expanded={isOpen}
  aria-controls="location-filter-content"
>
  Location{" "}
  <i
    className={`fas fa-chevron-down ${isOpen ? "rotate" : ""}`}
    aria-hidden="true"
  />
</button>

      <div id="location-filter-content" className="filter-dropdown-content">
        <div className="vertical-stack">
          <label className="global-label">
            <input
              type="checkbox"
              id="global-location"
              aria-label="Global (Remote)"
              checked={isGlobalChecked}
              onChange={() => onToggleLocation?.("Any")}
            />
            <strong>Global (Remote)</strong>
          </label>

          {locationsToDisplay.map((loc) => (
            <label key={loc.value}>
              <input
                type="checkbox"
                className="country-location"
                value={loc.value}
                aria-label={loc.label}
                checked={
                  !isGlobalChecked && selectedLocations.includes(loc.value)
                }
                onChange={() => onToggleLocation?.(loc.value)}
              />
              {loc.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}