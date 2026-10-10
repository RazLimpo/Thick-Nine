// app/client-checkout/client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import '@/styles/pages/client-checkout.css';

interface AddonItem {
  title: string;
  price: number;
}

interface OrderPayload {
  clientId?: string;
  serviceId: string;
  sellerId: string;
  basePackagePrice: number;
  selectedAddons: AddonItem[];
  requirements: string;
  affiliateCode: string | null;
  paymentMethod: 'card';
  deliveryTimeDays: number;
  offerId?: string | null;
  couponCode?: string | null;
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

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + Math.max(0, Math.floor(days)));
  return d;
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClientCheckout() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [termsError, setTermsError] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);

  const [serviceData, setServiceData] = useState<{
    serviceId: string;
    sellerId: string;
    title: string;
    basePrice: number;
    addons: AddonItem[];
    deliveryTimeDays: number;
  }>({
    serviceId: '',
    sellerId: '',
    title: 'Custom Service Package',
    basePrice: 100,
    addons: [],
    deliveryTimeDays: 3,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);

    let parsedAddons: AddonItem[] = [];
    try {
      const rawAddons = urlParams.get('addons');
      if (rawAddons) parsedAddons = JSON.parse(rawAddons);
    } catch (err) {
      console.error('Failed to parse checkout addons:', err);
    }

    const daysRaw =
      urlParams.get('deliveryTime') ||
      urlParams.get('deliveryDays') ||
      urlParams.get('days') ||
      '3';
    const deliveryTimeDays = Math.max(1, Number(daysRaw) || 3);

    setOfferId(urlParams.get('offerId') || null);

    setServiceData({
      serviceId: urlParams.get('serviceId') || '',
      sellerId: urlParams.get('sellerId') || '',
      title: urlParams.get('title') || 'Custom Service Package',
      basePrice: Number(urlParams.get('price')) || 100,
      addons: parsedAddons,
      deliveryTimeDays,
    });
  }, []);

  const estimatedDeliveryDate = useMemo(
    () => addDays(new Date(), serviceData.deliveryTimeDays),
    [serviceData.deliveryTimeDays]
  );

  const addonsTotal = serviceData.addons.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );
  const subtotal = serviceData.basePrice + addonsTotal;
  const discountAmount = couponApplied?.discountAmount || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const buyerServiceFee = Number((discountedSubtotal * 0.05).toFixed(2));
  const grandTotal = Number((discountedSubtotal + buyerServiceFee).toFixed(2));

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'error'
  ) => {
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

  const getAuthHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      showToast('Enter a coupon code', 'error');
      return;
    }
    setCouponBusy(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          code,
          serviceId: serviceData.serviceId || null,
          orderAmount: subtotal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setCouponApplied(null);
        showToast(data.message || 'Invalid coupon', 'error');
        return;
      }
      setCouponApplied({
        code: data.coupon?.code || code,
        discountAmount: Number(data.discountAmount) || 0,
      });
      showToast(
        `Coupon applied — save $${Number(data.discountAmount || 0).toFixed(2)}`,
        'success'
      );
    } catch {
      showToast('Could not validate coupon', 'error');
    } finally {
      setCouponBusy(false);
    }
  };

  const clearCoupon = () => {
    setCouponApplied(null);
    setCouponInput('');
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
      showToast('Please enter complete credit/debit card details.', 'error');
      return;
    }
    if (!termsAccepted) {
      showToast(
        'Please accept the Terms of Service and Cancellation Policy.',
        'error'
      );
      setTermsError(true);
      return;
    }
    if (!serviceData.serviceId || !serviceData.sellerId) {
      showToast('Missing service information. Go back and try again.', 'error');
      return;
    }

    setTermsError(false);
    setIsProcessing(true);

    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode =
      urlParams.get('ref') ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('affiliateCode')
        : null);

    let clientId = urlParams.get('clientId') || '';
    if (!clientId && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          clientId = u.id || u._id || '';
        }
      } catch {
        /* ignore */
      }
    }

    const orderPayload: OrderPayload = {
      clientId: clientId || undefined,
      serviceId: serviceData.serviceId,
      sellerId: serviceData.sellerId,
      basePackagePrice: serviceData.basePrice,
      selectedAddons: serviceData.addons,
      requirements: instructions,
      affiliateCode,
      paymentMethod: 'card',
      deliveryTimeDays: serviceData.deliveryTimeDays,
      offerId: offerId || null,
      couponCode: couponApplied?.code || null,
    };

    try {
      const response = await fetch('/api/checkout/service', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(orderPayload),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Server returned status ${response.status}. Endpoint /api/checkout/service might be missing.`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Checkout failed.');
      }

      showToast('Order created successfully! Redirecting...', 'success');

      if (affiliateCode && typeof window !== 'undefined') {
        localStorage.removeItem('affiliateCode');
      }

      const orderId = data.orderId || data.order?._id || data._id;
      setTimeout(() => {
        window.location.href = orderId ? `/orders/${orderId}` : '/orders';
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Payment processing error.', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <main>
      <section className="checkout-page-container main-content-padding">
        <h1>Secure Checkout</h1>
        {offerId && (
          <p
            style={{
              marginBottom: 12,
              color: '#008060',
              fontWeight: 600,
              fontSize: '0.95rem',
            }}
          >
            Paying for an accepted custom offer
          </p>
        )}

        <div className="checkout-layout">
          <div className="checkout-main-column">
            <div className="checkout-card delivery-details-card">
              <h3>Delivery Instructions</h3>
              <p className="section-subheading">
                Confirm your requirements and final delivery date.
              </p>

              <div className="form-group">
                <label htmlFor="instructions">
                  Provide your requirements for the freelancer:
                </label>
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
                <span className="delivery-date">
                  {formatLongDate(estimatedDeliveryDate)}
                  <span
                    style={{
                      marginLeft: 8,
                      color: '#888',
                      fontWeight: 400,
                      fontSize: '0.9em',
                    }}
                  >
                    ({serviceData.deliveryTimeDays} day
                    {serviceData.deliveryTimeDays === 1 ? '' : 's'})
                  </span>
                </span>
              </div>
            </div>

            <div className="checkout-card payment-method-card">
              <h3>Payment Method</h3>

              <div className="payment-options">
                <label className="payment-option-card active">
                  <input
                    type="radio"
                    name="payment_method"
                    value="card"
                    checked
                    readOnly
                  />
                  <i className="fas fa-credit-card"></i>
                  <span>Credit / Debit Card</span>
                </label>
              </div>

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

              <div
                className="form-group terms-check"
                style={{ marginTop: '20px' }}
              >
                <label
                  style={{
                    color: termsError
                      ? 'var(--error-color, #d32f2f)'
                      : undefined,
                  }}
                >
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
                  <Link
                    href="/terms-and-privacy#terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/terms-and-privacy#cancellation-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cancellation Policy
                  </Link>
                  .
                </label>
              </div>
            </div>
          </div>

          <div className="checkout-sidebar">
            <div className="checkout-card checkout-order-summary-box">
              <h3>Order Summary</h3>

              <div className="order-summary-item service-item">
                <span className="item-title">{serviceData.title}</span>
                <span className="item-price">
                  ${serviceData.basePrice.toFixed(2)}
                </span>
              </div>

              {serviceData.addons.map((addon, idx) => (
                <div key={idx} className="order-summary-item add-on-item">
                  <span className="item-title">{addon.title}</span>
                  <span className="item-price add-on-cost">
                    +${Number(addon.price).toFixed(2)}
                  </span>
                </div>
              ))}

              <hr />

              <div className="order-summary-item subtotal-item">
                <span className="item-title">Subtotal</span>
                <span className="item-price">${subtotal.toFixed(2)}</span>
              </div>

              {/* Coupon */}
              <div className="form-group" style={{ margin: '12px 0' }}>
                <label htmlFor="coupon-code">Promo code</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="coupon-code"
                    type="text"
                    placeholder="WELCOME15"
                    value={couponInput}
                    disabled={!!couponApplied}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    style={{ flex: 1 }}
                  />
                  {couponApplied ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={clearCoupon}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={couponBusy}
                      onClick={applyCoupon}
                    >
                      {couponBusy ? '…' : 'Apply'}
                    </button>
                  )}
                </div>
              </div>

              {couponApplied && (
                <div className="order-summary-item fee-item">
                  <span className="item-title">
                    Discount ({couponApplied.code})
                  </span>
                  <span className="item-price" style={{ color: '#008060' }}>
                    −${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="order-summary-item fee-item">
                <span className="item-title">Service Fee (5%)</span>
                <span className="item-price">${buyerServiceFee.toFixed(2)}</span>
              </div>

              <hr />

              <div className="order-summary-item total-item">
                <span className="item-title total-label">Total Payment Due</span>
                <span className="item-price total-cost">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                className="btn-primary full-width-btn pay-now-btn"
                onClick={handlePayNow}
                disabled={isProcessing}
              >
                {isProcessing
                  ? 'Processing...'
                  : `Pay Now ($${grandTotal.toFixed(2)})`}
              </button>

              <p
                className="sub-text"
                style={{
                  marginTop: '8px',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: '#666',
                }}
              >
                By paying, you agree: Funds are held in USD escrow for 14 days
                after delivery to protect against disputes. Freelancers are paid
                via Payoneer. See{' '}
                <Link
                  href="/terms-and-privacy#escrow-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Escrow Policy
                </Link>
                .
              </p>
            </div>

            <p className="security-info">
              <i className="fas fa-lock"></i> All transactions are secure and
              encrypted.
            </p>
          </div>
        </div>
      </section>

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
