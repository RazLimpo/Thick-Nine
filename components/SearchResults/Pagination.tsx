"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Helper to generate page numbers with ellipsis for cleaner UI
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <nav className="pagination-wrapper" aria-label="Search results pages">
      <ul className="pagination-list">
        {/* Previous Button */}
        <li>
          <button
            type="button"
            className="pagination-btn prev-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Go to previous page"
          >
            <i className="fas fa-chevron-left" aria-hidden="true" />
            <span>Prev</span>
          </button>
        </li>

        {/* Page Numbers */}
        {getPageNumbers().map((page, index) => (
          <li key={index}>
            {typeof page === "number" ? (
              <button
                type="button"
                className={`pagination-number ${
                  page === currentPage ? "active" : ""
                }`}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? "page" : undefined}
                aria-label={`Go to page ${page}`}
              >
                {page}
              </button>
            ) : (
              <span className="pagination-ellipsis" aria-hidden="true">
                {page}
              </span>
            )}
          </li>
        ))}

        {/* Next Button */}
        <li>
          <button
            type="button"
            className="pagination-btn next-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Go to next page"
          >
            <span>Next</span>
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}