"use client";

import { useRef, useState } from "react";
import ServiceCard from "@/components/ServiceCard/ServiceCard";
import { useServices } from "@/hooks/useServices";

export default function ServiceGrid() {
  const { services, loading, error } = useServices();

  const [currentPage, setCurrentPage] = useState(1);

  const servicesRef = useRef<HTMLDivElement>(null);

  const cardsPerPage = 20;

  // Client-side pagination
  const totalPages = Math.ceil(services.length / cardsPerPage);

  const start = (currentPage - 1) * cardsPerPage;
  const end = start + cardsPerPage;

  const visibleServices = services.slice(start, end);

  // Smooth scroll to services section
  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="services-main-col"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <p className="section-subtitle-homepage">
          Loading fresh freelance gigs...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="services-main-col">
        <p className="section-subtitle-homepage">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={servicesRef}
      className="services-main-col"
      id="featured-services-anchor"
    >
      <h2 className="section-title-homepage">
        Featured Services for Your Project
      </h2>

      <p className="section-subtitle-homepage">
        Hand-picked gigs from our top-rated professionals.
      </p>

      {/* Grid wrapper container */}
      <div
        className="mjob-container"
        id="homepage-service-grid"
      >
        {visibleServices.length > 0 ? (
          visibleServices.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
            />
          ))
        ) : (
          <p
            className="section-subtitle-homepage"
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px 0",
            }}
          >
            No services published yet. Be the first to post a service!
          </p>
        )}
      </div>

      {/* Pagination Controller Row */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-wrapper">

            <a
              href="#"
              className="page-arrow prev"
              style={{
                visibility:
                  currentPage === 1
                    ? "hidden"
                    : "visible",
              }}
              onClick={(e) => {
                e.preventDefault();

                if (currentPage > 1) {
                  setCurrentPage((prev) => prev - 1);
                  scrollToServices();
                }
              }}
            >
              <i
                className="fas fa-chevron-left"
                style={{ marginRight: "8px" }}
              />

              Previous
            </a>

            <div
              className="page-numbers"
              id="home-page-numbers"
            >
              {Array.from({
                length: totalPages,
              }).map((_, index) => {
                const page = index + 1;

                return (
                  <a
                    href="#"
                    key={page}
                    className={
                      page === currentPage
                        ? "page-link active"
                        : "page-link"
                    }
                    onClick={(e) => {
                      e.preventDefault();

                      setCurrentPage(page);

                      scrollToServices();
                    }}
                  >
                    {page}
                  </a>
                );
              })}
            </div>

            <a
              href="#"
              className="page-arrow next"
              style={{
                visibility:
                  currentPage === totalPages
                    ? "hidden"
                    : "visible",
              }}
              onClick={(e) => {
                e.preventDefault();

                if (currentPage < totalPages) {
                  setCurrentPage((prev) => prev + 1);
                  scrollToServices();
                }
              }}
            >
              Next

              <i
                className="fas fa-chevron-right"
                style={{ marginLeft: "8px" }}
              />
            </a>

          </div>
        </div>
      )}

      <div className="view-all-button-wrapper">
        <a
          href="/search-results"
          className="btn-secondary view-all-btn"
        >
          Browse All Services
        </a>
      </div>
    </div>
  );
}