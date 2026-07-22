"use client";

import ServiceCard from "@/components/ServiceCard/ServiceCard";
import type { Service } from "@/types/service";

interface ResultsGridProps {
  services?: Service[];
  isLoading?: boolean;
}

export default function ResultsGrid({
  services = [],
  isLoading = false,
}: ResultsGridProps) {
  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="mjob-container">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="service-card-skeleton"
            aria-hidden="true"
          >
            <div className="skeleton-thumb" />
            <div className="skeleton-body">
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
              <div className="skeleton-line medium" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // No Results
  if (services.length === 0) {
    return null;
  }

  // Render Services
  return (
    <div className="mjob-container">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
        />
      ))}
    </div>
  );
}