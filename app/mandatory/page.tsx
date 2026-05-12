import MandatoryClient from './client';
import { BRAND } from '@/lib/constants'; 

// NO 'import { Metadata }' here to avoid errors
export const metadata = {
  title: `Finalize Account | ${BRAND.pretty}`,
  description: `Complete your registration for the ${BRAND.pretty} marketplace`,
};

export default function MandatoryPage() {
  return <MandatoryClient />;
}