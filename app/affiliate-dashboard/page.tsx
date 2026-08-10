import { Metadata } from 'next';
import AffiliateDashboardClient from './client';

export const metadata: Metadata = {
  title: 'Affiliate Dashboard | MyMarketplace',
  description: 'Manage your referral links, track earnings, and customize your affiliate storefront.',
};

export default function AffiliateDashboardPage() {
  return <AffiliateDashboardClient />;
}