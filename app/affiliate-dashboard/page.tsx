import { Metadata } from 'next';
import { Suspense } from 'react';
import AffiliateDashboardClient from './client';

export const metadata: Metadata = {
  title: 'Affiliate Dashboard | MyMarketplace',
  description: 'Manage your referral links, track earnings, and customize your affiliate storefront.',
};

export default function AffiliateDashboardPage() {
  return (
    <Suspense fallback={<div className="aff-card p-8 text-center">Loading dashboard...</div>}>
      <AffiliateDashboardClient />
    </Suspense>
  );
}