import { Metadata } from 'next';
import ServicesClient from './client';

export const metadata: Metadata = {
  title: 'All Categories | Marketplace',
  description: 'Browse all service categories and subcategories offered on our platform.',
};

export default function ServicesPage() {
  return <ServicesClient />;
}