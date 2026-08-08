import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATEGORIES, CategoryKey } from '@/lib/categories';
import CategoryClient from './client';

interface PageProps {
  params: Promise<{ category: string }>;
}

// Dynamic metadata generator based on category name
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryData = CATEGORIES[category as CategoryKey];

  if (!categoryData) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: `${categoryData.label} Services | Marketplace`,
    description: `Find top experts and services in ${categoryData.label}.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categoryData = CATEGORIES[category as CategoryKey];

  // Trigger Next.js 404 page if category key is invalid
  if (!categoryData) {
    notFound();
  }

  return <CategoryClient slug={category} categoryData={categoryData} />;
}