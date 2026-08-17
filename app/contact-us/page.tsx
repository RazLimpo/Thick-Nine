import type { Metadata } from 'next';
import ContactUsClient from './client';

export const metadata: Metadata = {
  title: 'Contact Us | Get in Touch',
  description: 'Reach out to us for support, inquiries, or custom project requests.',
};

export default function ContactUsPage() {
  return <ContactUsClient />;
}