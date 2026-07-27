// app/post-service/client.tsx
'use client';

import React from 'react';
import '../../styles/pages/post-service.css';
import { PostService } from '../../components/PostService/PostService';

export default function PostServiceClient() {
  return (
    <main className="main-content-wrapper">
      <PostService />
    </main>
  );
}