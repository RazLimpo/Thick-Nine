"use client";

import { useState } from "react";

export default function CategoriesFilter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Categories <i className="fas fa-chevron-down"></i>
      </button>

      <div className="filter-dropdown-content">
        <div className="vertical-stack">
          <label>
            <input type="checkbox" />
            Web Development
          </label>

          <label>
            <input type="checkbox" />
            UI/UX Design
          </label>

          <label>
            <input type="checkbox" />
            Digital Marketing
          </label>

          <label>
            <input type="checkbox" />
            Content Writing
          </label>
        </div>
      </div>
    </div>
  );
}