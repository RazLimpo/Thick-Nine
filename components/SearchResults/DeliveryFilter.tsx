"use client";

import { useState } from "react";

export default function DeliveryFilter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Delivery Time <i className="fas fa-chevron-down"></i>
      </button>

      <div className="filter-dropdown-content">
        <div className="vertical-stack">
          <label>
            <input
              type="checkbox"
              id="delivery-any"
            />
            Any Time
          </label>

          <label>
            <input
              type="checkbox"
              className="delivery-option"
              value="1"
            />
            Express (24 Hours)
          </label>

          <label>
            <input
              type="checkbox"
              className="delivery-option"
              value="3"
            />
            Up to 3 Days
          </label>

          <label>
            <input
              type="checkbox"
              className="delivery-option"
              value="7"
            />
            Up to 7 Days
          </label>
        </div>
      </div>
    </div>
  );
}