'use client';

import Link from "next/link";

interface TrendingItem {
  id: number;
  name: string;
  stats: string;
  query: string; // The literal text query passed to the search engine
}

const trendingItems: TrendingItem[] = [
  {
    id: 1,
    name: "Logo Design",
    stats: "1.2k+ searches",
    query: "Logo Design"
  },
  {
    id: 2,
    name: "AI Image Generation",
    stats: "850 searches",
    query: "AI Image Generation"
  },
  {
    id: 3,
    name: "Social Media Manager",
    stats: "600 searches",
    query: "Social Media Manager"
  }
];

export default function TrendingWidget() {
  return (
    <div className="trending-widget">
      
      <h3 className="sidebar-main-title">
        <i className="fas fa-fire" style={{ marginRight: '8px' }} />
        Trending Now
      </h3>

      <ul className="trending-list">
        {trendingItems.map((item) => (
          <li key={item.id}>
            <Link
              href={`/search-results?q=${encodeURIComponent(item.query)}`}
              className="trending-item-link"
            >
              {/* Formats single digits into 01, 02, 03 to perfectly match your CSS rank design */}
              <span className="trend-rank">
                {String(item.id).padStart(2, "0")}
              </span>

              <div className="trend-info">
                <p className="trend-name">{item.name}</p>
                <span className="trend-stats">{item.stats}</span>
              </div>

              {/* Arrow icon that elegantly slides into view via your index.css hover properties */}
              <i className="fas fa-arrow-trend-up" />
            </Link>
          </li>
        ))}
      </ul>

    </div>
  );
}