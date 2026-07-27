// app/post-service/page.tsx
import { Metadata } from 'next';
import PostServiceClient from './client';

export const metadata: Metadata = {
  title: 'Post a New Service | Marketplace',
  description: 'Create and list your freelance services, package details, media uploads, and extra offerings.'
};

export default function PostServicePage() {
  return <PostServiceClient />;
}