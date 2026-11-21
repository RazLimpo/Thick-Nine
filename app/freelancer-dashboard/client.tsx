// app/freelancer-dashboard/client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@/styles/pages/freelancer-dashboard.css";

type PanelId =
  | "overview-panel"
  | "jobs-panel"
  | "projects-panel"
  | "gigs-panel"
  | "earnings-panel"
  | "status-scale-panel"
  | "stats-insight-panel"
  | "quick-actions-panel"
  | "messages-panel";

type ServiceRow = {
  _id: string;
  title?: string;
  category?: string;
  status?: string;
  orders?: number;
  views?: number;
  rating?: number;
  createdAt?: string;
  price?: number;
};

type OrderRow = {
  _id: string;
  orderNumber?: string;
  status?: string;
  grandTotal?: number;
  sellerEarnings?: number;
  dueAt?: string | null;
  serviceTitle?: string;
  clientName?: string;
  createdAt?: string;
};

type JobRow = {
  _id: string;
  title?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  budget?: number;
  timelineDays?: number;
  skills?: string[] | string;
  publishedAt?: string;
  createdAt?: string;
  clientId?: { fullName?: string; displayName?: string };
};

type ActivityItem = {
  id: string;
  type: "success" | "rating" | "message" | "danger" | "info";
  title: string;
  text: string;
  time: string;
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function formatMoney(n: number): string {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function jobBudgetLabel(j: JobRow): string {
  const min = Number(j.budgetMin) || 0;
  const max = Number(j.budgetMax) || Number(j.budget) || min;
  if (!min && !max) return "Budget TBD";
  if (min && max && min !== max) return `${formatMoney(min)} – ${formatMoney(max)}`;
  return formatMoney(max || min);
}

function jobSkills(j: JobRow): string[] {
  if (Array.isArray(j.skills)) return j.skills.filter(Boolean).slice(0, 4);
  if (typeof j.skills === "string")
    return j.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  return [];
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

  
  function getClientInitials(name?: string): string { 
    if (!name) return "CL"; 
    return name 
    .trim() 
    .split(/\s+/) 
    .slice(0, 2) 
    .map((part) => part[0]?.toUpperCase() || "") 
    .join("") || "CL"; 
  }


  
  
function dueLabel(dueAt?: string | null): string {
  if (!dueAt) return "—";
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) return "—";
  const days = Math.ceil((due - Date.now()) / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function statusClass(status?: string): string {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "status-completed";
  if (s === "paused" || s === "draft") return "status-paused";
  if (s === "active") return "status-active";
  if (s.includes("overdue") || s === "cancelled" || s === "canceled")
    return "status-overdue";
  if (s === "in_escrow" || s === "revision_requested" || s === "pending")
    return "status-pending";
  return "status-pending";
}

function showToast(message: string, type: "info" | "success" | "error" = "info") {
  if (typeof document === "undefined") return;
  let root = document.getElementById("toast-container");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-container";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `toast${type === "error" ? " removed" : ""}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
        ? "fa-exclamation-triangle"
        : "fa-info-circle";
  el.innerHTML = `<i class="fas ${icon}"></i><span></span>`;
  const span = el.querySelector("span");
  if (span) span.textContent = message;
  root.appendChild(el);
  window.setTimeout(() => el.remove(), 3200);
}

const NAV: { id: PanelId; label: string; icon: string }[] = [
  { id: "overview-panel", label: "Dashboard Overview", icon: "fa-tachometer-alt" },
  { id: "jobs-panel", label: "Jobs For You", icon: "fa-search" },
  { id: "projects-panel", label: "Active Orders", icon: "fa-tasks" },
  { id: "gigs-panel", label: "My Services", icon: "fa-briefcase" },
  { id: "earnings-panel", label: "Earnings & Payments", icon: "fa-wallet" },
  { id: "status-scale-panel", label: "Status Scale", icon: "fa-medal" },
  { id: "stats-insight-panel", label: "Stats & Insight", icon: "fa-chart-area" },
  { id: "quick-actions-panel", label: "Quick Actions", icon: "fa-bolt" },
  { id: "messages-panel", label: "Messages", icon: "fa-envelope" },
];
  
  
  

export default function FreelancerDashboardClient() {
  const router = useRouter();
  const [panel, setPanel] = useState<PanelId>("overview-panel");
  const [loading, setLoading] = useState(true);
  const [jobsTab, setJobsTab] = useState<"recommended" | "saved">("recommended");
  const [openJobs, setOpenJobs] = useState<JobRow[]>([]);
  const [savedJobs, setSavedJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
    
    
    
    
  const savedJobIds = useMemo( 
    () => new Set(savedJobs.map((j) => j._id)), 
    [savedJobs] 
    );

const handleToggleSaveJob = async (job: JobRow) => { 
  const alreadySaved = savedJobIds.has(job._id); 
  // Optimistic UI update 
  if (alreadySaved) { 
    setSavedJobs((prev) => prev.filter((item) => item._id !== job._id)); 
    showToast("Removed from saved jobs", "info"); 
  } else { 
    setSavedJobs((prev) => [job, ...prev]); 
    showToast("Job saved to your favorites!", "success"); 
  }

try { 
  await fetch("/api/bookmarks", { 
    method: alreadySaved ? "DELETE" : "POST", 
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" }, 
    credentials: "include", 
    body: JSON.stringify({ itemType: "Job", itemId: job._id }), 
    
  }); 
} catch { 
  /* keep optimistic state or reload on next tab switch */ } 
};

const handleShareJob = async (job: JobRow) => { 
  const shareUrl = `${window.location.origin}/jobs/${job._id}`; 
  try { 
    await navigator.clipboard.writeText(shareUrl); 
    showToast("Job link copied to clipboard!", "success"); 
  } catch { 
    showToast("Could not copy link", "error"); 
  } 
};


    
    
    

  const [displayName, setDisplayName] = useState("Freelancer");
  const [avatar, setAvatar] = useState("/default-avatar.png");
  const [levelLabel, setLevelLabel] = useState("Level 1");
  const [profileId, setProfileId] = useState("");

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [userRole, setUserRole] = useState("freelancer");
  const [txFilter, setTxFilter] = useState("all");
  const [withdrawalHistory, setWithdrawalHistory] = useState<
    {
      id: string;
      date?: string;
      tid?: string;
      method?: string;
      amount: number;
      fee?: number;
      net?: number;
      status?: string;
    }[]
  >([]);
  const [sellerKpis, setSellerKpis] = useState({
    averageRating: 0,
    totalReviews: 0,
    responseRate: 100,
    responseTimeMin: 60,
    onTimeDelivery: 100,
    completedOrders: 0,
    level: "New Seller",
  });

  const activeServices = useMemo(
    () => services.filter((s) => String(s.status || "").toLowerCase() === "active"),
    [services]
  );
  const pausedServices = useMemo(
    () => services.filter((s) => String(s.status || "").toLowerCase() === "paused"),
    [services]
  );
  const activeOrders = useMemo(() => {
    const done = new Set(["completed", "cancelled", "canceled"]);
    return orders.filter((o) => !done.has(String(o.status || "").toLowerCase()));
  }, [orders]);

  const totalEarned = useMemo(() => {
    return orders
      .filter((o) => String(o.status || "").toLowerCase() === "completed")
      .reduce(
        (sum, o) => sum + Number(o.sellerEarnings || o.grandTotal || 0),
        0
      );
  }, [orders]);

  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.clientName) set.add(o.clientName);
    });
    return set.size;
  }, [orders]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("user");
          if (raw) {
            const u = JSON.parse(raw);
            setDisplayName(
              u.displayName || u.fullName || u.username || "Freelancer"
            );
            setAvatar(u.avatar || u.profilePic || "/default-avatar.png");
            setLevelLabel(u.level || u.sellerLevel || "Level 1");
            setProfileId(String(u.id || u._id || ""));
            const role = String(
              u.role || localStorage.getItem("userRole") || "freelancer"
            ).toLowerCase();
            setUserRole(
              role === "client" || role === "buyer"
                ? "client"
                : role === "affiliate"
                  ? "affiliate"
                  : role === "admin"
                    ? "admin"
                    : "freelancer"
            );
            setSellerKpis((prev) => ({
              ...prev,
              averageRating: Number(u.averageRating) || prev.averageRating,
              totalReviews: Number(u.totalReviews) || prev.totalReviews,
              responseRate:
                Number(u.metrics?.responseRate) ||
                Number(u.responseRate) ||
                prev.responseRate,
              responseTimeMin: Number(u.responseTime) || prev.responseTimeMin,
              onTimeDelivery:
                Number(u.metrics?.onTimeDelivery) || prev.onTimeDelivery,
              completedOrders:
                Number(u.completedOrders) || prev.completedOrders,
              level: String(u.level || prev.level),
            }));
            if (u.level) setLevelLabel(String(u.level));
          }
        } catch {
          /* ignore */
        }
      }

      const headers = getAuthHeaders();
      const [svcRes, ordRes, balRes, msgRes, analyticsRes] = await Promise.all([
        fetch("/api/services/my-services", {
          headers,
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/orders/mine?limit=100", {
          headers,
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/freelancer/withdrawals", {
          headers,
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
        fetch("/api/messages/unread-count", {
          headers,
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
        fetch("/api/freelancer/analytics?period=lifetime", {
          headers,
          credentials: "include",
          cache: "no-store",
        }).catch(() => null),
      ]);

      const svcData = await svcRes.json().catch(() => ({}));
      const ordData = await ordRes.json().catch(() => ({}));

      if (svcRes.ok) {
        const list = Array.isArray(svcData)
          ? svcData
          : Array.isArray(svcData.services)
            ? svcData.services
            : [];
        setServices(
          list.map((s: Record<string, unknown>) => ({
            _id: String(s._id || s.id || ""),
            title: String(s.title || "Untitled"),
            category: String(s.category || "—"),
            status: String(s.status || "draft"),
            orders: Number(s.orders || 0),
            views: Number(s.views || 0),
            rating: Number(s.rating || 0),
            createdAt: s.createdAt ? String(s.createdAt) : undefined,
            price: Number(s.price || 0),
          }))
        );
      }

      if (ordRes.ok) {
        const list = Array.isArray(ordData)
          ? ordData
          : Array.isArray(ordData.orders)
            ? ordData.orders
            : [];
        const mapped: OrderRow[] = list.map((o: Record<string, unknown>) => {
          const client =
            (o.clientId as { fullName?: string; displayName?: string }) || {};
          return {
            _id: String(o._id || o.id || ""),
            orderNumber: String(o.orderNumber || o._id || ""),
            status: String(o.status || "pending"),
            grandTotal: Number(o.grandTotal || o.subtotal || 0),
            sellerEarnings: Number(o.sellerEarnings || 0),
            dueAt: o.dueAt ? String(o.dueAt) : null,
            serviceTitle: String(
              (o.serviceId as { title?: string })?.title ||
                o.serviceTitle ||
                o.title ||
                "Service"
            ),
            clientName:
              client.displayName ||
              client.fullName ||
              String(o.clientName || "Client"),
            createdAt: o.createdAt ? String(o.createdAt) : undefined,
          };
        });
        setOrders(mapped);

        // Build recent activity from orders
        const items: ActivityItem[] = mapped.slice(0, 8).map((o) => {
          const st = String(o.status || "").toLowerCase();
          if (st === "completed") {
            return {
              id: o._id,
              type: "success" as const,
              title: "Order completed",
              text: `${formatMoney(o.sellerEarnings || o.grandTotal || 0)} · ${o.serviceTitle}`,
              time: relativeTime(o.createdAt),
            };
          }
          if (st === "revision_requested") {
            return {
              id: o._id,
              type: "danger" as const,
              title: "Revision requested",
              text: o.serviceTitle || "Order",
              time: relativeTime(o.createdAt),
            };
          }
          if (String(dueLabel(o.dueAt)).toLowerCase() === "overdue") {
            return {
              id: o._id,
              type: "danger" as const,
              title: "Overdue order",
              text: o.serviceTitle || "Order",
              time: relativeTime(o.dueAt || o.createdAt),
            };
          }
          return {
            id: o._id,
            type: "info" as const,
            title: `Order ${st.replace(/_/g, " ")}`,
            text: `${o.clientName} · ${o.serviceTitle}`,
            time: relativeTime(o.createdAt),
          };
        });
        setActivity(items);
      }

      if (balRes && balRes.ok) {
        const bal = await balRes.json().catch(() => ({}));
        const balances = bal.balances || {};
        setAvailableBalance(
          Number(
            balances.available ??
              bal.available ??
              bal.availableBalance ??
              bal.sellerAvailableBalance ??
              0
          )
        );
        setPendingBalance(
          Number(
            balances.pendingClearance ??
              bal.pending ??
              bal.pendingBalance ??
              0
          )
        );
        const hist = Array.isArray(bal.history) ? bal.history : [];
        setWithdrawalHistory(
          hist.map((h: Record<string, unknown>) => ({
            id: String(h.id || h._id || ""),
            date: h.date ? String(h.date) : undefined,
            tid: h.tid ? String(h.tid) : undefined,
            method: h.method ? String(h.method) : undefined,
            amount: Number(h.amount) || 0,
            fee: Number(h.fee) || 0,
            net: Number(h.net) || Number(h.amount) || 0,
            status: h.status ? String(h.status) : "pending",
          }))
        );
      }

      if (analyticsRes && analyticsRes.ok) {
        const an = await analyticsRes.json().catch(() => ({}));
        const ov = an.overview || {};
        setSellerKpis((prev) => ({
          ...prev,
          averageRating:
            Number(ov.averageRating) ||
            Number(an.ratings?.overall) ||
            prev.averageRating,
          responseRate:
            Number(ov.responseRate) != null && !Number.isNaN(Number(ov.responseRate))
              ? Number(ov.responseRate)
              : prev.responseRate,
          completedOrders:
            Number(ov.ordersCompleted) || prev.completedOrders,
          onTimeDelivery:
            ov.lateDeliveryRate != null
              ? Math.max(0, 100 - Number(ov.lateDeliveryRate))
              : prev.onTimeDelivery,
          level: String(an.level || prev.level),
        }));
        if (an.level) setLevelLabel(String(an.level));
      }

      if (msgRes && msgRes.ok) {
        const m = await msgRes.json().catch(() => ({}));
        setUnreadMessages(Number(m.unread || m.count || 0));
      }
    } catch {
      showToast("Could not load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, []);


  const loadOpenJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch("/api/jobs?limit=8", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list = Array.isArray(data.jobs)
          ? data.jobs
          : Array.isArray(data)
            ? data
            : [];
        setOpenJobs(
          list.map((j: JobRow & { id?: string }) => ({
            ...j,
            _id: String(j._id || j.id || ""),
          })).filter((j: JobRow) => j._id)
        );
      }
    } catch {
      /* keep empty */
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadSavedJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/bookmarks?itemType=Job", {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSavedJobs([]);
        return;
      }
      const rows = Array.isArray(data.bookmarks)
        ? data.bookmarks
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
      const jobs: JobRow[] = rows
        .map((b: { item?: JobRow; job?: JobRow; itemId?: string; _id?: string }) => {
          const j = b.item || b.job;
          if (j && (j._id || (j as { id?: string }).id)) {
            return {
              ...j,
              _id: String(j._id || (j as { id?: string }).id),
            } as JobRow;
          }
          return null;
        })
        .filter(Boolean) as JobRow[];
      setSavedJobs(jobs);
    } catch {
      setSavedJobs([]);
    }
  }, []);

  useEffect(() => {
    if (panel !== "jobs-panel") return;
    loadOpenJobs();
    loadSavedJobs();
  }, [panel, loadOpenJobs, loadSavedJobs]);


  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/?auth=login");
      return;
    }
    load();
  }, [load, router]);

  const profileHref = profileId
    ? `/freelancer-profile?id=${encodeURIComponent(profileId)}`
    : "/freelancer-profile";

  /* 6-month trend from completed orders (real data when available) */
  const monthlyTrend = useMemo(() => {
    const months: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString(undefined, { month: "short" });
      months.push({ key, label, value: 0 });
    }
    const map = new Map(months.map((m) => [m.key, m]));
    orders.forEach((o) => {
      if (String(o.status || "").toLowerCase() !== "completed") return;
      if (!o.createdAt) return;
      const d = new Date(o.createdAt);
      if (!Number.isFinite(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = map.get(key);
      if (row) {
        row.value += Number(o.sellerEarnings || o.grandTotal || 0);
      }
    });
    return months;
  }, [orders]);

  const trendMax = useMemo(
    () => Math.max(1, ...monthlyTrend.map((m) => m.value)),
    [monthlyTrend]
  );

  const topService = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      if (String(o.status || "").toLowerCase() !== "completed") return;
      const title = o.serviceTitle || "Service";
      map.set(title, (map.get(title) || 0) + Number(o.sellerEarnings || o.grandTotal || 0));
    });
    let best = { title: "—", amount: 0 };
    map.forEach((amount, title) => {
      if (amount > best.amount) best = { title, amount };
    });
    return best;
  }, [orders]);

  const monthlyDelta = useMemo(() => {
    if (monthlyTrend.length < 2) return null;
    const cur = monthlyTrend[monthlyTrend.length - 1].value;
    const prev = monthlyTrend[monthlyTrend.length - 2].value;
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  }, [monthlyTrend]);

  type LedgerRow = {
    key: string;
    kind: "earning" | "withdrawal";
    date?: string;
    reference: string;
    label: string;
    typeLabel: string;
    amount: number;
    amountSigned: number;
    status?: string;
  };

  const ledgerRows = useMemo((): LedgerRow[] => {
    const earn: LedgerRow[] = orders.map((o) => ({
      key: `o-${o._id}`,
      kind: "earning" as const,
      date: o.createdAt,
      reference: o.orderNumber || o._id.slice(-6),
      label: o.serviceTitle || "Service",
      typeLabel: "Earning",
      amount: Number(o.sellerEarnings || o.grandTotal || 0),
      amountSigned: Number(o.sellerEarnings || o.grandTotal || 0),
      status: o.status,
    }));
    const wd: LedgerRow[] = withdrawalHistory.map((h) => ({
      key: `w-${h.id}`,
      kind: "withdrawal" as const,
      date: h.date,
      reference: h.tid || h.id.slice(-6),
      label: `Withdrawal (${h.method || "payout"})`,
      typeLabel: "Withdrawal",
      amount: Number(h.amount) || 0,
      amountSigned: -(Number(h.net ?? h.amount) || 0),
      status: h.status,
    }));
    return [...earn, ...wd].sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }, [orders, withdrawalHistory]);

  const filteredTx = useMemo(() => {
    if (txFilter === "earning") return ledgerRows.filter((r) => r.kind === "earning");
    if (txFilter === "withdrawal")
      return ledgerRows.filter((r) => r.kind === "withdrawal");
    return ledgerRows;
  }, [ledgerRows, txFilter]);

  /** Level ladder — mirrors User.level enum + practical thresholds */
  const levelProgress = useMemo(() => {
    const completed =
      sellerKpis.completedOrders ||
      orders.filter((o) => String(o.status).toLowerCase() === "completed").length;
    const earned = totalEarned;
    const rating = sellerKpis.averageRating || 0;
    const response = sellerKpis.responseRate || 0;
    const current = String(sellerKpis.level || levelLabel || "New Seller");

    const tiers = [
      {
        id: "New Seller",
        next: "Level 1",
        rules: [
          { key: "orders", label: "Completed orders", current: completed, target: 5 },
          { key: "earn", label: "Lifetime earnings", current: earned, target: 100, money: true },
        ],
      },
      {
        id: "Level 1",
        next: "Level 2",
        rules: [
          { key: "orders", label: "Completed orders", current: completed, target: 25 },
          { key: "earn", label: "Lifetime earnings", current: earned, target: 1000, money: true },
          { key: "rating", label: "Average rating", current: rating, target: 4.5 },
          { key: "response", label: "Response rate %", current: response, target: 90 },
        ],
      },
      {
        id: "Level 2",
        next: "Top Rated",
        rules: [
          { key: "orders", label: "Completed orders", current: completed, target: 50 },
          { key: "rating", label: "Average rating", current: rating, target: 4.8 },
          { key: "response", label: "Response rate %", current: response, target: 95 },
          {
            key: "ontime",
            label: "On-time delivery %",
            current: sellerKpis.onTimeDelivery,
            target: 90,
          },
        ],
      },
      {
        id: "Top Rated",
        next: null as string | null,
        rules: [
          { key: "orders", label: "Completed orders", current: completed, target: 50 },
          { key: "rating", label: "Average rating", current: rating, target: 4.8 },
        ],
      },
    ];

    const idx = Math.max(
      0,
      tiers.findIndex((t) => t.id.toLowerCase() === current.toLowerCase())
    );
    const tier = tiers[idx] || tiers[0];
    return { current: tier.id, next: tier.next, rules: tier.rules, idx };
  }, [sellerKpis, orders, totalEarned, levelLabel]);

  const roleRingClass =
    userRole === "client"
      ? "role-ring-client"
      : userRole === "affiliate"
        ? "role-ring-affiliate"
        : userRole === "admin"
          ? "role-ring-admin"
          : "role-ring-freelancer";

  return (
    <main className="dashboard-layout fd-main">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="profile-snippet">
          <div className={`fd-avatar-ring role-ring ${roleRingClass}`}>
            <Image
              src={avatar}
              alt={displayName}
              width={80}
              height={80}
              className="avatar"
            />
          </div>
          <h3>Hello, {displayName}</h3>
          <p>{levelLabel}</p>
          <Link href={profileHref} className="btn-secondary full-width-btn">
            View Profile
          </Link>
        </div>

        <nav className="sidebar-nav" aria-label="Freelancer dashboard">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${panel === item.id ? " active" : ""}`}
              onClick={() => setPanel(item.id)}
            >
              <span className="icon">
                <i className={`fas ${item.icon}`} />
              </span>
              {item.label}
              {item.id === "messages-panel" && unreadMessages > 0 ? (
                <span className="nav-badge">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              ) : null}
            </button>
          ))}
          <Link href="/freelancer-partners" className="nav-item">
            <span className="icon">
              <i className="fas fa-handshake" />
            </span>
            Marketing Partners
          </Link>
          <Link href="/freelancer-settings" className="nav-item">
            <span className="icon">
              <i className="fas fa-cog" />
            </span>
            Settings
          </Link>
        </nav>
      </aside>

      <section className="dashboard-content dashboard-content-wrapper">
        {loading ? (
          <div className="fd-loading">
            <i className="fas fa-spinner fa-spin" /> Loading dashboard…
          </div>
        ) : null}

        {/* Overview */}
        {panel === "overview-panel" && (
          <section id="overview-panel" className="content-panel active">
            <h1>
              <i className="fas fa-tachometer-alt" /> Dashboard Overview
            </h1>
            <p className="greeting-text">
              Welcome back. Here is a snapshot of your marketplace activity.
            </p>

            <div className="kpi-grid-styled">
              <div className="kpi-card-styled kpi-clients">
                <div className="kpi-inner-content">
                  <h2>{uniqueClients}</h2>
                  <p>
                    <i className="fas fa-users" /> Total Clients
                  </p>
                </div>
              </div>
              <div className="kpi-card-styled kpi-services">
                <div className="kpi-inner-content">
                  <h2>{services.length}</h2>
                  <p>
                    <i className="fas fa-briefcase" /> Total Services
                  </p>
                </div>
              </div>
              <div className="kpi-card-styled kpi-earned">
                <div className="kpi-inner-content">
                  <h2>{formatMoney(totalEarned)}</h2>
                  <p>
                    <i className="fas fa-wallet" /> Total Earned
                  </p>
                </div>
              </div>
              <div className="kpi-card-styled kpi-score">
                <div className="kpi-inner-content">
                  <h2>{activeOrders.length}</h2>
                  <p>
                    <i className="fas fa-tasks" /> Active Orders
                  </p>
                </div>
              </div>
            </div>

            {/* Main trend graph — real completed-earnings by month */}
            <div className="main-graph-container">
              <div className="graph-keys">
                <div className="graph-key-item">
                  <span className="graph-key-color key-clients" /> Total Clients
                </div>
                <div className="graph-key-item">
                  <span className="graph-key-color key-services" /> Total Services
                </div>
                <div className="graph-key-item">
                  <span className="graph-key-color key-earned" /> Total Earned
                </div>
                <div className="graph-key-item">
                  <span className="graph-key-color key-score" /> Active Orders
                </div>
              </div>
              <div className="fd-trend-chart" aria-label="Earnings trend last 6 months">
                {monthlyTrend.map((m) => {
                  const h = Math.max(4, Math.round((m.value / trendMax) * 100));
                  return (
                    <div key={m.key} className="fd-trend-col">
                      <div className="fd-trend-bar-wrap" title={formatMoney(m.value)}>
                        <div
                          className="fd-trend-bar"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                      <span className="fd-trend-label">{m.label}</span>
                      <span className="fd-trend-value">
                        {m.value > 0 ? formatMoney(m.value) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="fd-trend-caption">
                Completed earnings by month (last 6 months). Empty bars mean no
                completed orders in that month yet.
              </p>
            </div>

            <div className="content-card activity-section glass-activity">
              <h2>
                <i className="fas fa-history" /> Recent Activity
              </h2>
              {activity.length === 0 ? (
                <p className="fd-empty">No recent activity yet.</p>
              ) : (
                <ul className="recent-activity-feed">
                  {activity.map((a) => (
                    <li key={a.id} className="activity-item">
                      <div className={`activity-icon icon-${a.type}`}>
                        <i
                          className={`fas ${
                            a.type === "success"
                              ? "fa-check-circle"
                              : a.type === "rating"
                                ? "fa-star"
                                : a.type === "message"
                                  ? "fa-envelope"
                                  : a.type === "danger"
                                    ? "fa-bell"
                                    : "fa-info-circle"
                          }`}
                        />
                      </div>
                      <div className="activity-content">
                        <span className="activity-title">{a.title}</span>
                        <p className="activity-text">{a.text}</p>
                        <span className="activity-time">{a.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Jobs */}
        {panel === "jobs-panel" && (
          <section id="jobs-panel" className="content-panel active">
            <div className="section-header-tabs" style={{ alignItems: "center" }}>
              <h1 style={{ margin: 0 }}>
                <i className="fas fa-search" /> Jobs For You
              </h1>
              <Link href="/jobs" className="btn-primary" style={{ textDecoration: "none" }}>
                <i className="fas fa-external-link-alt" /> Browse all jobs
              </Link>
            </div>
            <div className="section-header-tabs">
              <div className="tab-controls">
                <button
                  type="button"
                  className={`tab-btn${jobsTab === "recommended" ? " active" : ""}`}
                  onClick={() => setJobsTab("recommended")}
                >
                  Open Jobs
                </button>
                <button
                  type="button"
                  className={`tab-btn${jobsTab === "saved" ? " active" : ""}`}
                  onClick={() => setJobsTab("saved")}
                >
                  Saved Jobs
                </button>
              </div>
            </div>
            {jobsTab === "recommended" ? (
              <div className="recommended-jobs-section activity-section">
                <h2>Latest Open Jobs</h2>
                <p className="section-subtitle">
                  From the public board. Skill-based matching can refine this
                  later — keep skills updated in{" "}
                  <Link href="/freelancer-settings">Freelancer Settings</Link>.
                </p>
                {jobsLoading ? (
                  <div className="content-card">
                    <p>
                      <i className="fas fa-spinner fa-spin" /> Loading jobs…
                    </p>
                  </div>
                ) : openJobs.length === 0 ? (
                  <div className="content-card">
                    <p className="no-jobs-msg">
                      No open jobs right now.{" "}
                      <Link href="/jobs">Check the jobs board</Link> later.
                    </p>
                  </div>
                ) : (
                  <div className="fd-jobs-grid">
                    {openJobs.map((job) => {
                      const clientName =
                        job.clientId?.displayName ||
                        job.clientId?.fullName ||
                        "Client";
                      const isSaved = savedJobIds.has(job._id);
                      const timelineStr = job.timelineDays
                        ? `${job.timelineDays} days`
                        : "Flexible";
                      const postedStr = relativeTime(
                        job.publishedAt || job.createdAt
                      );

                      return (
                        <article key={job._id} className="job-card-c">
                          {/* Left Client Column */}
                          <div className="job-card-c-left">
                            <div className="jc-avatar-wrap jc-role-ring">
                              <div className="jc-avatar-fallback">
                                {getClientInitials(clientName)}
                              </div>
                              <span className="jc-presence" title="Online" />
                            </div>
                            <div className="jc-client-meta">
                              <div className="jc-client-name">{clientName}</div>
                              <div className="jc-online-status">● Online</div>
                            </div>
                          </div>

                          {/* Right Job Details Column */}
                          <div className="job-card-c-right">
                            {/* Top Row: Label + Save & Share Buttons */}
                            <div className="jc-top-bar">
                              <span className="jc-looking">Looking for:</span>
                              <div className="jc-actions">
                                <button
                                  type="button"
                                  className={`jc-icon-btn${isSaved ? " saved" : ""}`}
                                  data-tooltip={isSaved ? "Saved" : "Save job"}
                                  aria-label={isSaved ? "Saved" : "Save job"}
                                  onClick={() => handleToggleSaveJob(job)}
                                >
                                  <i
                                    className={`${isSaved ? "fas" : "far"} fa-heart`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="jc-icon-btn"
                                  data-tooltip="Share job"
                                  aria-label="Share job"
                                  onClick={() => handleShareJob(job)}
                                >
                                  <i className="fas fa-share-nodes" />
                                </button>
                              </div>
                            </div>

                            {/* Job Title */}
                            <Link
                              href={`/jobs/${job._id}`}
                              className="jc-title"
                            >
                              {job.title || "Open role"}
                            </Link>

                            {/* Price (Left) & Days/Posted (Far Right) on the same line */}
                            <div className="jc-price-meta-row">
                              <span className="jc-budget">
                                {jobBudgetLabel(job)}
                              </span>
                              <span className="jc-meta">
                                {timelineStr}
                                {postedStr ? ` · ${postedStr}` : ""}
                              </span>
                            </div>

                            {/* Footer Row: Skills (Left) & Details Button (Right) */}
                            <div className="jc-right-foot">
                              <div className="jc-skills">
                                {jobSkills(job).map((skill) => (
                                  <span key={skill} className="jc-skill">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              <Link
                                href={`/jobs/${job._id}`}
                                className="jc-btn-details"
                              >
                                Details <i className="fas fa-chevron-right" />
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <Link href="/jobs" className="btn-primary">
                    View full jobs board →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="recommended-jobs-section activity-section">
                <h2>Saved jobs</h2>
                {savedJobs.length === 0 ? (
                  <div className="content-card">
                    <p className="no-jobs-msg">
                      You have not saved any jobs yet. Open the{" "}
                      <Link href="/jobs">jobs board</Link> and use Save on a job
                      detail page.
                    </p>
                  </div>
                ) : (
                  <div className="fd-jobs-grid">
                    {savedJobs.map((job) => {
                      const clientName =
                        job.clientId?.displayName ||
                        job.clientId?.fullName ||
                        "Client";
                      const isSaved = savedJobIds.has(job._id);
                      const timelineStr = job.timelineDays
                        ? `${job.timelineDays} days`
                        : "Flexible";
                      const postedStr = relativeTime(
                        job.publishedAt || job.createdAt
                      );

                      return (
                        <article key={job._id} className="job-card-c">
                          {/* Left Client Column */}
                          <div className="job-card-c-left">
                            <div className="jc-avatar-wrap jc-role-ring">
                              <div className="jc-avatar-fallback">
                                {getClientInitials(clientName)}
                              </div>
                              <span className="jc-presence" title="Online" />
                            </div>
                            <div className="jc-client-meta">
                              <div className="jc-client-name">{clientName}</div>
                              <div className="jc-online-status">● Online</div>
                            </div>
                          </div>

                          {/* Right Job Details Column */}
                          <div className="job-card-c-right">
                            {/* Top Row: Label + Save & Share Buttons */}
                            <div className="jc-top-bar">
                              <span className="jc-looking">Looking for:</span>
                              <div className="jc-actions">
                                <button
                                  type="button"
                                  className={`jc-icon-btn${isSaved ? " saved" : ""}`}
                                  data-tooltip={isSaved ? "Saved" : "Save job"}
                                  aria-label={isSaved ? "Saved" : "Save job"}
                                  onClick={() => handleToggleSaveJob(job)}
                                >
                                  <i
                                    className={`${isSaved ? "fas" : "far"} fa-heart`}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="jc-icon-btn"
                                  data-tooltip="Share job"
                                  aria-label="Share job"
                                  onClick={() => handleShareJob(job)}
                                >
                                  <i className="fas fa-share-nodes" />
                                </button>
                              </div>
                            </div>

                            {/* Job Title */}
                            <Link
                              href={`/jobs/${job._id}`}
                              className="jc-title"
                            >
                              {job.title || "Saved job"}
                            </Link>

                            {/* Price (Left) & Days/Posted (Far Right) on the same line */}
                            <div className="jc-price-meta-row">
                              <span className="jc-budget">
                                {jobBudgetLabel(job)}
                              </span>
                              <span className="jc-meta">
                                {timelineStr}
                                {postedStr ? ` · ${postedStr}` : ""}
                              </span>
                            </div>

                            {/* Footer Row: Skills (Left) & Details Button (Right) */}
                            <div className="jc-right-foot">
                              <div className="jc-skills">
                                {jobSkills(job).map((skill) => (
                                  <span key={skill} className="jc-skill">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              <Link
                                href={`/jobs/${job._id}`}
                                className="jc-btn-details"
                              >
                                Details <i className="fas fa-chevron-right" />
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Active orders */}
        {panel === "projects-panel" && (
          <section id="projects-panel" className="content-panel active">
            <h1>
              <i className="fas fa-tasks" /> Active Orders
            </h1>
            <p className="section-subheading">
              View and manage orders that still need your attention.
            </p>
            <div className="activity-section">
              <h2>Current orders</h2>
              <div className="responsive-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Client</th>
                      <th>Service</th>
                      <th>Due</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No active orders right now.</td>
                      </tr>
                    ) : (
                      activeOrders.slice(0, 10).map((o) => (
                        <tr key={o._id}>
                          <td data-label="Order">
                            {o.orderNumber || o._id.slice(-6)}
                          </td>
                          <td data-label="Client">{o.clientName}</td>
                          <td data-label="Service">{o.serviceTitle}</td>
                          <td data-label="Due">{dueLabel(o.dueAt)}</td>
                          <td data-label="Price">
                            {formatMoney(o.grandTotal || 0)}
                          </td>
                          <td data-label="Status">
                            <span
                              className={`status-badge ${statusClass(o.status)}`}
                            >
                              {String(o.status || "").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td data-label="Action">
                            <Link
                              href={`/orders/${o._id}`}
                              className="btn-action"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Link href="/freelancer-orders" className="btn-primary add-gig-btn">
                Manage all orders
              </Link>
              <Link
                href="/freelancer-orders-history"
                className="btn-primary add-gig-btn"
              >
                Order history
              </Link>
            </div>
          </section>
        )}

        {/* My Services */}
        {panel === "gigs-panel" && (
          <section id="gigs-panel" className="content-panel active">
            <h1>
              <i className="fas fa-briefcase" /> My Services
            </h1>
            <div className="content-card fd-services-card">
              <div className="dashboard-header fd-services-header">
                <h2>
                  Your service listings ({services.length})
                </h2>
                <Link href="/post-service" className="btn-primary fd-create-service-btn">
                  + Create new service
                </Link>
              </div>

              <div className="summary-cards summary-cards-compact">
                <div className="summary-card card-1">
                  <div className="value">{activeServices.length}</div>
                  <div className="label">Active</div>
                </div>
                <div className="summary-card card-2">
                  <div className="value">{pausedServices.length}</div>
                  <div className="label">Paused</div>
                </div>
                <div className="summary-card card-3">
                  <div className="value">
                    {services.reduce((n, s) => n + (s.views || 0), 0)}
                  </div>
                  <div className="label">Impressions</div>
                </div>
                <div className="summary-card card-4">
                  <div className="value">{formatMoney(availableBalance)}</div>
                  <div className="label">Available</div>
                </div>
              </div>

              <div className="gig-table-wrapper">
                <table className="gig-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Orders</th>
                      <th>Views</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          No services yet.{" "}
                          <Link href="/post-service">Create your first service</Link>
                        </td>
                      </tr>
                    ) : (
                      services.slice(0, 12).map((s) => (
                        <tr key={s._id}>
                          <td>
                            <Link
                              href={`/services/details/${s._id}`}
                              className="gig-title-link"
                            >
                              {s.title}
                            </Link>
                          </td>
                          <td>{s.category}</td>
                          <td>{s.orders ?? 0}</td>
                          <td>{s.views ?? 0}</td>
                          <td>
                            <span
                              className={`status-badge ${statusClass(s.status)}`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td>
                            <div className="action-group">
                              <Link
                                href={`/service-dashboard/${s._id}`}
                                className="action-btn btn-manage"
                                title="Service dashboard"
                              >
                                <i className="fas fa-chart-line" />
                              </Link>
                              <Link
                                href={`/post-service?draftId=${s._id}`}
                                className="action-btn btn-edit"
                                title="Edit"
                              >
                                <i className="fas fa-edit" />
                              </Link>
                              <Link
                                href={`/services/details/${s._id}`}
                                className="action-btn btn-manage"
                                title="View public"
                              >
                                <i className="fas fa-eye" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Link href="/service-management" className="btn btn-primary">
                Open service management
              </Link>
            </div>
          </section>
        )}

        {/* Earnings */}
        {panel === "earnings-panel" && (
          <section id="earnings-panel" className="content-panel active">
            <h1>
              <i className="fas fa-wallet" /> Earnings &amp; Payments
            </h1>
            <div className="content-card earnings-overview">
              <h2>Earnings overview</h2>
              <div className="kpi-row earnings-kpi-row">
                <div className="kpi-card available">
                  <div className="kpi-label">Available balance</div>
                  <div className="kpi-value">{formatMoney(availableBalance)}</div>
                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill bar-available" style={{ width: "100%" }} />
                  </div>
                </div>
                <div className="kpi-card pending">
                  <div className="kpi-label">Pending earnings</div>
                  <div className="kpi-value">{formatMoney(pendingBalance)}</div>
                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill bar-pending" style={{ width: "100%" }} />
                  </div>
                </div>
                <div className="kpi-card withdrawn">
                  <div className="kpi-label">Total earnings</div>
                  <div className="kpi-value">{formatMoney(totalEarned)}</div>
                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill bar-total" style={{ width: "100%" }} />
                  </div>
                </div>
                <div className="kpi-card withdrawn-amt">
                  <div className="kpi-label">Available to withdraw</div>
                  <div className="kpi-value">{formatMoney(availableBalance)}</div>
                  <div className="kpi-bar-track">
                    <div className="kpi-bar-fill bar-withdrawn" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
              <Link href="/freelancer-withdrawals" className="btn btn-primary mt-15 fd-withdraw-btn">
                <i className="fas fa-arrow-circle-up" /> Withdraw funds
              </Link>
            </div>

            <div className="content-card financial-insights">
              <h2>Earnings breakdown &amp; insights</h2>
              <div className="chart-controls">
                <span className="text-muted">Showing last 6 months of completed earnings</span>
              </div>
              <div className="chart-container">
                <div className="fd-trend-chart fd-trend-chart--compact" aria-label="Monthly earnings">
                  {monthlyTrend.map((m) => {
                    const h = Math.max(4, Math.round((m.value / trendMax) * 100));
                    return (
                      <div key={`earn-${m.key}`} className="fd-trend-col">
                        <div className="fd-trend-bar-wrap" title={formatMoney(m.value)}>
                          <div className="fd-trend-bar fd-trend-bar--earn" style={{ height: `${h}%` }} />
                        </div>
                        <span className="fd-trend-label">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="insight-summary">
                  <p>
                    <strong>
                      <i className="fas fa-chart-line" /> Monthly summary:
                    </strong>{" "}
                    {monthlyDelta == null
                      ? "Not enough months of data yet."
                      : monthlyDelta >= 0
                        ? `Current month is ${monthlyDelta}% higher than last month.`
                        : `Current month is ${Math.abs(monthlyDelta)}% lower than last month.`}
                  </p>
                  <p>
                    <strong>
                      <i className="fas fa-medal" /> Top earning service:
                    </strong>{" "}
                    {topService.amount > 0
                      ? `"${topService.title}" (${formatMoney(topService.amount)})`
                      : "No completed earnings yet."}
                  </p>
                </div>
              </div>
            </div>

            <div className="activity-section">
              <h2>Recent transactions</h2>
              <div className="transaction-controls">
                <select
                  id="transaction-filter"
                  className="form-control-sm"
                  value={txFilter}
                  onChange={(e) => setTxFilter(e.target.value)}
                >
                  <option value="all">All types</option>
                  <option value="earning">Earnings</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>
              </div>
              <div className="responsive-table-container table-scroll-fixed">
                <table className="dashboard-table earnings-table-mobile">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Service / Project</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          {txFilter === "withdrawal"
                            ? "No withdrawals yet. Request a payout when balance is ready."
                            : "No transactions to show yet."}
                        </td>
                      </tr>
                    ) : (
                      filteredTx.slice(0, 15).map((row) => (
                        <tr key={row.key}>
                          <td data-label="Date">
                            {row.date
                              ? new Date(row.date).toLocaleDateString()
                              : "—"}
                          </td>
                          <td data-label="Reference">{row.reference}</td>
                          <td data-label="Service">{row.label}</td>
                          <td data-label="Type">{row.typeLabel}</td>
                          <td data-label="Amount">
                            {row.amountSigned < 0 ? "-" : ""}
                            {formatMoney(Math.abs(row.amountSigned))}
                          </td>
                          <td data-label="Status">
                            <span className={`status-badge ${statusClass(row.status)}`}>
                              {String(row.status || "").replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Link
                href="/freelancer-orders-history"
                className="btn btn-secondary mt-10"
                style={{ display: "block", textAlign: "center" }}
              >
                View full history
              </Link>
            </div>

            <div className="content-card financial-sidebar-card">
              <div className="financial-section">
                <h3>
                  <i className="fas fa-sliders-h" /> Fees &amp; settings
                </h3>
                <ul className="info-list">
                  <li>
                    <span className="list-icon">
                      <i className="fas fa-percent" />
                    </span>
                    <div className="list-text">
                      <span className="label-text">Platform fee</span>
                      <p className="value-text">15% on project earnings</p>
                    </div>
                  </li>
                  <li>
                    <Link href="/freelancer-settings#payout-panel" className="info-link">
                      <span className="list-icon">
                        <i className="fas fa-university" />
                      </span>
                      <span>Payout details</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/freelancer-analytics" className="info-link">
                      <span className="list-icon">
                        <i className="fas fa-chart-line" />
                      </span>
                      <span>Full analytics</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Status scale */}
        {panel === "status-scale-panel" && (
          <section id="status-scale-panel" className="content-panel active">
            <h1>
              <i className="fas fa-medal" /> Status Scale
            </h1>
            <p className="section-subheading">
              Track progress toward the next freelancer level (
              New Seller → Level 1 → Level 2 → Top Rated).
            </p>
            <div className="level-showcase">
              <div className="level-header-card">
                <div className="current-level-orb">
                  <span className="orb-label">Current</span>
                  <span className="level-number">{levelProgress.idx + 1}</span>
                </div>
                <div className="level-path-info">
                  <h2>
                    {levelProgress.next ? (
                      <>
                        Next milestone:{" "}
                        <span className="highlight">{levelProgress.next}</span>
                      </>
                    ) : (
                      <>You are at the top tier</>
                    )}
                  </h2>
                  <p>
                    Current level: <strong>{levelProgress.current}</strong>.
                    Complete the requirements below to advance. Ratings and
                    response metrics come from your profile and completed orders.
                  </p>
                </div>
                <div
                  className={`next-level-orb${levelProgress.next ? " locked" : ""}`}
                >
                  {levelProgress.next ? (
                    <>
                      <i className="fas fa-lock" />
                      <span className="level-number">{levelProgress.idx + 2}</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trophy" />
                      <span className="level-number">★</span>
                    </>
                  )}
                </div>
              </div>

              <div className="metrics-grid">
                {levelProgress.rules.map((rule) => {
                  const pct = Math.min(
                    100,
                    Math.round((Number(rule.current) / Math.max(rule.target, 0.0001)) * 100)
                  );
                  const displayCurrent =
                    "money" in rule && rule.money
                      ? formatMoney(Number(rule.current))
                      : rule.key === "rating"
                        ? Number(rule.current).toFixed(1)
                        : String(Math.round(Number(rule.current) * 10) / 10);
                  const displayTarget =
                    "money" in rule && rule.money
                      ? formatMoney(rule.target)
                      : String(rule.target);
                  return (
                    <div className="metric-card" key={rule.key}>
                      <div className="metric-icon">
                        <i
                          className={`fas ${
                            rule.key === "orders"
                              ? "fa-briefcase"
                              : rule.key === "earn"
                                ? "fa-dollar-sign"
                                : rule.key === "rating"
                                  ? "fa-star"
                                  : rule.key === "response"
                                    ? "fa-bolt"
                                    : "fa-clock"
                          }`}
                        />
                      </div>
                      <div className="metric-details">
                        <div className="metric-top">
                          <span className="metric-title">{rule.label}</span>
                          <span className="metric-stat">
                            {displayCurrent} / {displayTarget}
                          </span>
                        </div>
                        <div
                          className={`modern-progress-track${pct < 70 ? " warning" : ""}`}
                        >
                          <div
                            className="modern-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="metric-hint">
                          {pct >= 100
                            ? "Requirement met"
                            : `${Math.max(0, Math.round((rule.target - Number(rule.current)) * 10) / 10)} to go`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="content-card mt-20">
                <h3>Live reputation</h3>
                <ul className="insight-list">
                  <li>
                    <span className="icon-label">
                      <i className="fas fa-star" /> Average rating
                    </span>
                    <span className="score">
                      {sellerKpis.averageRating
                        ? `${Number(sellerKpis.averageRating).toFixed(1)} / 5`
                        : "—"}
                      {sellerKpis.totalReviews
                        ? ` (${sellerKpis.totalReviews} reviews)`
                        : ""}
                    </span>
                  </li>
                  <li>
                    <span className="icon-label">
                      <i className="fas fa-reply" /> Response rate
                    </span>
                    <span className="score">{sellerKpis.responseRate}%</span>
                  </li>
                  <li>
                    <span className="icon-label">
                      <i className="fas fa-hourglass-half" /> Avg response time
                    </span>
                    <span className="score">
                      {sellerKpis.responseTimeMin >= 60
                        ? `${(sellerKpis.responseTimeMin / 60).toFixed(1)} hrs`
                        : `${sellerKpis.responseTimeMin} min`}
                    </span>
                  </li>
                  <li>
                    <span className="icon-label">
                      <i className="fas fa-truck" /> On-time delivery
                    </span>
                    <span className="score">{sellerKpis.onTimeDelivery}%</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Stats{/* Stats — matches original layout; values from live orders/services */}
        {panel === "stats-insight-panel" && (
          <section id="stats-insight-panel" className="content-panel active">
            <h1>
              <i className="fas fa-chart-area" /> Stats &amp; Insight
            </h1>
            <p className="section-subheading">
              A snapshot of your key performance metrics. Dive deeper for full
              reports.
            </p>

            {(() => {
              const completed = orders.filter(
                (o) => String(o.status).toLowerCase() === "completed"
              );
              const completedCount = completed.length;
              const totalOrders = orders.length;
              const conversion =
                totalOrders > 0
                  ? Math.round((completedCount / totalOrders) * 1000) / 10
                  : 0;
              const clientNames = new Set(
                orders.map((o) => o.clientName).filter(Boolean)
              );
              const repeatClients = (() => {
                const counts = new Map<string, number>();
                orders.forEach((o) => {
                  if (!o.clientName) return;
                  counts.set(o.clientName, (counts.get(o.clientName) || 0) + 1);
                });
                let repeats = 0;
                counts.forEach((n) => {
                  if (n > 1) repeats += 1;
                });
                return repeats;
              })();
              const repeatRate =
                clientNames.size > 0
                  ? Math.round((repeatClients / clientNames.size) * 100)
                  : 0;
              const successScore =
                totalOrders > 0
                  ? Math.min(
                      100,
                      Math.round((completedCount / Math.max(totalOrders, 1)) * 100)
                    )
                  : 0;

              // Category / service share of completed earnings
              const byService = new Map<string, number>();
              completed.forEach((o) => {
                const t = o.serviceTitle || "Other";
                byService.set(
                  t,
                  (byService.get(t) || 0) +
                    Number(o.sellerEarnings || o.grandTotal || 0)
                );
              });
              const serviceRows = Array.from(byService.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
              const serviceTotal =
                serviceRows.reduce((s, [, v]) => s + v, 0) || 1;

              return (
                <>
                  <div className="kpi-grid-styled stats-top-kpis">
                    <div
                      className="kpi-card-styled kpi-services"
                      style={{ backgroundColor: "#00bcd4" }}
                    >
                      <div className="kpi-inner-content">
                        <h2>{conversion}%</h2>
                        <p>
                          <i className="fas fa-bullseye" /> Conversion rate
                          (orders)
                        </p>
                      </div>
                    </div>
                    <div
                      className="kpi-card-styled kpi-clients"
                      style={{ backgroundColor: "#ff9800" }}
                    >
                      <div className="kpi-inner-content">
                        <h2>{repeatRate}%</h2>
                        <p>
                          <i className="fas fa-user-friends" /> Repeat client rate
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="content-card">
                    <h2>Key performance indicators (KPIs)</h2>
                    <div className="stat-kpi-grid">
                      <div className="stat-card">
                        <p className="stat-value">{successScore}%</p>
                        <p className="stat-label">Job success score</p>
                        <p className="stat-trend trend-up">
                          <i className="fas fa-check" /> Based on completed orders
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-value">{completedCount}</p>
                        <p className="stat-label">Total jobs completed</p>
                        <p className="stat-trend trend-up">
                          <i className="fas fa-briefcase" /> {activeOrders.length}{" "}
                          still active
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-value">
                          {sellerKpis.averageRating
                            ? Number(sellerKpis.averageRating).toFixed(1)
                            : "—"}
                          <span style={{ fontSize: "0.55em" }}>/5</span>
                        </p>
                        <p className="stat-label">Average client rating</p>
                        <p className="stat-trend">
                          {sellerKpis.totalReviews
                            ? `${sellerKpis.totalReviews} reviews`
                            : "From profile & order ratings"}
                        </p>
                      </div>
                      <div className="stat-card">
                        <p className="stat-value">
                          {sellerKpis.responseTimeMin >= 60
                            ? `${(sellerKpis.responseTimeMin / 60).toFixed(1)}h`
                            : `${sellerKpis.responseTimeMin}m`}
                        </p>
                        <p className="stat-label">Avg. client response time</p>
                        <p className="stat-trend trend-up">
                          <i className="fas fa-bolt" /> Response rate{" "}
                          {sellerKpis.responseRate}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="insights-row">
                    <div className="content-card chart-area">
                      <h2>Success metric trend</h2>
                      <div className="chart-controls">
                        <span className="text-muted">
                          Completed earnings · last 6 months
                        </span>
                      </div>
                      <div
                        className="fd-trend-chart fd-trend-chart--compact"
                        aria-label="Completed earnings trend"
                      >
                        {monthlyTrend.map((m) => {
                          const h = Math.max(
                            4,
                            Math.round((m.value / trendMax) * 100)
                          );
                          return (
                            <div key={`st-${m.key}`} className="fd-trend-col">
                              <div
                                className="fd-trend-bar-wrap"
                                title={formatMoney(m.value)}
                              >
                                <div
                                  className="fd-trend-bar fd-trend-bar--earn"
                                  style={{ height: `${h}%` }}
                                />
                              </div>
                              <span className="fd-trend-label">{m.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="content-card insights-breakdown">
                      <h3>Top earning breakdown</h3>
                      <ul className="insight-list">
                        {serviceRows.length === 0 ? (
                          <li>
                            <span className="icon-label">No completed sales yet</span>
                            <span className="score">—</span>
                          </li>
                        ) : (
                          serviceRows.map(([title, amount]) => (
                            <li key={title}>
                              <span className="icon-label">
                                <i className="fas fa-briefcase" /> {title}
                              </span>
                              <span className="score">
                                {Math.round((amount / serviceTotal) * 100)}%
                              </span>
                            </li>
                          ))
                        )}
                      </ul>

                      <h3 className="mt-20">Client quality summary</h3>
                      <ul className="insight-list">
                        <li>
                          <span className="icon-label">
                            <i className="fas fa-handshake" /> Unique clients
                          </span>
                          <span className="score">{clientNames.size}</span>
                        </li>
                        <li>
                          <span className="icon-label">
                            <i className="fas fa-redo" /> Repeat clients
                          </span>
                          <span className="score">{repeatClients}</span>
                        </li>
                        <li>
                          <span className="icon-label">
                            <i className="fas fa-wallet" /> Lifetime earned
                          </span>
                          <span className="score">{formatMoney(totalEarned)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <p className="text-muted mt-20 fd-stats-footnote">
                    Data updates when you load this page. Review{" "}
                    <Link href="/freelancer-orders-history">order history</Link>{" "}
                    for full transaction detail.
                  </p>

                  <div className="content-card">
                    <h2>
                      <i className="fas fa-chart-line" /> Performance deep dive
                    </h2>
                    <p>
                      Access historical data, traffic sources, and goals on the
                      full analytics page.
                    </p>
                    <Link
                      href="/freelancer-analytics"
                      className="btn btn-primary mt-10"
                    >
                      <i className="fas fa-external-link-alt" /> View full analytics
                      dashboard
                    </Link>
                  </div>
                </>
              );
            })()}
          </section>
        )}

        {/* Quick actions */}
        {panel === "quick-actions-panel" && (
          <section id="quick-actions-panel" className="content-panel active">
            <h1>
              <i className="fas fa-bolt" /> Quick Actions
            </h1>
            <p className="section-subheading">Shortcuts for common tasks.</p>
            <div className="action-grid-modern">
              <Link href="/post-service" className="quick-card primary">
                <div className="card-icon">
                  <i className="fas fa-plus-circle" />
                </div>
                <div className="card-info">
                  <h3>Create service</h3>
                  <p>Launch a new listing</p>
                </div>
              </Link>
              <Link href="/messages" className="quick-card">
                <div className="card-icon message-icon">
                  <i className="fas fa-envelope-open-text" />
                </div>
                <div className="card-info">
                  <h3>Messages</h3>
                  <p>
                    {unreadMessages > 0
                      ? `${unreadMessages} unread`
                      : "Open inbox"}
                  </p>
                </div>
              </Link>
              <Link href="/freelancer-withdrawals" className="quick-card">
                <div className="card-icon payout-icon">
                  <i className="fas fa-cash-register" />
                </div>
                <div className="card-info">
                  <h3>Request payout</h3>
                  <p>Withdraw earnings</p>
                </div>
              </Link>
              <Link href="/freelancer-orders" className="quick-card">
                <div className="card-icon delivery-icon">
                  <i className="fas fa-upload" />
                </div>
                <div className="card-info">
                  <h3>Active orders</h3>
                  <p>{activeOrders.length} open</p>
                </div>
              </Link>
              <Link href={profileHref} className="quick-card">
                <div className="card-icon profile-icon">
                  <i className="fas fa-user-circle" />
                </div>
                <div className="card-info">
                  <h3>View profile</h3>
                  <p>Public storefront</p>
                </div>
              </Link>
              <Link href="/freelancer-orders-history" className="quick-card">
                <div className="card-icon history-icon">
                  <i className="fas fa-history" />
                </div>
                <div className="card-info">
                  <h3>Order history</h3>
                  <p>Past transactions</p>
                </div>
              </Link>
              <Link href="/freelancer-settings" className="quick-card">
                <div className="card-icon portfolio-icon">
                  <i className="fas fa-images" />
                </div>
                <div className="card-info">
                  <h3>Portfolio & media</h3>
                  <p>In settings</p>
                </div>
              </Link>
              <Link href="/freelancer-settings" className="quick-card">
                <div className="card-icon settings-icon">
                  <i className="fas fa-user-cog" />
                </div>
                <div className="card-info">
                  <h3>Account settings</h3>
                  <p>Security & payout</p>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Messages */}
        {panel === "messages-panel" && (
          <section id="messages-panel" className="content-panel active">
            <h1>
              <i className="fas fa-envelope" /> Messages
            </h1>
            <div className="content-card">
              <h2>
                <i className="fas fa-inbox" /> Client inbox
              </h2>
              <p>
                {unreadMessages > 0
                  ? `You have ${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}.`
                  : "No unread messages."}
              </p>
              <Link href="/messages" className="btn btn-primary">
                Open messaging center
              </Link>
            </div>
          </section>
        )}
      </section>

      <div id="toast-container" />
    </main>
  );
}
