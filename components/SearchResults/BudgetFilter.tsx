"use client";

import React, { useState, useEffect } from "react";

interface BudgetFilterProps {
  minPrice?: number;
  maxPrice?: number;
  setMinPrice?: (val: number) => void;
  setMaxPrice?: (val: number) => void;
}

const MIN_LIMIT = 5;
const MAX_LIMIT = 1000;   // ← Kept as you wanted

export default function BudgetFilter({
  minPrice = 5,
  maxPrice = 800,
  setMinPrice,
  setMaxPrice,
}: BudgetFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);

  // Sync with parent component
  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
  }, [minPrice, maxPrice]);

  const p1 = ((localMin - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
  const p2 = ((localMax - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;

  const trackStyle = {
  background: `linear-gradient(to right, #e0e0e0 ${p1}%, var(--primary-color, #dc3545) ${p1}%, var(--primary-color, #dc3545) ${p2}%, #e0e0e0 ${p2}%)`,
};

  const handleMinChange = (val: number) => {
    const newMin = Math.min(Math.max(MIN_LIMIT, val), localMax - 5);
    setLocalMin(newMin);
    setMinPrice?.(newMin);
  };

  const handleMaxChange = (val: number) => {
    const newMax = Math.max(Math.min(MAX_LIMIT, val), localMin + 5);
    setLocalMax(newMax);
    setMaxPrice?.(newMax);
  };

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
  <button
    className="filter-toggle"
    type="button"
    onClick={() => setIsOpen((prev) => !prev)}
    aria-expanded={isOpen}
  >
    Budget Range{" "}
    <i className={`fas fa-chevron-down ${isOpen ? "rotate" : ""}`} />
  </button>

      <div className="filter-dropdown-content">
        <div className="budget-input-row">
          <div className="input-wrap">
            <span>$</span>
            <input
              type="number"
              value={localMin}
              min={MIN_LIMIT}
              max={MAX_LIMIT}
              onChange={(e) => handleMinChange(Number(e.target.value))}
            />
          </div>

          <span className="divider">-</span>

          <div className="input-wrap">
            <span>$</span>
            <input
              type="number"
              value={localMax}
              min={MIN_LIMIT}
              max={MAX_LIMIT}
              onChange={(e) => handleMaxChange(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="budget-slider-container">
          <div className="slider-track" style={trackStyle} />

          <input
            type="range"
            min={MIN_LIMIT}
            max={MAX_LIMIT}
            value={localMin}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="range-input min-range"
          />

          <input
            type="range"
            min={MIN_LIMIT}
            max={MAX_LIMIT}
            value={localMax}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="range-input max-range"
          />
        </div>
      </div>
    </div>
  );
}