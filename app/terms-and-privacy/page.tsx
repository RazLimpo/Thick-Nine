import { Metadata } from 'next';
import TermsClientLayout from './client';

export const metadata: Metadata = {
  title: 'Terms & Privacy | Thick 9',
  description: 'Thick 9 International Terms of Service and Privacy Policy.',
};

export default function TermsPage() {
  return <TermsClientLayout />;
}