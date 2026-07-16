"use client";

import { useState } from "react";

export default function BudgetFilter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Budget Range <i className="fas fa-chevron-down"></i>
      </button>

      <div className="filter-dropdown-content">
        <div className="budget-input-row">
          <div className="input-wrap">
            <span>$</span>

            <input
              type="number"
              id="min-input"
              defaultValue={5}
            />
          </div>

          <span className="divider">-</span>

          <div className="input-wrap">
            <span>$</span>

            <input
              type="number"
              id="max-input"
              defaultValue={800}
            />
          </div>
        </div>

        <div className="budget-slider-container">
          <div
            className="slider-track"
            id="slider-track"
          />

          <input
            type="range"
            min={5}
            max={1000}
            defaultValue={5}
            id="min-slider"
            className="range-input"
          />

          <input
            type="range"
            min={5}
            max={1000}
            defaultValue={800}
            id="max-slider"
            className="range-input"
          />
        </div>
      </div>
    </div>
  );
}