'use client';

import { useEffect, useState } from "react";
import ServiceCard from "@/components/ServiceCard/ServiceCard";
import { API_BASE_URL } from "@/lib/constants";

interface Service {
  id: number;
  title: string;
  seller: string;
  location: string;
  price: string;
  rating: string;
  delivery: string;
  level: string;
  category: string;
  avatar: string;
  images: string[];
}

export default function ServiceGrid() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const cardsPerPage = 20;

  // 1. Fetch live services from your Render MongoDB Backend on Mount
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/services`);
        if (res.ok) {
          const data = await res.json();
          setServices(data);
        } else {
          console.error("Backend error response status:", res.status);
        }
      } catch (error) {
        console.error("Failed fetching live marketplace services:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  // 2. Client-side Pagination Math
  const totalPages = Math.ceil(services.length / cardsPerPage);
  const start = (currentPage - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  const visibleServices = services.slice(start, end);

  // 3. Smooth targeted section scrolling
  function scrollToServices() {
    const element = document.getElementById("featured-services-anchor");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (loading) {
    return (
      <div className="services-main-col" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <p className="section-subtitle-homepage">Loading fresh freelance gigs...</p>
      </div>
    );
  }

  return (
    <div className="services-main-col" id="featured-services-anchor">
      <h2 className="section-title-homepage">
        Featured Services for Your Project
      </h2>

      <p className="section-subtitle-homepage">
        Hand-picked gigs from our top-rated professionals.
      </p>

      {/* Grid wrapper container */}
      <div className="mjob-container" id="homepage-service-grid">
        {visibleServices.length > 0 ? (
          visibleServices.map((service) => (
            <ServiceCard key={service.id} {...service} />
          ))
        ) : (
          <p className="section-subtitle-homepage" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
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
              style={{ visibility: currentPage === 1 ? 'hidden' : 'visible' }}
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                  scrollToServices();
                }
              }}
            >
              <i className="fas fa-chevron-left" style={{ marginRight: '8px' }} />
              Previous
            </a>

            <div className="page-numbers" id="home-page-numbers">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <a
                    href="#"
                    key={page}
                    className={page === currentPage ? "page-link active" : "page-link"}
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
              style={{ visibility: currentPage === totalPages ? 'hidden' : 'visible' }}
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) {
                  setCurrentPage(currentPage + 1);
                  scrollToServices();
                }
              }}
            >
              Next
              <i className="fas fa-chevron-right" style={{ marginLeft: '8px' }} />
            </a>
          </div>
        </div>
      )}

      <div className="view-all-button-wrapper">
        <a href="/search-results" className="btn-secondary view-all-btn">
          Browse All Services
        </a>
      </div>
    </div>
  );
}