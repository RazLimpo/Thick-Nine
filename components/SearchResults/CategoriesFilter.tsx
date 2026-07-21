"use client";

import { useState } from "react";

export interface CategoryOption {
  label: string;
  value: string;
}

interface CategoriesFilterProps {
  availableCategories?: CategoryOption[];
  selectedCategories?: string[];
  onToggleCategory?: (category: string) => void;
}

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { label: "Web Development", value: "Web Development" },
  { label: "UI/UX Design", value: "UI/UX Design" },
  { label: "Digital Marketing", value: "Digital Marketing" },
  { label: "Content Writing", value: "Content Writing" },
];

export default function CategoriesFilter({
  availableCategories = FALLBACK_CATEGORIES,
  selectedCategories: controlledSelected,
  onToggleCategory,
}: CategoriesFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Local state fallback so checkboxes check interactively when isolated/uncontrolled
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  // Use controlled state from parent if provided, otherwise fall back to internal local state
  const isControlled = controlledSelected !== undefined;
  const currentSelected = isControlled ? controlledSelected : localSelected;

  const categoriesToDisplay =
    availableCategories.length > 0 ? availableCategories : FALLBACK_CATEGORIES;

  const handleToggle = (categoryValue: string) => {
    if (onToggleCategory) {
      onToggleCategory(categoryValue);
    }

    if (!isControlled) {
      setLocalSelected((prev) =>
        prev.includes(categoryValue)
          ? prev.filter((item) => item !== categoryValue)
          : [...prev, categoryValue]
      );
    }
  };

  return (
    <div className={`filter-section ${isOpen ? "active" : ""}`}>
      <button
        className="filter-toggle"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="categories-filter-content"
      >
        Categories{" "}
        <i
          className={`fas fa-chevron-down ${isOpen ? "rotate" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div id="categories-filter-content" className="filter-dropdown-content">
        <div className="vertical-stack">
          {categoriesToDisplay.map((cat) => {
            const isChecked = currentSelected.includes(cat.value);

            return (
              <label key={cat.value}>
                <input
                  type="checkbox"
                  aria-label={cat.label}
                  checked={isChecked}
                  onChange={() => handleToggle(cat.value)}
                />
                {cat.label}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}