'use client';

import Link from 'next/link';
import '@/styles/pages/category.css';

interface CategoryClientProps {
  slug: string;
  categoryData: {
    label: string;
    subcategories: readonly string[];
  };
}

export default function CategoryClient({ slug, categoryData }: CategoryClientProps) {
  return (
    <main className="category-page-container">
      <header className="category-header">
        <h1>{categoryData.label}</h1>
        <p>Explore all specialized services available under {categoryData.label}.</p>
      </header>

      <section className="subcategories-section">
        <h2>Subcategories</h2>
        <div className="subcategories-grid">
          {categoryData.subcategories.map((sub) => {
            // Encode subcategory for URL query parameter
            const encodedSub = encodeURIComponent(sub);

            return (
              <Link 
                key={sub} 
                href={`/services/${slug}?subCategory=${encodedSub}`}
                className="subcategory-card"
                style={{ textDecoration: 'none' }}
              >
                <h3 className="subcategory-name">{sub}</h3>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}