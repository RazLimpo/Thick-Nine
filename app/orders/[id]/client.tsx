// app/orders/[id]/client.tsx
// Merged: keeps Payment Successful (buyer) + adds Order Detail (seller & buyer)

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/order-success.css";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderSuccessClientProps {
  orderId: string;
}

type OrderDetail = {
  _id: string;
  status: string;
  requirements?: string;
  basePackagePrice?: number;
  selectedAddons?: Array<{ title?: string; price?: number }>;
  subtotal?: number;
  buyerServiceFee?: number;
  grandTotal?: number;
  sellerPlatformFee?: number;
  sellerEarnings?: number;
  paymentMethod?: string;
  escrowReleaseDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  serviceId?:
    | {
        _id?: string;
        title?: string;
        images?: string[];
        category?: string;
      }
    | string;
  clientId?:
    | {
        _id?: string;
        fullName?: string;
        displayName?: string;
        avatar?: string;
        email?: string;
      }
    | string;
  sellerId?:
    | {
        _id?: string;
        fullName?: string;
        displayName?: string;
        avatar?: string;
      }
    | string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function money(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function shortId(id: string) {
  return `#${(id || "").slice(-6).toUpperCase()}`;
}

function statusLabel(status: string) {
  const s = (status || "").toLowerCase().replace(/_/g, " ");
  if (!s) return "Pending";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "pending") return { bg: "#fff8e1", color: "#f57f17" };
  if (s === "in_escrow") return { bg: "#e3f2fd", color: "#1976d2" };
  if (s === "revision_requested") return { bg: "#fff3e0", color: "#e65100" };
  if (s === "completed") return { bg: "#e6f7ed", color: "#28a745" };
  if (s === "cancelled") return { bg: "#ffebee", color: "#c62828" };
  return { bg: "#f1f5f9", color: "#64748b" };
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function OrderSuccessClient({ orderId }: OrderSuccessClientProps) {
  const router = useRouter();

  // --- existing success-page state (kept) ---
  const [dashboardUrl, setDashboardUrl] = useState("/client-dashboard");

  // --- order detail state (new) ---
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [role, setRole] = useState<"seller" | "client" | "unknown">("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "freelancer" || userRole === "seller") {
      setDashboardUrl("/freelancer-dashboard");
    } else if (userRole === "affiliate") {
      setDashboardUrl("/affiliate-dashboard");
    } else {
      setDashboardUrl("/client-dashboard");
    }
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          // Keep success UI usable even if detail API needs login later
          setError(data.message || "Sign in to view full order details.");
          setLoading(false);
          return;
        }
        throw new Error(data.message || "Failed to load order.");
      }

      setOrder(data.order || null);
      if (data.role === "seller" || data.role === "client") {
        setRole(data.role);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const service =
    order && typeof order.serviceId === "object" && order.serviceId
      ? order.serviceId
      : null;
  const client =
    order && typeof order.clientId === "object" && order.clientId
      ? order.clientId
      : null;
  const seller =
    order && typeof order.sellerId === "object" && order.sellerId
      ? order.sellerId
      : null;

  const serviceIdStr =
    service?._id ||
    (order && typeof order.serviceId === "string" ? order.serviceId : "") ||
    "";

  const showSuccessBanner =
    role !== "seller" &&
    (!order ||
      order.status === "pending" ||
      order.status === "in_escrow");

  const colors = statusColor(order?.status || "pending");
  const addons = Array.isArray(order?.selectedAddons)
    ? order!.selectedAddons
    : [];
  const clientName =
    client?.displayName || client?.fullName || "Client";
  const thumb = service?.images?.[0] || "/default-service.png";

  return (
    <main className="order-success-container">
      {/* ========== EXISTING: Payment success card (buyers) ========== */}
      {showSuccessBanner && (
        <div className="order-success-card">
          <div className="success-icon-badge">✓</div>
          <h1 className="order-title">Payment Successful!</h1>
          <p className="order-subtitle">
            Your order{" "}
            <strong className="order-id">
              {order ? shortId(order._id) : `#${orderId}`}
            </strong>{" "}
            has been created and is held securely in escrow.
          </p>

          <div className="order-actions">
            <Link href={dashboardUrl} className="btn-dashboard">
              Go to Dashboard
            </Link>
            {serviceIdStr && (
              <Link
                href={`/services/details/${serviceIdStr}`}
                className="btn-dashboard"
                style={{ marginLeft: 12, opacity: 0.9 }}
              >
                View Service
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Seller-facing title when no success banner */}
      {role === "seller" && (
        <div style={{ maxWidth: 900, margin: "0 auto 20px", padding: "0 20px" }}>
          <nav style={{ marginBottom: 16 }}>
            {serviceIdStr ? (
              <Link href={`/service-dashboard/${serviceIdStr}/orders`}>
                <i className="fas fa-arrow-left" /> Back to Service Orders
              </Link>
            ) : (
              <Link href="/service-management">
                <i className="fas fa-arrow-left" /> Back
              </Link>
            )}
          </nav>
          <h1 style={{ fontSize: "1.5rem" }}>
            Order {order ? shortId(order._id) : `#${orderId}`}
          </h1>
        </div>
      )}

      {/* ========== Loading / soft error for detail ========== */}
      {loading && (
        <p style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
          Loading order details…
        </p>
      )}

      {!loading && error && !order && (
        <p
          style={{
            textAlign: "center",
            color: "#b91c1c",
            padding: 16,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          {error}
        </p>
      )}

      {/* ========== Order detail (when API returns data) ========== */}
      {order && (
        <div
          style={{
            maxWidth: 900,
            margin: "24px auto 60px",
            padding: "0 20px",
          }}
        >
          {/* Header */}
          <section
            style={{
              background: "white",
              borderRadius: 16,
              border: "1px solid #edf2f7",
              padding: 24,
              marginBottom: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: 4 }}>
                  Order {shortId(order._id)}
                </p>
                <h2 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
                  {service?.title || "Service order"}
                </h2>
                <span
                  style={{
                    display: "inline-block",
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: colors.bg,
                    color: colors.color,
                  }}
                >
                  {statusLabel(order.status)}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.8rem", color: "#888" }}>Grand total</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                  {money(order.grandTotal)}
                </p>
              </div>
            </div>

            {service && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <Image
                  src={thumb}
                  alt={service.title || "Service"}
                  width={72}
                  height={54}
                  style={{ objectFit: "cover", borderRadius: 10 }}
                />
                <div>
                  <p style={{ fontWeight: 600 }}>{service.title}</p>
                  <p style={{ fontSize: "0.85rem", color: "#888" }}>
                    {service.category || "Service"}
                  </p>
                  {serviceIdStr && (
                    <Link
                      href={`/services/details/${serviceIdStr}`}
                      style={{ fontSize: "0.85rem" }}
                    >
                      View public page{" "}
                      <i className="fa-solid fa-square-arrow-up-right" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 20,
            }}
            className="order-detail-grid"
          >
            <div>
              {/* Parties */}
              <section
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #edf2f7",
                  padding: 24,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginBottom: 16, fontSize: "1.05rem" }}>
                  <i
                    className="fas fa-users"
                    style={{ marginRight: 8, color: "#d96464" }}
                  />
                  Parties
                </h3>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <Image
                      src={client?.avatar || "/default-avatar.png"}
                      alt={clientName}
                      width={40}
                      height={40}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "#888" }}>
                        Buyer
                      </p>
                      <p style={{ fontWeight: 600 }}>{clientName}</p>
                    </div>
                  </div>
                  {seller && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Image
                        src={seller.avatar || "/default-avatar.png"}
                        alt={
                          seller.displayName || seller.fullName || "Seller"
                        }
                        width={40}
                        height={40}
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                      <div>
                        <p style={{ fontSize: "0.75rem", color: "#888" }}>
                          Seller
                        </p>
                        <p style={{ fontWeight: 600 }}>
                          {seller.displayName ||
                            seller.fullName ||
                            "Freelancer"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Requirements */}
              <section
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #edf2f7",
                  padding: 24,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginBottom: 12, fontSize: "1.05rem" }}>
                  <i
                    className="fas fa-clipboard-list"
                    style={{ marginRight: 8, color: "#d96464" }}
                  />
                  Requirements
                </h3>
                <p
                  style={{
                    whiteSpace: "pre-wrap",
                    color: order.requirements ? "#333" : "#94a3b8",
                    lineHeight: 1.6,
                  }}
                >
                  {order.requirements?.trim() ||
                    "No requirements submitted yet."}
                </p>
              </section>

              {/* Timeline */}
              <section
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #edf2f7",
                  padding: 24,
                }}
              >
                <h3 style={{ marginBottom: 12, fontSize: "1.05rem" }}>
                  <i
                    className="fas fa-clock"
                    style={{ marginRight: 8, color: "#d96464" }}
                  />
                  Timeline
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: 10 }}>
                    <span style={{ color: "#888", fontSize: "0.85rem" }}>
                      Created
                    </span>
                    <br />
                    <strong>{formatDate(order.createdAt)}</strong>
                  </li>
                  <li style={{ marginBottom: 10 }}>
                    <span style={{ color: "#888", fontSize: "0.85rem" }}>
                      Last updated
                    </span>
                    <br />
                    <strong>{formatDate(order.updatedAt)}</strong>
                  </li>
                  {order.escrowReleaseDate && (
                    <li>
                      <span style={{ color: "#888", fontSize: "0.85rem" }}>
                        Escrow release
                      </span>
                      <br />
                      <strong>{formatDate(order.escrowReleaseDate)}</strong>
                    </li>
                  )}
                </ul>
              </section>
            </div>

            {/* Pricing */}
            <div>
              <section
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #edf2f7",
                  padding: 24,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginBottom: 16, fontSize: "1.05rem" }}>
                  <i
                    className="fas fa-receipt"
                    style={{ marginRight: 8, color: "#d96464" }}
                  />
                  Pricing
                </h3>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <PriceRow
                    label="Base package"
                    value={money(order.basePackagePrice)}
                  />
                  {addons.map((a, i) => (
                    <PriceRow
                      key={i}
                      label={a.title || "Add-on"}
                      value={money(a.price)}
                    />
                  ))}
                  <PriceRow
                    label="Subtotal"
                    value={money(order.subtotal)}
                    bold
                  />
                  <PriceRow
                    label="Buyer service fee"
                    value={money(order.buyerServiceFee)}
                  />
                  <PriceRow
                    label="Grand total (buyer paid)"
                    value={money(order.grandTotal)}
                    bold
                  />
                  <hr
                    style={{ border: "none", borderTop: "1px solid #eee" }}
                  />
                  {role === "seller" && (
                    <>
                      <PriceRow
                        label="Platform fee"
                        value={money(order.sellerPlatformFee)}
                      />
                      <PriceRow
                        label="Your earnings"
                        value={money(order.sellerEarnings)}
                        bold
                        highlight
                      />
                    </>
                  )}
                  <PriceRow
                    label="Payment method"
                    value={(order.paymentMethod || "card").toUpperCase()}
                  />
                </div>
              </section>

              {role === "seller" && serviceIdStr && (
                <p style={{ fontSize: "0.9rem", color: "#666" }}>
                  Deliver, remind, revision, and extension actions are on the{" "}
                  <Link href={`/service-dashboard/${serviceIdStr}/orders`}>
                    Service Order Manager
                  </Link>
                  .
                </p>
              )}

              {role === "client" && (
                <div className="order-actions" style={{ marginTop: 8 }}>
                  <Link href={dashboardUrl} className="btn-dashboard">
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.order-detail-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function PriceRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        fontSize: "0.9rem",
        fontWeight: bold ? 700 : 400,
        color: highlight ? "#d96464" : undefined,
      }}
    >
      <span style={{ color: bold || highlight ? undefined : "#666" }}>
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
