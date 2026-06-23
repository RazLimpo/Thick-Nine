import "@/styles/pages/index.css";
import "@/styles/pages/service-card.css";

import HeroSection from "@/components/HeroSection/HeroSection";
import ServiceGrid from "@/components/ServiceGrid/ServiceGrid";
import CategorySidebar from "@/components/CategorySidebar/CategorySidebar";
import ValueSection from "@/components/ValueSection/ValueSection";

export default function HomePage() {
  return (
    <main>
      {/* 1. Full-width Slide Hero Banner */}
      <HeroSection />

      {/* 2. Split Flexible Homepage Columns */}
      <section className="featured-services-section">
        <div className="homepage-flex-wrapper">
          {/* Left Column: Dynamic Live Gigs */}
          <ServiceGrid />

          {/* Right Column: Sticky Category Cards & Trending Box */}
          <CategorySidebar />
        </div>
      </section>
      
      {/* 3. Onboarding Value Flow Steps */}
      <ValueSection />
    </main>
  );
}