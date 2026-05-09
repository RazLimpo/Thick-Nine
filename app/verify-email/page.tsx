import VerifyEmailClient from './client';
import { BRAND } from '@/lib/constants'; 

export const metadata = {
  title: `Email Verification | ${BRAND.pretty}`,
  description: `Verify your email to access the ${BRAND.pretty} marketplace`,
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}