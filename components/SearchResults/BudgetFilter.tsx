"use client";

import React, { useState, useEffect } from "react";

export interface BudgetFilterProps {
  // Support both naming conventions
  min?: number;
  max?: number;
  minPrice?: number;
  maxPrice?: number;
  currentMin?: number;
  currentMax?: number;
  setMinPrice?: (val: number) => void;
  setMaxPrice?: (val: number) => void;
  onChange?: (min: number, max: number) => void;
}

const MIN_LIMIT = 5;
const MAX_LIMIT = 1000;

export default function BudgetFilter(props: BudgetFilterProps) {
  // Normalize values coming from either interface style
  const activeMin = props.currentMin ?? props.minPrice ?? props.min ?? MIN_LIMIT;
  const activeMax = props.currentMax ?? props.maxPrice ?? props.max ?? MAX_LIMIT;

  const [isOpen, setIsOpen] = useState(false);
  const [localMin, setLocalMin] = useState(activeMin);
  const [localMax, setLocalMax] = useState(activeMax);

  // Sync with parent component updates
  useEffect(() => {
    setLocalMin(activeMin);
    setLocalMax(activeMax);
  }, [activeMin, activeMax]);

  const p1 = ((localMin - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;
  const p2 = ((localMax - MIN_LIMIT) / (MAX_LIMIT - MIN_LIMIT)) * 100;

  const trackStyle = {
    background: `linear-gradient(to right, #e0e0e0 ${p1}%, var(--primary-color, #dc3545) ${p1}%, var(--primary-color, #dc3545) ${p2}%, #e0e0e0 ${p2}%)`,
  };

  const handleMinChange = (val: number) => {
    const newMin = Math.min(Math.max(MIN_LIMIT, val), localMax - 5);
    setLocalMin(newMin);
    props.setMinPrice?.(newMin);
    props.onChange?.(newMin, localMax);
  };

  const handleMaxChange = (val: number) => {
    const newMax = Math.max(Math.min(MAX_LIMIT, val), localMin + 5);
    setLocalMax(newMax);
    props.setMaxPrice?.(newMax);
    props.onChange?.(localMin, newMax);
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