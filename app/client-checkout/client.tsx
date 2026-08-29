//app/client-checkout/client.tsx


'use client';

/* ═══════════════════════════════════════════════════════════════════════════ */
/* 1. IMPORTS & TYPE DEFINITIONS */
/* ═══════════════════════════════════════════════════════════════════════════ */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import '@/styles/pages/client-checkout.css';

interface AddonItem {
  title: string;
  price: number;
}

interface OrderPayload {
  clientId: string;
  serviceId: string;
  sellerId: string;
  basePackagePrice: number;
  selectedAddons: AddonItem[];
  requirements: string;
  affiliateCode: string | null;
  paymentMethod: 'card'; // Fixed to credit/debit card processing
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'removed';
}

const TOAST_ICONS: Record<string, string> = {
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-xmark',
  info: 'fa-solid fa-circle-info',
  removed: 'fa-solid fa-triangle-exclamation',
};

export default function ClientCheckout() {
  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* 2. DYNAMIC STATE MANAGEMENT */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [instructions, setInstructions] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [termsError, setTermsError] = useState<boolean>(false);

  // Card Input Form State
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');

  // Service Data extracted from URL params
  const [serviceData, setServiceData] = useState<{
    serviceId: string;
    sellerId: string;
    title: string;
    basePrice: number;
    addons: AddonItem[];
  }>({
    serviceId: '',
    sellerId: '',
    title: 'Custom Service Package',
    basePrice: 100,
    addons: [],
  });

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* 3. PARSE URL SEARCH PARAMS ON LOAD */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      let parsedAddons: AddonItem[] = [];
      try {
        const rawAddons = urlParams.get('addons');
        if (rawAddons) parsedAddons = JSON.parse(rawAddons);
      } catch (err) {
        console.error('Failed to parse checkout addons:', err);
      }

      setServiceData({
        serviceId: urlParams.get('serviceId') || '',
        sellerId: urlParams.get('sellerId') || '',
        title: urlParams.get('title') || 'Custom Service Package',
        basePrice: Number(urlParams.get('price')) || 100,
        addons: parsedAddons,
      });
    }
  }, []);

  /* ═══════════════════════════════════════════════════════════════════════════ */
  /* 4. DYNAMIC FEE CALCULATIONS */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  const addonsTotal = serviceData.addons.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const subtotal = serviceData.basePrice + addonsTotal;
  const buyerServiceFee = Number((subtotal * 0.05).toFixed(2));
  const grandTotal = Number((subtotal + buyerServiceFee).toFixed(2));
    
    
    /* ═══════════════════════════════════════════════════════════════════════════ */
  /* 5. UTILITY & SUBMISSION HANDLERS */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, type: 'removed' } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 400);
    }, 2800);
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Card Fields
    if (!cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
      showToast('Please enter complete credit/debit card details.', 'error');
      return;
    }

    // 2. Validate Terms Acceptance
    if (!termsAccepted) {
      showToast('Please accept the Terms of Service and Cancellation Policy.', 'error');
      setTermsError(true);
      return;
    }

    setTermsError(false);
    setIsProcessing(true);

    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode =
      urlParams.get('ref') || (typeof window !== 'undefined' ? localStorage.getItem('affiliateCode') : null);

    const orderPayload: OrderPayload = {
      clientId: urlParams.get('clientId') || 'CURRENT_USER_ID',
      serviceId: serviceData.serviceId,
      sellerId: serviceData.sellerId,
      basePackagePrice: serviceData.basePrice,
      selectedAddons: serviceData.addons,
      requirements: instructions,
      affiliateCode: affiliateCode,
      paymentMethod: 'card', // Enforced strictly as card
    };

    try {
      const response = await fetch('/api/checkout/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }

      showToast('Order created successfully! Redirecting...', 'success');

      if (affiliateCode && typeof window !== 'undefined') {
        localStorage.removeItem('affiliateCode');
      }

      setTimeout(() => {
        window.location.href = `/orders/${data.orderId}`;
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Payment processing error.', 'error');
      setIsProcessing(false);
    }
  };
    
    
    /* ═══════════════════════════════════════════════════════════════════════════ */
  /* 6. JSX RENDERING */
  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <main>
      <section className="checkout-page-container main-content-padding">
        <h1>Secure Checkout</h1>

        <div className="checkout-layout">
          {/* MAIN COLUMN */}
          <div className="checkout-main-column">
            {/* Delivery Instructions */}
            <div className="checkout-card delivery-details-card">
              <h3>Delivery Instructions</h3>
              <p className="section-subheading">Confirm your requirements and final delivery date.</p>

              <div className="form-group">
                <label htmlFor="instructions">Provide your requirements for the freelancer:</label>
                <textarea
                  id="instructions"
                  rows={6}
                  placeholder="e.g., Brand colors, website link, preferred style, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              <div className="delivery-estimate">
                <i className="fas fa-clock"></i>
                <span>Estimated Delivery: </span>
                <span className="delivery-date">Tuesday, November 11th</span>
              </div>
            </div>

            {/* Payment Method - Credit / Debit Card Only */}
            <div className="checkout-card payment-method-card">
              <h3>Payment Method</h3>

              <div className="payment-options">
                <label className="payment-option-card active">
                  <input type="radio" name="payment_method" value="card" checked readOnly />
                  <i className="fas fa-credit-card"></i>
                  <span>Credit / Debit Card</span>
                </label>
              </div>

              {/* Direct Credit Card Form */}
              <div className="credit-card-form" style={{ marginTop: '15px' }}>
                <div className="form-group">
                  <label htmlFor="card-number">Card Number</label>
                  <input
                    type="text"
                    id="card-number"
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="expiry">Expiry</label>
                    <input
                      type="text"
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV</label>
                    <input
                      type="text"
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="form-group terms-check" style={{ marginTop: '20px' }}>
                <label style={{ color: termsError ? 'var(--error-color, #d32f2f)' : undefined }}>
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                  />
                  I accept the{' '}
                  <Link href="/terms-and-privacy#terms-of-service" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms-and-privacy#cancellation-policy" target="_blank" rel="noopener noreferrer">
                    Cancellation Policy
                  </Link>
                  .
                </label>
              </div>
            </div>
          </div>

          {/* DYNAMIC SIDEBAR SUMMARY */}
          <div className="checkout-sidebar">
            <div className="checkout-card checkout-order-summary-box">
              <h3>Order Summary</h3>

              {/* Base Service Package */}
              <div className="order-summary-item service-item">
                <span className="item-title">{serviceData.title}</span>
                <span className="item-price">${serviceData.basePrice.toFixed(2)}</span>
              </div>

              {/* Selected Addons */}
              {serviceData.addons.map((addon, idx) => (
                <div key={idx} className="order-summary-item add-on-item">
                  <span className="item-title">{addon.title}</span>
                  <span className="item-price add-on-cost">+${Number(addon.price).toFixed(2)}</span>
                </div>
              ))}

              <hr />

              <div className="order-summary-item subtotal-item">
                <span className="item-title">Subtotal</span>
                <span className="item-price">${subtotal.toFixed(2)}</span>
              </div>

              <div className="order-summary-item fee-item">
                <span className="item-title">Service Fee (5%)</span>
                <span className="item-price">${buyerServiceFee.toFixed(2)}</span>
              </div>

              <hr />

              <div className="order-summary-item total-item">
                <span className="item-title total-label">Total Payment Due</span>
                <span className="item-price total-cost">${grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="btn-primary full-width-btn pay-now-btn"
                onClick={handlePayNow}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Pay Now ($${grandTotal.toFixed(2)})`}
              </button>

              <p
                className="sub-text"
                style={{ marginTop: '8px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}
              >
                By paying, you agree: Funds are held in USD escrow for 14 days after delivery to protect
                against disputes. Freelancers are paid via Payoneer. See{' '}
                <Link href="/terms-and-privacy#escrow-policy" target="_blank" rel="noopener noreferrer">
                  Escrow Policy
                </Link>
                .
              </p>
            </div>

            <p className="security-info">
              <i className="fas fa-lock"></i> All transactions are secure and encrypted.
            </p>
          </div>
        </div>
      </section>

      {/* TOAST CONTAINER */}
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <i className={TOAST_ICONS[toast.type] || TOAST_ICONS.info}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
    