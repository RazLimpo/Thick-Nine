'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import '@/styles/pages/order-success.css';

interface OrderSuccessClientProps {
  orderId: string;
}

export default function OrderSuccessClient({ orderId }: OrderSuccessClientProps) {
  const [dashboardUrl, setDashboardUrl] = useState('/client-dashboard');

  useEffect(() => {
    // Replace this logic with your auth state or user context if available
    const userRole = localStorage.getItem('userRole'); 

    if (userRole === 'freelancer' || userRole === 'seller') {
      setDashboardUrl('/freelancer-dashboard');
    } else if (userRole === 'affiliate') {
      setDashboardUrl('/affiliate-dashboard');
    } else {
      setDashboardUrl('/client-dashboard');
    }
  }, []);

  return (
    <main className="order-success-container">
      <div className="order-success-card">
        <div className="success-icon-badge">✓</div>
        <h1 className="order-title">Payment Successful!</h1>
        <p className="order-subtitle">
          Your order <strong className="order-id">#{orderId}</strong> has been created and is held securely in escrow.
        </p>

        <div className="order-actions">
          <Link href={dashboardUrl} className="btn-dashboard">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}