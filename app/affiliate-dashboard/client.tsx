//app/affiliate-dashboard.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import "@/styles/pages/affiliate-dashboard.css";

// =========================================================================
// TYPES & INTERFACES (REPLACED ALL 'any' TYPES)
// =========================================================================

export interface SavedLink {
  id?: string | number;
  _id?: string | number;
  url: string;
  name: string;
  date: string;
  clicks?: number;
  earnings?: number;
}

export interface HandpickedService {
  id?: string | number;
  _id?: string | number;
  title: string;
  category: string;
  price: number;
  img: string;
}

export interface ToastMessage {
  id: string | number;
  message: string;
  type: 'success' | 'removed';
}

export interface TeamMember {
  id?: string | number;
  _id?: string | number;
  displayName?: string;
  fullName?: string;
  username?: string;
  source?: string;
  memberSince?: string;
  createdAt?: string;
  joinedDate?: string;
  sales?: number;
  completedOrders?: number;
  wallet?: { lifetimeEarnings?: number };
  metrics?: { referralCount?: number; totalEarnings?: number };
  commissionEarned?: number;
  earnings?: number;
}

export interface Freelancer {
  id?: string | number;
  _id?: string | number;
  name?: string;
  email?: string;
  status?: 'active' | 'inactive';
  joinedAt?: string;
  completedOrders?: number;
  earnings?: number;
}

export interface Customer {
  id?: string | number;
  _id?: string | number;
  name?: string;
  email?: string;
  totalSpent?: number;
  ordersCount?: number;
  joinedDate?: string;
}

export interface PerformanceMetric {
  date: string;
  amount: number;
  clicks?: number;
}

export interface RoadmapTier {
  name: string;
  target: number;
  badge: string;
}


// =========================================================================
// STATIC CONSTANTS
// =========================================================================
const TAB_COLORS: Record<string, string> = {
  dashboard: "var(--color-dashboard, #3b82f6)",
  links: "var(--color-links, #10b981)",
  payouts: "var(--color-payouts, #f59e0b)",
  referrals: "var(--color-referrals, #8b5cf6)",
  "store-management": "var(--primary-color, #ff2d55)",
  "prestige-roadmap": "var(--primary-color, #ff2d55)",
};

// =========================================================================
// HELPER & UTILITY FUNCTIONS
// =========================================================================

// Returns FontAwesome icon classes based on referral or social source
const getSourceIconClass = (source?: string): string => {
  switch (source?.toLowerCase()) {
    case 'youtube':
      return 'fab fa-youtube text-red-500';
    case 'facebook':
      return 'fab fa-facebook text-blue-600';
    case 'twitter':
    case 'x':
      return 'fab fa-x-twitter text-slate-200';
    case 'instagram':
      return 'fab fa-instagram text-pink-500';
    case 'linkedin':
      return 'fab fa-linkedin text-blue-500';
    case 'tiktok':
      return 'fab fa-tiktok text-slate-100';
    default:
      return 'fas fa-link text-gray-400';
  }
};

// Calculates safe maximum ceiling value for chart scales
const getSafeMaxChartValue = (data: Array<{ amount?: number; earnings?: number; count?: number }>): number => {
  if (!Array.isArray(data) || data.length === 0) return 100;
  
  const max = data.reduce((currentMax, item) => {
    const val = item.amount ?? item.earnings ?? item.count ?? 0;
    return val > currentMax ? val : currentMax;
  }, 0);

  return max === 0 ? 100 : max;
};

// Safe date formatter to prevent hydration mismatches
const formatDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

  
  const sanitizeInput = (str: string): string => str.replace(/[<>]/g, '').trim();

  const isValidHttpUrl = (str: string): boolean => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };



  // ========================================================================= 
  // MAIN CLIENT COMPONENT 
  // =========================================================================

export default function AffiliateDashboardClient() {
  const router = useRouter();

  // --- 1. READ URL SEARCH PARAMS & INITIAL TAB ---
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const getInitialTab = (): string => {
    if (tabParam === 'campaigns') return 'links';
    if (tabParam === 'payouts') return 'payouts';
    if (tabParam === 'referrals') return 'referrals';
    return tabParam || 'dashboard';
  };

  // --- 2. ALL STATE DECLARATIONS (GROUPED AT TOP) ---

  // Core Auth & Services State
  const [affiliateId, setAffiliateId] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [marketplaceServices, setMarketplaceServices] = useState<HandpickedService[]>([]);

  // Application & Tab State
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  const [networkView, setNetworkView] = useState<string>('view-partners');
  const [activeShareSheetId, setActiveShareSheetId] = useState<string | number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Network & Team State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState<boolean>(true);
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState<boolean>(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Deep Link & Performance State
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [linkNickname, setLinkNickname] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [linkToDelete, setLinkToDelete] = useState<string | number | null>(null);
  const [linkPerformance, setLinkPerformance] = useState<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
  } | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState<boolean>(false);

  // Analytics State
  const [chartData, setChartData] = useState<{ date: string; label: string; amount: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [chartDays, setChartDays] = useState<number>(7);

  // Payouts & Withdrawal State
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [payoutsHistory, setPayoutsHistory] = useState<any[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<string>('Payoneer');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  // Store Customizer & Media State
  const [storeTitle, setStoreTitle] = useState<string>('');
  const [storeDescription, setStoreDescription] = useState<string>('');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState<string>('');
  const [isSavingStore, setIsSavingStore] = useState<boolean>(false);
  const [storeSaveStatus, setStoreSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoPreviewType, setVideoPreviewType] = useState<'embed' | 'file' | 'none'>('none');
  const [videoEmbedSrc, setVideoEmbedSrc] = useState<string>('');
  const videoEmbedSrcRef = useRef(videoEmbedSrc);
  const [fileNameDisplay, setFileNameDisplay] = useState<string>('');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<HandpickedService[]>([]);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  // Tier & Progression State
  const [currentTier, setCurrentTier] = useState<string>('Bronze');
  const [nextTier, setNextTier] = useState<string>('Silver');
  const [prestigeBadge, setPrestigeBadge] = useState<string>('Rising Marketer');
  const [prestigeLevel, setPrestigeLevel] = useState<number>(1);
  const [prestigePoints, setPrestigePoints] = useState<number>(0);
  const [currentEarnings, setCurrentEarnings] = useState<number>(0);
  const [tierTargetEarnings, setTierTargetEarnings] = useState<number>(1000);
  const [tiers, setTiers] = useState<{ name: string; target: number; badge: string }[]>([
    { name: 'Bronze', target: 0, badge: 'Rising Marketer' },
    { name: 'Silver', target: 1000, badge: 'Network Builder' },
    { name: 'Gold', target: 5000, badge: 'Influence Partner' },
    { name: 'Platinum', target: 15000, badge: 'Authority Leader' },
    { name: 'Diamond', target: 50000, badge: 'Elite Strategist' },
  ]);
  const [progression, setProgression] = useState({
    monthlySales: 0,
    targetSales: 5000,
    progressPercentage: 0,
  });
  const [loadingProgression, setLoadingProgression] = useState<boolean>(false);

  // Modals State
  const [isMediaKitOpen, setIsMediaKitOpen] = useState<boolean>(false);
  const [isDeleteVideoModalOpen, setIsDeleteVideoModalOpen] = useState<boolean>(false);
  const [serviceToRemove, setServiceToRemove] = useState<string | number | null>(null);

  // Derived Values
  const tierProgressPercent = Math.min(
    100,
    Math.round((currentEarnings / (tierTargetEarnings || 1)) * 100)
  );
    
    
   // =========================================================================
  // GLOBAL ESCAPE KEY HANDLER FOR MODALS (ACCESSIBILITY)
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (linkToDelete !== null) setLinkToDelete(null);
        if (isDeleteVideoModalOpen) setIsDeleteVideoModalOpen(false);
        if (serviceToRemove !== null) setServiceToRemove(null);
        if (isMediaKitOpen) setIsMediaKitOpen(false);
        if (isWithdrawModalOpen) setIsWithdrawModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    linkToDelete,
    isDeleteVideoModalOpen,
    serviceToRemove,
    isMediaKitOpen,
    isWithdrawModalOpen,
  ]);

  // =========================================================================
  // ROUTE PROTECTION & PROFILE HYDRATION (WITH ABORTCONTROLLER)
  // =========================================================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const storedUserId = localStorage.getItem('userId') || localStorage.getItem('affiliateId');

    if (!token || !loggedIn) {
      setIsAuthLoading(false);
      router.push('/login');
      return;
    }

    setAuthToken(token);
    if (storedUserId) {
      setAffiliateId(storedUserId);
    }

    const controller = new AbortController();

    fetch('/api/users/affiliate/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.user?.wallet) {
            setAvailableBalance(data.user.wallet.availableBalance || 0);
            setPendingBalance(data.user.wallet.pendingBalance || 0);
            setTotalPaidOut(data.user.wallet.lifetimeWithdrawals || 0);
          }

          if (data.affiliateProfile?.storeConfig) {
            const config = data.affiliateProfile.storeConfig;
            setStoreTitle(config.storeTitle || '');
            setStoreDescription(config.storeDescription || '');
            setFeaturedVideoUrl(config.featuredVideoUrl || '');
          }

          if (data.tierInfo) {
            setCurrentTier(data.tierInfo.currentTier || 'Bronze');
            setNextTier(data.tierInfo.nextTier || 'Silver');
            setPrestigeBadge(data.tierInfo.prestigeBadge || 'Rising Marketer');
            setTierTargetEarnings(data.tierInfo.tierTargetEarnings || 1000);
            setCurrentEarnings(data.tierInfo.currentEarnings || 0);
          }

          if (Array.isArray(data.tierInfo?.tiers) && data.tierInfo.tiers.length > 0) {
            setTiers(data.tierInfo.tiers);
          } else if (Array.isArray(data.tiers) && data.tiers.length > 0) {
            setTiers(data.tiers);
          }

          if (data.affiliateProfile) {
            setPrestigeLevel(data.affiliateProfile.prestigeLevel || 1);
            setPrestigePoints(data.affiliateProfile.prestigePoints || 0);
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error loading affiliate profile:', err);
        }
      })
      .finally(() => {
        setIsAuthLoading(false);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [router]);
    
    
    
  // Keep activeTab updated on tabParam URL changes
  useEffect(() => {
    if (tabParam === 'campaigns') {
      setActiveTab('links');
    } else if (tabParam === 'payouts') {
      setActiveTab('payouts');
    } else if (tabParam === 'referrals') {
      setActiveTab('referrals');
    } else if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // LocalStorage savedLinks hydration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const localSaved = localStorage.getItem('savedLinks');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedLinks(parsed);
        }
      } catch (err) {
        console.warn('Failed to parse cached savedLinks:', err);
      }
    }
  }, []);

  // Fetch saved links from DB
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    fetch('/api/affiliate/links', {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.links)) {
          const formatted = data.links.map((link: { _id: string; url: string; name: string; createdAt: string }) => ({
            id: link._id,
            url: link.url,
            name: link.name,
            date: new Date(link.createdAt).toLocaleDateString(),
          }));
          setSavedLinks(formatted);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching affiliate links:', err);
        }
      });

    return () => controller.abort();
  }, [authToken]);

  // Fetch link performance metrics
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    async function fetchPerformanceData() {
      setLoadingPerformance(true);
      try {
        const res = await fetch('/api/affiliate/links/performance', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const json = await res.json();
        if (json.success && json.performance) {
          setLinkPerformance(json.performance);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Link performance API offline or unavailable:', err);
        }
      } finally {
        setLoadingPerformance(false);
      }
    }

    fetchPerformanceData();

    return () => controller.abort();
  }, [authToken]);
    
    
  /// Fetch partners network
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    fetch('/api/affiliate/network/partners', {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.partners)) {
          setTeamMembers(data.partners);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Partners network API offline or unavailable:', err);
        }
      })
      .finally(() => setLoadingTeam(false));

    return () => controller.abort();
  }, [authToken]);

  // Fetch freelancers network
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    async function fetchFreelancers() {
      setLoadingFreelancers(true);
      try {
        const res = await fetch('/api/affiliate/network/freelancers', {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const json = await res.json();
        if (json.success && json.freelancers) {
          setFreelancers(json.freelancers);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Freelancers network API offline or unavailable:', err);
        }
      } finally {
        setLoadingFreelancers(false);
      }
    }

    fetchFreelancers();

    return () => controller.abort();
  }, [authToken]);
    
    
  // Fetch customers network
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    async function fetchCustomers() {
      setLoadingCustomers(true);
      try {
        const res = await fetch('/api/affiliate/network/customers', {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const json = await res.json();
        if (json.success && json.customers) {
          setCustomers(json.customers);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Customers network API offline or unavailable:', err);
        }
      } finally {
        setLoadingCustomers(false);
      }
    }

    fetchCustomers();

    return () => controller.abort();
  }, [authToken]);

  // Fetch monthly sales progression
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    async function fetchProgression() {
      setLoadingProgression(true);
      try {
        const res = await fetch('/api/affiliate/progression/monthly-sales', {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const json = await res.json();
        if (json.success) {
          setProgression({
            monthlySales: json.monthlySales || 0,
            targetSales: json.targetSales || 5000,
            progressPercentage: json.progressPercentage || 0,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Progression API offline or unavailable:', err);
        }
      } finally {
        setLoadingProgression(false);
      }
    }

    fetchProgression();

    return () => controller.abort();
  }, [authToken]);
    
    
  // Fetch analytics chart data
  useEffect(() => {
    if (!authToken) return;

    const controller = new AbortController();

    async function fetchChartData() {
      setLoadingChart(true);
      try {
        const res = await fetch(`/api/affiliate/analytics/daily-commissions?days=${chartDays}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const json = await res.json();
        if (json.success && json.chartData) {
          setChartData(json.chartData);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Analytics chart API offline or unavailable:', err);
        }
      } finally {
        setLoadingChart(false);
      }
    }

    fetchChartData();

    return () => controller.abort();
  }, [authToken, chartDays]);

  // Fetch marketplace services
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/services', {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.services)) {
          setMarketplaceServices(data.services);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Marketplace services API offline or unavailable:', err);
        }
      });

    return () => controller.abort();
  }, []);

  // Fetch payouts history
  useEffect(() => {
    if (activeTab !== 'payouts' || !authToken) return;

    const controller = new AbortController();

    fetch('/api/affiliate/payouts', {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && Array.isArray(data.payouts)) {
          setPayoutsHistory(data.payouts);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Payouts API offline or unavailable:', err);
        }
      });

    return () => controller.abort();
  }, [activeTab, authToken]);
    
    
  // Dynamic CSS Dot Color Effect
  useEffect(() => {
    const targetColor = TAB_COLORS[activeTab] || "var(--primary-color, #ff2d55)";
    document.documentElement.style.setProperty("--active-dot-color", targetColor);
  }, [activeTab]);

  // Keep ref in sync with state
  useEffect(() => {
    videoEmbedSrcRef.current = videoEmbedSrc;
  }, [videoEmbedSrc]);

  // Cleanup blob URL on component unmount ONLY
  useEffect(() => {
    return () => {
      if (videoEmbedSrcRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(videoEmbedSrcRef.current);
      }
    };
  }, []);

 
  
  // --- 4. ACTION HANDLERS & HELPERS ---
  const triggerToast = (message: string, type: 'success' | 'removed' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  
  const handleSaveStoreConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStore(true);
    setStoreSaveStatus(null);

    try {
      const res = await fetch('/api/users/affiliate/store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          storeTitle,
          storeDescription,
          featuredVideoUrl
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStoreSaveStatus({ type: 'success', message: 'Store settings saved successfully!' });
      } else {
        setStoreSaveStatus({ type: 'error', message: data.msg || 'Failed to update store settings.' });
      }
    } catch (err) {
      console.error('Error updating store:', err);
      setStoreSaveStatus({ type: 'error', message: 'An unexpected error occurred while saving.' });
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleGenerateLink = () => {
    const sanitizedUrl = sanitizeInput(targetUrl);

    if (!sanitizedUrl) {
      triggerToast("Please paste a URL first!", "removed");
      return;
    }

    if (!isValidHttpUrl(sanitizedUrl)) {
      triggerToast("Please enter a valid URL (e.g. https://...)", "removed");
      return;
    }

    const separator = sanitizedUrl.includes('?') ? '&' : '?';
    const finalUrl = `${sanitizedUrl}${separator}ref=${affiliateId}`;
    setGeneratedLink(finalUrl);
    triggerToast("Link generated!");
  };

  const handleResetGenerator = () => {
    setTargetUrl('');
    setLinkNickname('');
    setGeneratedLink('');
    triggerToast("Generator cleared", "removed");
  };

  const handleSaveLink = async () => {
    if (!generatedLink) return;
    const nickname = linkNickname.trim() || "Untitled Link";
    const newLinkObj: SavedLink = {
      id: Date.now(),
      url: generatedLink,
      name: nickname,
      date: new Date().toLocaleDateString(),
    };

    const updated = [...savedLinks, newLinkObj];
    setSavedLinks(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem('savedLinks', JSON.stringify(updated));
    }

    setLinkNickname('');
    triggerToast("Link saved with nickname!");

    if (authToken) {
      try {
        const res = await fetch('/api/affiliate/links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newLinkObj),
        });

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      } catch (err) {
        console.warn('Failed to sync saved link with backend:', err);
      }
    }
  };

  const confirmDeleteSavedLink = async () => {
    if (linkToDelete === null) return;

    try {
      const res = await fetch(`/api/affiliate/links/${linkToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();

      if (data.success) {
        const updated = savedLinks.filter((l) => l.id !== linkToDelete);
        setSavedLinks(updated);

        if (typeof window !== 'undefined') {
          localStorage.setItem('savedLinks', JSON.stringify(updated));
        }

        triggerToast("Link successfully removed", "removed");
      } else {
        triggerToast(data.message || "Failed to delete link", "removed");
      }
    } catch (err) {
      console.error("Error deleting link:", err);
      triggerToast("Server error deleting link", "removed");
    } finally {
      setLinkToDelete(null);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    if (isSubmittingWithdraw) return;
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum < 50) {
      triggerToast("Minimum withdrawal threshold is $50.00", "removed");
      return;
    }

    if (amountNum > availableBalance) {
      triggerToast("Insufficient available balance", "removed");
      return;
    }

    setIsSubmittingWithdraw(true);

    try {
      const res = await fetch('/api/affiliate/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          amount: amountNum,
          method: withdrawMethod
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAvailableBalance((prev) => parseFloat((prev - amountNum).toFixed(2)));
        setPendingBalance((prev) => parseFloat((prev + amountNum).toFixed(2)));
        setPayoutsHistory((prev) => [data.withdrawal, ...prev]);

        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        triggerToast("Withdrawal request submitted!");
      } else {
        triggerToast(data.message || "Withdrawal failed", "removed");
      }
    } catch (err) {
      console.error("Error requesting withdrawal:", err);
      triggerToast("Server error requesting withdrawal", "removed");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const copyToClipboard = (text: string, msg = "Link copied!") => {
    navigator.clipboard.writeText(text);
    triggerToast(msg);
  };

  const handleUpdateVideoFromLink = async () => {
    const sanitizedUrl = sanitizeInput(videoUrl);

    if (!sanitizedUrl) {
      triggerToast('Please enter a video URL first', 'removed');
      return;
    }

    if (!isValidHttpUrl(sanitizedUrl)) {
      triggerToast('Please enter a valid video URL (e.g. https://...)', 'removed');
      return;
    }

    try {
      const res = await fetch('/api/affiliate/store/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ videoUrl: sanitizedUrl })
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const data = await res.json();
      if (data.success) {
        setVideoEmbedSrc(data.featuredVideoUrl || sanitizedUrl);
        setVideoPreviewType('embed');
        setVideoUrl('');
        triggerToast('Featured video updated successfully!');
      } else {
        triggerToast(data.msg || 'Failed to update video', 'removed');
      }
    } catch (err) {
      console.error('Error updating video:', err);
      triggerToast('Server error updating video', 'removed');
    }
  };
    
    
    // ========================================================================= 
    // MEDIA & VIDEO HANDLERS (WITH BLOB URL MEMORY CLEANUP) 
    // =========================================================================

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileNameDisplay(file.name);
      const fileUrl = URL.createObjectURL(file);

      // Revoke previous blob URL to prevent memory leaks
      if (videoEmbedSrc && videoEmbedSrc.startsWith('blob:')) {
        URL.revokeObjectURL(videoEmbedSrc);
      }

      setVideoEmbedSrc(fileUrl);
      setVideoPreviewType('file');
      setVideoUrl('');
      triggerToast("Local video selected!");
    }
  };

  const handleDeleteVideoData = () => {
    setIsDeleteVideoModalOpen(true);
  };

  const confirmDeleteVideo = () => {
    // Revoke object URL from memory if it was a local file upload
    if (videoEmbedSrc && videoEmbedSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoEmbedSrc);
    }

    setVideoUrl('');
    setFileNameDisplay('');
    setVideoEmbedSrc('');
    setVideoPreviewType('none');
    setIsDeleteVideoModalOpen(false);
    triggerToast("Media removed", "removed");
  };

  const filteredServices = serviceSearch?.trim()
  ? (marketplaceServices ?? []).filter(
      (s) =>
        s.title?.toLowerCase()?.includes(serviceSearch.toLowerCase()) ||
        s.category?.toLowerCase()?.includes(serviceSearch.toLowerCase())
    )
  : [];

  const handleAddHandpickedService = (service: HandpickedService) => {
    if (selectedServices.find((s) => s.id === service.id)) {
      alert("This service is already in your list.");
      return;
    }
    if (selectedServices.length >= 6) {
      alert("Maximum 6 services reached. Please remove one before adding another.");
      return;
    }
    const updated = [...selectedServices, service];
    setServiceSearch('');
    handleSavePinnedServices(updated);
  };

  const handleRemoveService = (id?: string | number) => {
  if (id === undefined) return;
  setServiceToRemove(id);
};

  const confirmRemoveService = () => {
    if (serviceToRemove === null) return;
    const updated = selectedServices.filter((s) => s.id !== serviceToRemove);
    handleSavePinnedServices(updated);
    setServiceToRemove(null);
  };

  const handleDragStart = (index: number) => {
    setDragSourceIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;
    const updated = [...selectedServices];
    const [movedItem] = updated.splice(dragSourceIndex, 1);
    updated.splice(targetIndex, 0, movedItem);
    setDragSourceIndex(null);
    handleSavePinnedServices(updated);
  };

  const handleSavePinnedServices = async (updatedServicesList: HandpickedService[]) => {
    setSelectedServices(updatedServicesList);

    if (!authToken) return;

    try {
      const formattedServices = updatedServicesList.map((srv, idx) => ({
        serviceId: srv.id,
        displayOrder: idx
      }));

      const res = await fetch('/api/affiliate/store/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ services: formattedServices })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast('Handpicked services updated!');
      } else {
        triggerToast(data.msg || 'Failed to save services ordering', 'removed');
      }
    } catch (err) {
      console.error('Error saving handpicked services:', err);
      triggerToast('Server error saving services', 'removed');
    }
  };

    
     // Render auth loading screen
  if (isAuthLoading) {
    return (
      <div className="aff-dash-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <p>Verifying authentication...</p>
      </div>
    );
  }
  
    
    return (
    <div className="aff-dash-bg">
      <div className="aff-dash-wrapper">
        
       
        {/* =========================================================================
    SECTION 1 — SIDEBAR NAVIGATION
========================================================================= */}
<aside className="aff-sidebar">
  <div className="aff-card nav-widget">
    <nav id="main-nav">
      <a
        href="#dashboard"
        className={activeTab === "dashboard" ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab("dashboard");
        }}
      >
        <i className="fas fa-home"></i> Dashboard
      </a>
      <a
        href="#store-management"
        className={activeTab === "store-management" ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab("store-management");
        }}
      >
        <i className="fas fa-store"></i> Store Content
      </a>
      <a
        href="#links"
        className={activeTab === "links" ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab("links");
        }}
      >
        <i className="fas fa-link"></i> Link Generator
      </a>
      <a
        href="#payouts"
        className={activeTab === "payouts" ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab("payouts");
        }}
      >
        <i className="fas fa-wallet"></i> My Earnings
      </a>
      <a
        href="#referrals"
        className={activeTab === "referrals" ? "active" : ""}
        onClick={(e) => {
          e.preventDefault();
          setActiveTab("referrals");
        }}
      >
        <i className="fas fa-users"></i> My Team
      </a>
    </nav>
  </div>

  {/* PARTNER GROWTH WIDGET */}
<div className="aff-card glass-promo-widget">
  <h4>Partner Growth</h4>
  <p>Increase your commission by reaching your monthly volume goal.</p>

  <div className="progress-container">
    <div className="progress-labels">
      <span className="start-label">
        ${progression?.monthlySales?.toFixed(0) ?? 0}
      </span>
      <span className="end-label">
        ${progression?.targetSales?.toFixed(0) ?? 0}
      </span>
    </div>

    <div className="progress-track-wrapper">
      <div className="progress-bar-bg"></div>
      <div
        className="progress-bar-fill"
        style={{ width: `${progression?.progressPercentage ?? 0}%` }}
      >
        <span className="progress-dot"></span>
      </div>
    </div>

    <div className="progress-status">
      {loadingProgression ? (
        "Loading progress..."
      ) : (
        <>
          Currently at <strong>{progression?.progressPercentage ?? 0}%</strong> of goal
        </>
      )}
    </div>
  </div>
</div>
  
  
 {/* PRESTIGE SHORTCUT */}
<div
  className="aff-card neumorphic-shortcut"
  onClick={() => setActiveTab("prestige-roadmap")}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === "Enter" && setActiveTab("prestige-roadmap")}
>
  <div className="prestige-shortcut-inner">
    <div className="mini-badge-a">
      {(currentTier || "Bronze").charAt(0).toUpperCase()}
    </div>
    <div className="prestige-shortcut-text">
      <h5 className="prestige-shortcut-title">AUTHORITY STATUS</h5>
      <div className="prestige-shortcut-meta">
        <small>
          Rank: <strong>{currentTier || "Bronze"}</strong>
        </small>
        <i className="fas fa-chevron-right"></i>
      </div>
    </div>
  </div>
</div>
</aside>


        
        
        {/* =========================================================================
            SECTION 2 — MAIN HEADER & DASHBOARD TAB
        ========================================================================= */}
        <main className="aff-main">
          <header className="aff-top-bar">
            <div className="page-title-container">
              <div className="glass-id-badge">
                <span className="dot"></span>
                <span id="dynamic-title">
                  <span className="hash-symbol">#</span>{activeTab}
                </span>
              </div>
            </div>
            <div className="aff-user-pill">
  <i className="fas fa-user-circle"></i> <span>ID: {affiliateId || '...'}</span>
</div>
          </header>
          
          
          
          {/* =========================================================================
    SECTION 3 — TAB 1: MAIN DASHBOARD
========================================================================= */}
{activeTab === 'dashboard' && ( 
  <div id="dashboard" className="tab-content active">

    {/* TIER & PRESTIGE GAMIFICATION CARD */}
    <div className="tier-card-container">
      <div className="tier-card-header">
        <div className="tier-card-info">
          <span className="tier-card-label">Current Rank</span>
          <h2 className="tier-card-title">
            {currentTier || 'Bronze'} Tier <span className="tier-card-level">(Lvl {prestigeLevel ?? 1})</span>
          </h2>
          <div className="tier-card-badge">
            🏆 {prestigeBadge || 'Rising Marketer'}
          </div>
        </div>
        <div className="tier-card-points-wrapper">
          <span className="tier-card-points-label">Prestige Points</span>
          <div className="tier-card-points-val">{(prestigePoints ?? 0).toLocaleString()} PTS</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="tier-card-progress-wrapper">
        <div className="tier-card-progress-labels">
          <span>Progress to <strong>{nextTier || 'Silver'} Tier</strong></span>
          <span>${(currentEarnings ?? 0).toLocaleString()} / ${(tierTargetEarnings ?? 0).toLocaleString()} ({tierProgressPercent ?? 0}%)</span>
        </div>
        <div className="tier-card-progress-track">
          <div 
            className="tier-card-progress-fill"
            style={{ width: `${tierProgressPercent ?? 0}%` }} 
          />
        </div>
      </div>
    </div>

    {/* --- STATISTICAL METRICS GRID WITH SHIMMER LOADING --- */}
    {isLoading || loadingPerformance ? (
      <div className="aff-stats-row">
        <div className="skeleton-card">
          <div className="skeleton-box skeleton-text-sm"></div>
          <div className="skeleton-box skeleton-text-lg"></div>
        </div>
        <div className="skeleton-card">
          <div className="skeleton-box skeleton-text-sm"></div>
          <div className="skeleton-box skeleton-text-lg"></div>
        </div>
        <div className="skeleton-card">
          <div className="skeleton-box skeleton-text-sm"></div>
          <div className="skeleton-box skeleton-text-lg"></div>
        </div>
      </div>
    ) : (
      <div className="aff-stats-row">
        <div className="aff-card stat-item bg-blue">
          <div className="stat-icon-circle"><i className="fas fa-mouse-pointer"></i></div>
          <div className="stat-content">
            <span className="s-label">Total Clicks</span>
            <h2 className="s-value" id="total-clicks-val">
              {linkPerformance?.totalClicks ?? 0}
            </h2>
          </div>
        </div>
        <div className="aff-card stat-item bg-red">
          <div className="stat-icon-circle"><i className="fas fa-wallet"></i></div>
          <div className="stat-content">
            <span className="s-label">Total Commission</span>
            <h2 className="s-value">${(currentEarnings ?? 0).toFixed(2)}</h2>
          </div>
        </div>
        <div className="aff-card stat-item bg-green">
          <div className="stat-icon-circle"><i className="fas fa-clock"></i></div>
          <div className="stat-content">
            <span className="s-label">Pending Balance</span>
            <h2 className="s-value">${(pendingBalance ?? 0).toFixed(2)}</h2>
          </div>
        </div>
      </div>
    )}

    <div className="aff-grid-secondary">
      
      <div className="aff-card chart-island">
        <div className="island-header">
          <h3>Earnings Analytics</h3>
          <select 
            className="date-filter"
            value={chartDays}
            onChange={(e) => setChartDays(Number(e.target.value))}
            disabled={loadingChart}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>

        <div className="chart-area-wrapper">
          <div className="chart-placeholder">
            {loadingChart ? (
              <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
                Loading earnings data...
              </p>
            ) : chartData && chartData.length > 0 ? (
              <div className="mock-chart">
                {(() => {
                  const maxVal = getSafeMaxChartValue(chartData);

                  return chartData.map((item) => {
                    const heightPercent = Math.max(((item.amount ?? 0) / maxVal) * 100, 8);
                    const isHighest = item.amount === maxVal && item.amount > 0;

                    return (
                      <div
                        key={item.date}
                        className={`bar ${isHighest ? 'highlight' : ''}`}
                        style={{ height: `${heightPercent}%` }}
                        title={`${item.label} (${item.date}): $${(item.amount ?? 0).toFixed(2)}`}
                      />
                    );
                  });
                })()}
              </div>
            ) : (
              <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
                No earnings recorded for this period.
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="aff-card tools-island">
        <h3>Promotion Tools</h3>
        <p className="small-text">Use these to drive more traffic.</p>
        
        <ul className="tools-list">
          <li>
            <i className="fas fa-ad"></i>
            <div><strong>Banner Ads</strong><p>Download brand banners</p></div>
            <a href="assets/banners.zip"><i className="fas fa-images"></i></a>
          </li>
          <li>
            <i className="fas fa-vial"></i>
            <div><strong>Official Logos</strong><p>High-res transparent PNGs</p></div>
            <a href="assets/logos.zip"><i className="fas fa-images"></i></a>
          </li>
          <li>
            <i className="fab fa-instagram"></i>
            <div><strong>Social Kit</strong><p>Ready-to-post story templates</p></div>
            <a href="assets/social-pack.zip"><i className="fas fa-images"></i></a>
          </li>
        </ul>
        
        <button className="btn-full-red" onClick={() => setIsMediaKitOpen(true)}>
          Browse Media Kit
        </button>
      </div>
    </div>

    <div className="aff-card table-island">
      <div className="island-header">
        <h3>Recent Link Activity</h3>
        <button className="btn-outline">Export CSV</button>
      </div>
      <table className="aff-modern-table">
        <thead>
          <tr><th>Service Item</th><th>Clicks</th><th>Earnings</th><th>Status</th></tr>
        </thead>
        <tbody>
  {!savedLinks || savedLinks.length === 0 ? (
    <tr>
      <td colSpan={4} style={{ textAlign: 'center', color: '#718096' }}>
        No recent link activity recorded.
      </td>
    </tr>
  ) : (
    savedLinks?.map((link) => (
      <tr key={link.id || link._id}>
        <td>{link.name ?? 'Untitled Link'}</td>
        <td>{link.clicks ?? 0}</td>
        <td>${(link.earnings ?? 0).toFixed(2)}</td>
        <td><span className="tag-status green">Active</span></td>
      </tr>
    ))
  )}
</tbody>
      </table>
    </div>
  </div>
)}
          
          
          {/* =========================================================================
    SECTION 4 — TAB 2: STORE CONTENT MANAGEMENT
========================================================================= */}
{activeTab === 'store-management' && (
  <div id="store-management" className="tab-content active">
    
    {/* STORE PROFILE & SETTINGS */}
    <div className="aff-card management-island" style={{ marginBottom: '30px' }}>
      <h3 className="island-title"><i className="fas fa-id-card"></i> Store Profile Settings</h3>
      <p className="section-desc">Customize your public affiliate store title and bio seen by potential recruits.</p>
      
      <form onSubmit={handleSaveStoreConfig} style={{ marginTop: '15px' }}>
        {storeSaveStatus && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '15px',
            fontSize: '0.85rem',
            background: storeSaveStatus.type === 'success' ? 'rgba(72,187,120,0.15)' : 'rgba(229,62,62,0.15)',
            color: storeSaveStatus.type === 'success' ? '#48bb78' : '#e53e3e',
            border: `1px solid ${storeSaveStatus.type === 'success' ? '#48bb78' : '#e53e3e'}`
          }}>
            {storeSaveStatus.message}
          </div>
        )}

        <div className="input-group-glass" style={{ marginBottom: '15px' }}>
          <i className="fas fa-heading"></i>
          <input
            type="text"
            value={storeTitle ?? ''}
            onChange={(e) => setStoreTitle(e.target.value)}
            placeholder="Store Title (e.g., Alex's Tech & Design Hub)"
            required
          />
        </div>

        <div className="input-group-glass" style={{ marginBottom: '15px' }}>
          <i className="fas fa-align-left"></i>
          <textarea
            value={storeDescription ?? ''}
            onChange={(e) => setStoreDescription(e.target.value)}
            placeholder="Store Description / Tagline..."
            rows={3}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              outline: 'none',
              padding: '10px 0',
              resize: 'vertical'
            }}
          />
        </div>

        <button type="submit" className="btn-main-red" disabled={isSavingStore}>
          {isSavingStore ? 'Saving Store...' : 'Save Store Profile'}
        </button>
      </form>
    </div>

    {/* FEATURED VIDEO */}
    <div className="aff-card management-island">
      <h3 className="island-title"><i className="fas fa-video"></i> Featured Video</h3>
      <p className="section-desc">Paste a YouTube or Vimeo link to showcase a tutorial or review on your profile.</p>
      
      <div className="video-edit-wrapper">
        <div className="input-group-glass">
          <i className="fab fa-youtube"></i>
          <input
            type="text"
            value={videoUrl ?? ''}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste YouTube link (e.g., https://www.youtube.com/watch?v=...)"
          />
          <div className="action-buttons-flex">
            <button className="btn-action-primary" onClick={handleUpdateVideoFromLink}>Preview & Save</button>
            <button className="btn-icon-delete" onClick={handleDeleteVideoData} title="Remove Video">
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <div className="separator-text"><span>OR</span></div>

        <div className="input-group-glass">
          <i className="fas fa-file-video"></i>
          <input
            type="file"
            id="video-file-input"
            accept="video/*"
            hidden
            onChange={handleFileSelect}
          />
          <input
            type="text"
            value={fileNameDisplay ?? ''}
            placeholder="No file selected"
            readOnly
            onClick={() => document.getElementById('video-file-input')?.click()}
            style={{ cursor: 'pointer' }}
          />
          <div className="action-buttons-flex">
            <button
              className="btn-action-primary"
              onClick={() => document.getElementById('video-file-input')?.click()}
            >
              Upload & Save
            </button>
            <button className="btn-icon-delete" onClick={handleDeleteVideoData} title="Remove Video">
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        <div id="video-preview-container" className="video-preview-box">
          {videoPreviewType === 'embed' && (
            <iframe
              src={videoEmbedSrc}
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '16px' }}
            ></iframe>
          )}
          {videoPreviewType === 'file' && (
            <video controls style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}>
              <source src={videoEmbedSrc} />
            </video>
          )}
          {videoPreviewType === 'none' && (
            <div className="preview-placeholder">
              <i className="fas fa-play-circle"></i>
              <span>Media preview will appear here</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* HANDPICKED SERVICES */}
    <div className="aff-card management-island" style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="island-title" style={{ margin: 0 }}><i className="fas fa-hand-pointer"></i> Handpicked Service List</h3>
        <span className="badge-count" style={{ background: (selectedServices ?? []).length >= 6 ? '#e53e3e' : '#cc0000', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
          {(selectedServices ?? []).length} / 6 Slots Used
        </span>
      </div>
      <p className="section-desc" style={{ marginTop: '8px' }}>Select up to 6 services to display in your &quot;Recommended&quot; section.</p>
      <div className="search-container-wrapper">
        <div className="service-search-bar">
          <input
            type="text"
            value={serviceSearch ?? ''}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Search services to add (e.g., 'Logo Design')..."
          />
          <button className="btn-search-icon"><i className="fas fa-search"></i></button>
        </div>
        
        {serviceSearch?.trim() && (
          <div id="search-results-dropdown" className="glass-results-dropdown" style={{ display: 'block' }}>
            {(filteredServices ?? []).length > 0 ? (
              filteredServices.map((service) => (
                <div
                  key={service.id || service._id}
                  className="search-result-item"
                  onClick={() => handleAddHandpickedService(service)}
                >
                  <img src={service.img} alt="thumb" />
                  <div className="result-info">
                    <strong>{service.title}</strong>
                    <span>{service.category} • ${service.price}</span>
                  </div>
                  <button className="btn-add-service"><i className="fas fa-plus"></i></button>
                </div>
              ))
            ) : (
              <div style={{ padding: '15px', color: '#94a3b8', fontSize: '0.8rem' }}>
                No services found...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="selected-services-manager" id="managed-services-list" style={{ marginTop: '20px' }}>
        {(selectedServices ?? []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
            <i className="fas fa-mouse-pointer" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
            <p>Search and add up to 6 services to feature them on your profile.</p>
          </div>
        ) : (
          selectedServices.map((service, index) => (
            <div
              key={service.id || service._id}
              className="managed-service-item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(index);
              }}
              onDragEnd={() => setDragSourceIndex(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '8px' }}
            >
              <img src={service.img} alt="Service" style={{ width: '40px', borderRadius: '6px' }} />
              <div className="service-meta" style={{ flexGrow: 1 }}>
                <strong>{service.title}</strong>
                <div style={{ fontSize: '0.75rem', color: '#718096' }}>ID: #{service.id || service._id} • {service.category}</div>
              </div>
              <div className="item-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="btn-move" title="Drag to reorder" style={{ cursor: 'grab', color: '#a0aec0' }}>
                  <i className="fas fa-grip-vertical"></i>
                </div>
                <button
                  className="btn-remove-service"
                  onClick={() => handleRemoveService(service.id || service._id)}
                  style={{ border: 'none', background: 'transparent', color: '#e53e3e', cursor: 'pointer' }}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
)}
          
          
          
          {/* =========================================================================
    SECTION 5 — TAB 3: LINK GENERATOR & CAMPAIGNS
========================================================================= */}
{activeTab === 'links' && (
  <div id="links" className="tab-content active">
    
    {/* RECRUITMENT LINK */}
    <div className="aff-card generator-island">
      <div className="island-header">
        <h3><i className="fas fa-link"></i> Recruit Freelancers</h3>
      </div>
      <p className="section-desc">Share this static link to recruit sellers and earn overrides.</p>
      <div className="gen-flex">
        <input
          type="text"
          id="freelancer-recruitment-link"
          value={`https://mymarketplace.com/join?ref=${affiliateId ?? ''}&type=freelancer`}
          readOnly
        />
        <button
          className="btn-main-red"
          onClick={() => copyToClipboard(`https://mymarketplace.com/join?ref=${affiliateId ?? ''}&type=freelancer`, 'Recruitment link copied!')}
        >
          Copy
        </button>
      </div>
      <small className="input-hint">This link is fixed and linked to your unique ID.</small>
    </div>

    {/* DEEP LINK GENERATOR */}
    <div className="aff-card generator-island">
      <div className="island-header">
        <h3><i className="fas fa-magic"></i> Deep Link Generator</h3>
        <button className="btn-text-only" onClick={handleResetGenerator}>
          <i className="fas fa-undo"></i> Reset
        </button>
      </div>

      <p className="section-desc">Give your link a nickname and paste the URL below.</p>

      <div className="gen-flex" style={{ marginBottom: '10px' }}>
        <input
          type="text"
          value={linkNickname ?? ''}
          onChange={(e) => setLinkNickname(e.target.value)}
          placeholder='e.g., "Logo Design Project" or "Summer Sale"'
        />
      </div>

      <div className="gen-flex">
        <input
          type="text"
          value={targetUrl ?? ''}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder='"Paste product or service URL here..."'
        />
        <button className="btn-main-red" onClick={handleGenerateLink}>Create Link</button>
      </div>

      <small className="input-hint">Paste any marketplace URL to create a trackable affiliate link.</small>

      {generatedLink && (
        <div id="generated-result" style={{ marginTop: '15px' }}>
          <p className="small-text">Your Referral Link:</p>
          <div className="gen-flex">
            <input type="text" value={generatedLink} readOnly style={{ background: '#eef2f7' }} />
            <div className="button-group-flex">
              <button className="btn-outline" onClick={() => copyToClipboard(generatedLink)}>Copy</button>
              <button className="btn-save" onClick={handleSaveLink}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* SAVED LINKS LIST */}
    <div className="aff-card saved-links-island">
      <div className="island-header">
        <h3>My Saved Links</h3>
        <span className="badge-count" id="link-count">
          {(savedLinks ?? []).length} Links
        </span>
      </div>

      <div id="saved-links-container">
        {(savedLinks ?? []).length === 0 ? (
          <p className="empty-msg">No links saved yet.</p>
        ) : (
          (savedLinks ?? []).map((link) => {
            const currentLinkId = link.id || link._id;
            return (
              <div
                key={currentLinkId}
                className="saved-link-row"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="saved-link-info">
                    <strong title={link.url}>{link.name}</strong>
                    <small className="truncated-url" style={{ display: 'block', color: '#718096' }}>{link.url}</small>
                  </div>

                  <div className="button-group-flex" style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-outline"
                      title="Share"
                      onClick={() => {
  const targetId = currentLinkId ?? null;
  if (targetId === null) return;
  setActiveShareSheetId(activeShareSheetId === targetId ? null : targetId);
}}
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>
                    <button className="btn-outline" title="Copy" onClick={() => copyToClipboard(link.url)}>
                      <i className="fas fa-copy"></i>
                    </button>
                    <button
                      className="btn-outline"
                      style={{ color: '#e53e3e' }}
                      title="Delete"
                      onClick={() => setLinkToDelete(currentLinkId ?? null)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>

                {activeShareSheetId === currentLinkId && (
                  <div className="share-sheet" style={{ display: 'flex', width: '100%', marginTop: '10px', justifyContent: 'center', gap: '15px' }}>
                    <a href={`https://wa.me/?text=${encodeURIComponent(link.name + ': ' + link.url)}`} target="_blank" rel="noreferrer" className="share-icon wa">
                      <i className="fab fa-whatsapp"></i>
                    </a>
                    <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(link.name)}&url=${encodeURIComponent(link.url)}`} target="_blank" rel="noreferrer" className="share-icon tw">
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.url)}`} target="_blank" rel="noreferrer" className="share-icon fb">
                      <i className="fab fa-facebook-f"></i>
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
)}
          
          
          
          {/* =========================================================================
    SECTION 6 — TAB 4: MY EARNINGS / PAYOUTS
========================================================================= */}

{activeTab === 'payouts' && (
  <div id="payouts" className="tab-content active">
    
    {/* STATS OVERVIEW CARDS */}
    <div className="aff-stats-row">
      <div className="aff-card stat-item bg-dark">
        <div className="stat-content">
          <span className="s-label">Available for Withdrawal</span>
          <h2 className="s-value">${(availableBalance ?? 0).toFixed(2)}</h2>
          <button className="btn-withdraw-small" onClick={() => setIsWithdrawModalOpen(true)}>
            Withdraw Funds
          </button>
        </div>
      </div>

      <div className="aff-card stat-item bg-total-paid">
        <div className="stat-content">
          <span className="s-label" style={{ color: '#718096' }}>Total Paid Out</span>
          <h2 className="s-value" style={{ color: '#2d3748' }}>${(totalPaidOut ?? 0).toFixed(2)}</h2>
        </div>
      </div>

      <div className="aff-card stat-item bg-pending">
        <div className="stat-content">
          <span className="s-label" style={{ color: '#718096' }}>Pending Verification</span>
          <h2 className="s-value" style={{ color: '#2d3748' }}>${(pendingBalance ?? 0).toFixed(2)}</h2>
        </div>
      </div>
    </div>

    {/* TRANSACTION HISTORY TABLE */}
    <div className="aff-card table-island">
      <div className="island-header">
        <h3>Transaction History</h3>
      </div>
      <table className="aff-modern-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(payoutsHistory ?? []).length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', color: '#718096' }}>
                No transactions recorded yet.
              </td>
            </tr>
          ) : (
            (payoutsHistory ?? []).map((item) => {
              const rawId = String(item._id || item.id || '000000');
              const referenceCode = rawId.length >= 6 ? rawId.substring(rawId.length - 6).toUpperCase() : rawId.toUpperCase();
              
              return (
                <tr key={rawId}>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>#{referenceCode}</td>
                  <td>{item.method ?? 'Transfer'}</td>
                  <td>
                    <span className="amt-negative">
                      -${Number(item.amount ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className={`tag-status ${item.status === 'completed' ? 'green' : 'orange'}`}>
                      {item.status ?? 'pending'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
)}
          
          
          
          {/* =========================================================================
    SECTION 7 — TAB 5: MY TEAM / NETWORK INTELLIGENCE
========================================================================= */}
{activeTab === 'referrals' && (
  <div id="referrals" className="tab-content active">
    
    {/* HERO HEADER */}
    <div className="team-hero-header">
      <div className="hero-content">
        <h1>Network Intelligence</h1>
        <p>You earn from these partners and customers for the lifetime of their accounts.</p>
        
        <div className="custom-select-wrapper">
          <select
            id="network-view-selector"
            className="glass-dropdown-select"
            value={networkView}
            onChange={(e) => setNetworkView(e.target.value)}
          >
            <option value="view-partners">Sub-Affiliates</option>
            <option value="view-freelancers">Recruited Freelancers</option>
            <option value="view-customers">Lifetime Customers</option>
          </select>
          <i className="fas fa-chevron-down select-icon"></i>
        </div>
      </div>
    </div>

    <div className="team-container-wide">
      {/* RECRUITMENT LINK CARD */}
      <div className="aff-card recruitment-island">
        <div className="island-header">
          <div className="header-text">
            <h3>Permanent Recruitment Link</h3>
            <p className="small-text">Recruits are locked to your account forever upon signup.</p>
          </div>
          <i className="fas fa-shield-alt fa-2x" style={{ color: '#48bb78', opacity: 0.5 }}></i>
        </div>
        <div className="gen-flex">
          <input
            type="text"
            id="recruit-link"
            value={`https://mymarketplace.com/join?ref=${affiliateId ?? ''}`}
            readOnly
          />
          <button
            className="btn-main-red"
            onClick={() => copyToClipboard(`https://mymarketplace.com/join?ref=${affiliateId ?? ''}`, 'Recruitment link copied!')}
          >
            Copy Link
          </button>
        </div>
      </div>

      <div className="team-views-wrapper" style={{ width: '100%' }}>
        
        {/* SUB-AFFILIATES VIEW */}
        {networkView === 'view-partners' && (
          <div id="view-partners" className="team-view active" style={{ display: 'flex' }}>
            <div className="horizontal-list" style={{ width: '100%' }}>
              
              {loadingTeam ? (
                <p style={{ padding: '20px', color: '#94a3b8' }}>Loading sub-affiliates...</p>
              ) : (teamMembers ?? []).length > 0 ? (
                (teamMembers ?? []).map((member) => {
                  const memberId = member.id || member._id || member.affiliateId || Math.random().toString();
                  const memberName = member.displayName || member.fullName || member.username || 'Sub-Affiliate';
                  const rawDate = member.memberSince || member.createdAt || member.joinedDate;
                  const formattedDate = rawDate 
                    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
                    : 'N/A';
                  const salesCount = member.sales ?? member.completedOrders ?? member.metrics?.referralCount ?? 0;
                  const earningsVal = member.wallet?.lifetimeEarnings 
                    ?? member.metrics?.totalEarnings 
                    ?? member.commissionEarned 
                    ?? member.earnings 
                    ?? 0;
                  const formattedEarnings = Number(earningsVal).toFixed(2);
                  
                  const iconClass = typeof getSourceIconClass === 'function' 
                    ? getSourceIconClass(member.source) 
                    : 'fas fa-link';

                  return (
                    <div key={memberId} className="aff-card team-horizontal-card">
                      <div className="card-left">
                        <div className="user-avatar-rect">
                          {memberName?.substring(0, 2)?.toUpperCase() ?? '??'}
                        </div>
                        <div className="user-info-text">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{memberName}</strong>
                            <i 
                              className={iconClass} 
                              title={`Source: ${member.source || 'direct'}`} 
                            />
                          </div>
                          <span>Joined {formattedDate}</span>
                        </div>
                      </div>
                      <div className="card-right">
                        <div className="v-stat">
                          <small>Sales</small>
                          <strong>{salesCount}</strong>
                        </div>
                        <div className="v-stat">
                          <small>Lifetime Override</small>
                          <strong className="amt-positive">${formattedEarnings}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="aff-card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#94a3b8' }}>
                    No sub-affiliates recruited yet. Share your recruitment link to start building your team!
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* RECRUITED FREELANCERS VIEW */}
        {networkView === 'view-freelancers' && (
          <div id="view-freelancers" className="team-view active team-view-flex">
            <div className="horizontal-list team-list-full">
              {loadingFreelancers ? (
                <div className="aff-card loading-state-card">
                  <p className="loading-text">Loading recruited freelancers...</p>
                </div>
              ) : (freelancers ?? []).length > 0 ? (
                (freelancers ?? []).map((item) => {
                  const freelancerId = item._id || item.id || Math.random().toString();
                  const name = item.name || item.fullName || item.username || 'Unnamed Freelancer';
                  const joined = item.joinedAt || item.createdAt || item.memberSince;
                  const formattedDate = joined
                    ? new Date(joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'N/A';

                  return (
                    <div key={freelancerId} className="aff-card team-horizontal-card freelancer-item">
                      <div className="card-left">
                        <div className="user-avatar-rect">
                          {name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="user-info-text">
                          <strong>{name}</strong>
                          <span>Joined {formattedDate}</span>
                        </div>
                      </div>
                      <div className="card-right">
                        <div className="v-stat">
                          <small>Status</small>
                          <span className={`tag-status ${item.status === 'active' ? 'green' : 'orange'}`}>
                            {item.status || 'Active'}
                          </span>
                        </div>
                        <div className="v-stat">
                          <small>Email</small>
                          <strong className="email-value">{item.email || '—'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="aff-card empty-network-card">
                  <i className="fas fa-user-tie empty-network-icon"></i>
                  <h4 className="empty-network-title">No Freelancers Recruited</h4>
                  <p className="empty-network-desc">
                    Recruit specialists to earn overrides on every service they complete.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIFETIME CUSTOMERS VIEW */}
        {networkView === 'view-customers' && (
          <div id="view-customers" className="team-view active team-view-flex">
            <div className="horizontal-list team-list-full">
              {loadingCustomers ? (
                <div className="aff-card loading-state-card">
                  <p className="loading-text">Loading referred customers...</p>
                </div>
              ) : (customers ?? []).length > 0 ? (
                (customers ?? []).map((item) => {
                  const customerId = item._id || item.id || Math.random().toString();
                  const name = item.name || item.fullName || item.username || 'Unnamed Customer';
                  const joined = item.joinedAt || item.createdAt || item.memberSince;
                  const formattedDate = joined
                    ? new Date(joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'N/A';

                  return (
                    <div key={customerId} className="aff-card team-horizontal-card customer-item">
                      <div className="card-left">
                        <div className="user-avatar-rect">
                          {name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="user-info-text">
                          <strong>{name}</strong>
                          <span>Joined {formattedDate}</span>
                        </div>
                      </div>
                      <div className="card-right">
                        <div className="v-stat">
                          <small>Lifetime Spent</small>
                          <strong className="spend-value">${Number(item.totalSpent || 0).toFixed(2)}</strong>
                        </div>
                        <div className="v-stat">
                          <small>Email</small>
                          <strong className="email-value">{item.email || '—'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="aff-card empty-network-card">
                  <i className="fas fa-shopping-bag empty-network-icon"></i>
                  <h4 className="empty-network-title">No Customers Referred Yet</h4>
                  <p className="empty-network-desc">
                    Share your affiliate links to refer buyers and earn lifetime commissions on all their purchases.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  </div>
)}
          
          
          
          {/* =========================================================================
    SECTION 8 — TAB 6: PRESTIGE ROADMAP / AUTHORITY STATUS
========================================================================= */}
{activeTab === 'prestige-roadmap' && (
  <div id="prestige-roadmap" className="tab-content active">
    <section id="authority-status-root">

      {/* CURRENT STATUS CARD */}
      <div className="aff-card prestige-status-card">
        <div className="prestige-status-header">
          <div className="prestige-badge-large">
            {(currentTier || 'B').charAt(0)}
          </div>
          <div className="prestige-status-info">
            <span className="prestige-status-label">Current Authority Rank</span>
            <h2 className="prestige-status-title">
              {currentTier || 'Bronze'} Tier
              <span className="prestige-level-tag">Lvl {prestigeLevel ?? 1}</span>
            </h2>
            <div className="prestige-badge-pill">
              🏆 {prestigeBadge || 'Rising Marketer'}
            </div>
          </div>
          <div className="prestige-points-box">
            <span className="prestige-points-label">Prestige Points</span>
            <div className="prestige-points-value">
              {(prestigePoints ?? 0).toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* PROGRESS TO NEXT TIER */}
        {(() => {
          const safeProgress = Math.min(100, Math.max(0, Number(tierProgressPercent) || 0));
          return (
            <div className="prestige-progress-section">
              <div className="prestige-progress-labels">
                <span>Progress to <strong>{nextTier || 'Silver'} Tier</strong></span>
                <span>
                  ${(currentEarnings ?? 0).toLocaleString()} / ${(tierTargetEarnings ?? 0).toLocaleString()}
                  ({safeProgress}%)
                </span>
              </div>
              <div className="prestige-progress-track">
                <div
                  className="prestige-progress-fill"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* TIER ROADMAP */}
      <div className="aff-card prestige-roadmap-card">
        <h3 className="island-title">Authority Roadmap</h3>
        <p className="section-desc">
          Climb the ranks by increasing your lifetime earnings and network performance.
        </p>

        <div className="roadmap-timeline">
          {(tiers ?? []).map((tier, index) => {
            const isCurrent = (currentTier || 'Bronze') === tier.name;
            const isCompleted = (currentEarnings ?? 0) >= (tier.target ?? 0);

            return (
              <div
                key={tier.name || index}
                className={`roadmap-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="roadmap-marker">
                  <span className="roadmap-marker-inner">
                    {isCompleted ? <i className="fas fa-check"></i> : index + 1}
                  </span>
                </div>
                <div className="roadmap-content">
                  <strong className="roadmap-tier-name">{tier.name} Tier</strong>
                  <span className="roadmap-tier-badge">{tier.badge}</span>
                  <span className="roadmap-tier-target">
                    {(tier.target ?? 0) === 0
                      ? 'Starting Rank'
                      : `$${(tier.target ?? 0).toLocaleString()} earnings`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* BENEFITS / PERKS */}
      <div className="aff-card prestige-perks-card">
        <h3 className="island-title">Rank Benefits</h3>
        <div className="perks-grid">
          <div className="perk-item">
            <i className="fas fa-percentage"></i>
            <div>
              <strong>Higher Commissions</strong>
              <p>Unlock increased commission rates as you rank up.</p>
            </div>
          </div>
          <div className="perk-item">
            <i className="fas fa-users"></i>
            <div>
              <strong>Network Overrides</strong>
              <p>Earn more from your sub-affiliates and freelancers.</p>
            </div>
          </div>
          <div className="perk-item">
            <i className="fas fa-crown"></i>
            <div>
              <strong>Exclusive Badge</strong>
              <p>Display your authority status across the platform.</p>
            </div>
          </div>
          <div className="perk-item">
            <i className="fas fa-headset"></i>
            <div>
              <strong>Priority Support</strong>
              <p>Get faster responses from the partner success team.</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  </div>
)}

</main>
</div>
        
        
        
        {/* =========================================================================
            SECTION 9 — MODAL OVERLAYS & TOAST CONTAINERS
========================================================================= */}

{/* DELETE CONFIRMATION MODAL */}
{linkToDelete !== null && (
  <div 
    className="modal-overlay is-active" 
    id="delete-modal"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && setLinkToDelete(null)}
  >
    <div className="modal-content">
      <div className="modal-icon"><i className="fas fa-exclamation-circle"></i></div>
      <h3>Delete Link?</h3>
      <p>This action cannot be undone. Are you sure you want to remove this link from your list?</p>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={() => setLinkToDelete(null)}>Cancel</button>
        <button className="btn-confirm-delete" onClick={confirmDeleteSavedLink}>Delete</button>
      </div>
    </div>
  </div>
)}

{/* DELETE VIDEO CONFIRMATION MODAL */}
{isDeleteVideoModalOpen && (
  <div 
    className="modal-overlay is-active"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && setIsDeleteVideoModalOpen(false)}
  >
    <div className="modal-content">
      <div className="modal-icon"><i className="fas fa-exclamation-circle"></i></div>
      <h3>Remove Media?</h3>
      <p>Are you sure you want to remove the featured video?</p>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={() => setIsDeleteVideoModalOpen(false)}>Cancel</button>
        <button className="btn-confirm-delete" onClick={confirmDeleteVideo}>Remove</button>
      </div>
    </div>
  </div>
)}

{/* REMOVE SERVICE CONFIRMATION MODAL */}
{serviceToRemove !== null && (
  <div 
    className="modal-overlay is-active"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && setServiceToRemove(null)}
  >
    <div className="modal-content">
      <div className="modal-icon"><i className="fas fa-exclamation-circle"></i></div>
      <h3>Remove Service?</h3>
      <p>Remove this service from your recommendations?</p>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={() => setServiceToRemove(null)}>Cancel</button>
        <button className="btn-confirm-delete" onClick={confirmRemoveService}>Remove</button>
      </div>
    </div>
  </div>
)}

{/* BRAND MEDIA KIT MODAL */}
{isMediaKitOpen && (
  <div 
    className="modal-overlay is-active" 
    id="media-kit-modal"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && setIsMediaKitOpen(false)}
  >
    <div className="modal-content glass-gallery">
      <div className="modal-header">
        <div className="header-main">
          <i className="fas fa-photo-video"></i>
          <div>
            <h3>Brand Media Kit</h3>
            <p>Select and download assets to promote MyMarketplace</p>
          </div>
        </div>
        <button onClick={() => setIsMediaKitOpen(false)} className="close-btn" aria-label="Close modal">&times;</button>
      </div>

      <div className="gallery-filter-bar">
        <button type="button" className="filter-btn active">All Assets</button>
        <button type="button" className="filter-btn">Banners</button>
        <button type="button" className="filter-btn">Logos</button>
        <button type="button" className="filter-btn">Social</button>
      </div>

      <div className="gallery-grid">
        <div className="gallery-item">
          <div className="item-preview">
            <img src="https://via.placeholder.com/300x200" alt="Hero Banner Dark Preview" />
          </div>
          <div className="item-info">
            <strong>Hero Banner (Dark)</strong>
            <span>1200 x 600 • JPG</span>
            <a href="#0" onClick={(e) => e.preventDefault()} className="item-dl-link">
              <i className="fas fa-download"></i> Download
            </a>
          </div>
        </div>

        <div className="gallery-item">
          <div className="item-preview">
            <img src="https://via.placeholder.com/300x200" alt="Primary Logo Transparent Preview" />
          </div>
          <div className="item-info">
            <strong>Primary Logo</strong>
            <span>Transparent • PNG</span>
            <a href="#0" onClick={(e) => e.preventDefault()} className="item-dl-link">
              <i className="fas fa-download"></i> Download
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{/* WITHDRAWAL REQUEST MODAL */}
{isWithdrawModalOpen && (
  <div 
    className="modal-overlay is-active"
    role="dialog"
    aria-modal="true"
    onClick={(e) => e.target === e.currentTarget && !isSubmittingWithdraw && setIsWithdrawModalOpen(false)}
  >
    <div className="modal-content withdraw-modal-card">
      <h3>Request Withdrawal</h3>
      <p className="modal-subtitle">
        Minimum payout threshold is $50.00. Funds will move to pending status upon submission.
      </p>

      <form onSubmit={handleRequestWithdrawal} className="withdraw-form">
        <div className="form-group">
          <label className="form-label">Amount ($ USD)</label>
          <input
            type="number"
            step="0.01"
            min="50"
            value={withdrawAmount ?? ''}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="50.00"
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Payout Method</label>
          <select
            value={withdrawMethod || 'Payoneer'}
            onChange={(e) => setWithdrawMethod(e.target.value)}
            className="form-select"
          >
            <option value="Payoneer">Payoneer</option>
            <option value="PayPal">PayPal</option>
            <option value="Bank Transfer">Direct Bank Transfer</option>
          </select>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => setIsWithdrawModalOpen(false)}
            disabled={isSubmittingWithdraw}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-confirm-delete"
            disabled={isSubmittingWithdraw}
          >
            {isSubmittingWithdraw ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* DYNAMIC TOAST CONTAINER */}
<div id="toast-container">
  {(toasts ?? []).map((toast) => (
    <div key={toast.id} className={`toast ${toast.type === 'removed' ? 'removed' : ''}`}>
      <i className={`fas ${toast.type === 'removed' ? 'fa-trash-alt' : 'fa-check-circle'}`}></i>
      <span>{toast.message}</span>
    </div>
  ))}
</div>
  </div>
  );
}
          
          
