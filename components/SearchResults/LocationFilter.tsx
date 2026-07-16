"use client";

import { useState } from "react";

export default function LocationFilter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Location <i className="fas fa-chevron-down"></i>
      </button>

      <div className="filter-dropdown-content">
        <div className="vertical-stack">

          <label>
            <input
              type="checkbox"
              id="global-location"
            />
            Global (Remote)
          </label>

          <label>
            <input
              type="checkbox"
              className="country-location"
              value="United States"
            />
            United States
          </label>

          <label>
            <input
              type="checkbox"
              className="country-location"
              value="United Kingdom"
            />
            United Kingdom
          </label>

          <label>
            <input
              type="checkbox"
              className="country-location"
              value="Canada"
            />
            Canada
          </label>

          <label>
            <input
              type="checkbox"
              className="country-location"
              value="Australia"
            />
            Australia
          </label>

        </div>
      </div>
    </div>
  );
}