"use client";

import { CATEGORIES, CategoryKey } from "@/lib/categories";

type Props = {
  category: string;
  subCategory: string;
  onCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
};

export default function CategorySelect({
  category,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
}: Props) {
  const subcategories =
    category && category in CATEGORIES
      ? CATEGORIES[category as CategoryKey].subcategories
      : [];

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value);
    onSubCategoryChange(""); // reset subcategory when main category changes
  };

  return (
    <>
      {/* Main Category */}
      <div className="form-group">
        <label htmlFor="category">Service Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
        >
          <option value="">Select a Category</option>
          {Object.entries(CATEGORIES).map(([key, data]) => (
            <option key={key} value={key}>
              {data.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sub Category */}
      <div className="form-group">
        <label htmlFor="sub-category">Sub Category</label>
        <select
          id="sub-category"
          value={subCategory}
          onChange={(e) => onSubCategoryChange(e.target.value)}
          disabled={!category || subcategories.length === 0}
          required={subcategories.length > 0}
        >
          <option value="">
            {!category
              ? "Select a main category first"
              : subcategories.length === 0
              ? "No subcategories yet"
              : "Select a Sub Category"}
          </option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}