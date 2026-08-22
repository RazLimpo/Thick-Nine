//affiliate-dashboard

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import "@/styles/pages/affiliate-dashboard.css";

// --- TYPES & INTERFACES ---
interface SavedLink {
  id: string | number;
  url: string;
  name: string;
  date: string;
}

interface HandpickedService {
  id: number;
  title: string;
  category: string;
  price: number;
  img: string;
}

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'removed';
}

// 👈 ADD THIS HELPER FUNCTION RIGHT HERE
const getSourceIconClass = (source?: string) => {
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


export default function AffiliateDashboardClient() {
  const router = useRouter();
  const [affiliateId, setAffiliateId] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [marketplaceServices, setMarketplaceServices] = useState<HandpickedService[]>([]);

  // Store Customizer State
  const [storeTitle, setStoreTitle] = useState<string>('');
  const [storeDescription, setStoreDescription] = useState<string>('');
  const [featuredVideoUrl, setFeaturedVideoUrl] = useState<string>('');
  const [isSavingStore, setIsSavingStore] = useState<boolean>(false);
  const [storeSaveStatus, setStoreSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Gamification & Tier State
  const [currentTier, setCurrentTier] = useState<string>('Bronze');
  const [nextTier, setNextTier] = useState<string>('Silver');
  const [prestigeBadge, setPrestigeBadge] = useState<string>('Rising Marketer');
  const [prestigeLevel, setPrestigeLevel] = useState<number>(1);
  const [prestigePoints, setPrestigePoints] = useState<number>(0);
  const [currentEarnings, setCurrentEarnings] = useState<number>(0);
  const [tierTargetEarnings, setTierTargetEarnings] = useState<number>(1000);
    
    
    // --- PROGRESSION STATE ---
  const [progression, setProgression] = useState({
    monthlySales: 0,
    targetSales: 5000,
    progressPercentage: 0,
  });
  const [loadingProgression, setLoadingProgression] = useState<boolean>(false);

  // Derived progress percentage for UI Progress Bars
  const tierProgressPercent = Math.min(
    100,
    Math.round((currentEarnings / (tierTargetEarnings || 1)) * 100)
  );
    
  // Handler to persist store changes to the backend
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

  useEffect(() => {
    // Read session stored during login
    const token = localStorage.getItem('token');
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const storedUserId = localStorage.getItem('userId') || localStorage.getItem('affiliateId');

    // Route Protection: Redirect if no valid token exists
    if (!token || !loggedIn) {
      setIsAuthLoading(false);
      router.push('/login');
      return;
    }

    setAuthToken(token);
    if (storedUserId) {
      setAffiliateId(storedUserId);
    }

   // Hydrate existing store configuration & tier stats from backend
    fetch('/api/users/affiliate/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Wallet & Balance Hydration
          if (data.user?.wallet) {
            setAvailableBalance(data.user.wallet.availableBalance || 0);
            setPendingBalance(data.user.wallet.pendingBalance || 0);
            setTotalPaidOut(data.user.wallet.lifetimeWithdrawals || 0);
          }

          // Store Config
          if (data.affiliateProfile?.storeConfig) {
            const config = data.affiliateProfile.storeConfig;
            setStoreTitle(config.storeTitle || '');
            setStoreDescription(config.storeDescription || '');
            setFeaturedVideoUrl(config.featuredVideoUrl || '');
          }

          // Gamification & Tier Data
          if (data.tierInfo) {
            setCurrentTier(data.tierInfo.currentTier || 'Bronze');
            setNextTier(data.tierInfo.nextTier || 'Silver');
            setPrestigeBadge(data.tierInfo.prestigeBadge || 'Rising Marketer');
            setTierTargetEarnings(data.tierInfo.tierTargetEarnings || 1000);
            setCurrentEarnings(data.tierInfo.currentEarnings || 0);
          }

          if (data.affiliateProfile) {
            setPrestigeLevel(data.affiliateProfile.prestigeLevel || 1);
            setPrestigePoints(data.affiliateProfile.prestigePoints || 0);
          }
        }
      })
      .catch((err) => console.error('Error loading affiliate profile:', err))
.finally(() => {
  setIsAuthLoading(false);
  setIsLoading(false);
});
  }, [router]);  

  // Read URL search parameters
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Map incoming URL parameter names to your component's internal tab IDs
  const getInitialTab = (): string => {
    if (tabParam === 'campaigns') return 'links';
    if (tabParam === 'payouts') return 'payouts';
    if (tabParam === 'referrals') return 'referrals';
    return tabParam || 'dashboard';
  };

  
  // --- APPLICATION & TAB STATE ---
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [networkView, setNetworkView] = useState<string>('view-partners');
  const [activeShareSheetId, setActiveShareSheetId] = useState<string | number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    
   // --- SUB-AFFILIATES / TEAM STATE & FETCH ---
   const [teamMembers, setTeamMembers] = useState<any[]>([]);
   const [loadingTeam, setLoadingTeam] = useState<boolean>(true);
    
  // Keep state updated if a user clicks header links while on the page
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
     
     
     // --- FREELANCERS NETWORK STATE ---
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loadingFreelancers, setLoadingFreelancers] = useState<boolean>(false);
    
    // --- CUSTOMERS NETWORK STATE ---
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
    
  
  // --- DEEP LINK GENERATOR STATE ---
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [linkNickname, setLinkNickname] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [linkToDelete, setLinkToDelete] = useState<string | number | null>(null);
    
    
    // --- LINK PERFORMANCE STATE ---
const [linkPerformance, setLinkPerformance] = useState<{
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
} | null>(null);
const [loadingPerformance, setLoadingPerformance] = useState(false);
  
  
    // --- CHART / ANALYTICS STATE ---
  const [chartData, setChartData] = useState<{ date: string; label: string; amount: number }[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [chartDays, setChartDays] = useState<number>(7);
    
    
    // --- PAYOUTS & WITHDRAWAL STATE ---
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [totalPaidOut, setTotalPaidOut] = useState<number>(0);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [payoutsHistory, setPayoutsHistory] = useState<any[]>([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<string>('Payoneer');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);
    
    
  // --- FEATURED VIDEO & HANDPICKED SERVICES STATE ---
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoPreviewType, setVideoPreviewType] = useState<'embed' | 'file' | 'none'>('none');
  const [videoEmbedSrc, setVideoEmbedSrc] = useState<string>('');
  const [fileNameDisplay, setFileNameDisplay] = useState<string>('');

  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<HandpickedService[]>([]);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  // --- MODALS STATE ---
  const [isMediaKitOpen, setIsMediaKitOpen] = useState<boolean>(false);

 // --- PERSISTENCE & DOT COLOR EFFECT ---
  // Fetch saved links from DB on load
  useEffect(() => {
    if (!authToken) return;

    fetch('/api/affiliate/links', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.links)) {
          const formatted = data.links.map((link: any) => ({
            id: link._id,
            url: link.url,
            name: link.name,
            date: new Date(link.createdAt).toLocaleDateString()
          }));
          setSavedLinks(formatted);
        }
      })
      .catch((err) => console.error('Error fetching affiliate links:', err));
  }, [authToken]);
    
    
    // Fetch link performance metrics on load
useEffect(() => {
  const token = localStorage.getItem('token'); 
  if (!token) return;

  async function fetchPerformanceData() {
    setLoadingPerformance(true);
    try {
      const res = await fetch('/api/affiliate/links/performance', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (json.success && json.performance) {
        setLinkPerformance(json.performance);
      }
    } catch (err) {
      console.error('Error loading link performance stream:', err);
    } finally {
      setLoadingPerformance(false);
    }
  }

  fetchPerformanceData();
}, []);    
    
    
    
    
    
    // Fetch sub-affiliates (team members) on load
  useEffect(() => {
    if (!authToken) return;

    fetch('/api/affiliate/network/partners', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.partners)) {
          setTeamMembers(data.partners);
        }
      })
      .catch((err) => console.error('Error loading sub-affiliates:', err))
      .finally(() => setLoadingTeam(false));
  }, [authToken]);


   // Fetch recruited freelancers on load
useEffect(() => {
  if (!authToken) return;

  async function fetchFreelancers() {
    setLoadingFreelancers(true);
    try {
      const res = await fetch('/api/affiliate/network/freelancers', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (json.success && json.freelancers) {
        setFreelancers(json.freelancers);
      }
    } catch (err) {
      console.error('Error loading recruited freelancers:', err);
    } finally {
      setLoadingFreelancers(false);
    }
  }

  fetchFreelancers();
}, [authToken]);
    
    
    // Fetch referred customers on load
useEffect(() => {
  if (!authToken) return;

  async function fetchCustomers() {
    setLoadingCustomers(true);
    try {
      const res = await fetch('/api/affiliate/network/customers', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (json.success && json.customers) {
        setCustomers(json.customers);
      }
    } catch (err) {
      console.error('Error loading referred customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  }

  fetchCustomers();
}, [authToken]);
    
    
    // Fetch monthly sales progression
useEffect(() => {
  if (!authToken) return;

  async function fetchProgression() {
    setLoadingProgression(true);
    try {
      const res = await fetch('/api/affiliate/progression/monthly-sales', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setProgression({
          monthlySales: json.monthlySales || 0,
          targetSales: json.targetSales || 5000,
          progressPercentage: json.progressPercentage || 0,
        });
      }
    } catch (err) {
      console.error('Error loading monthly sales progression:', err);
    } finally {
      setLoadingProgression(false);
    }
  }

  fetchProgression();
}, [authToken]);
    
    
    // Fetch daily commissions chart data
useEffect(() => {
  if (!authToken) return;

  async function fetchChartData() {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/affiliate/analytics/daily-commissions?days=${chartDays}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const json = await res.json();
      if (json.success && json.chartData) {
        setChartData(json.chartData);
      }
    } catch (err) {
      console.error('Error loading analytics chart:', err);
    } finally {
      setLoadingChart(false);
    }
  }

  fetchChartData();
}, [authToken, chartDays]);
    

  // NEW: Fetch live marketplace services on load
  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.services)) {
          setMarketplaceServices(data.services);
        }
      })
      .catch((err) => console.error('Error loading marketplace services:', err));
  }, []);

    
    
    // Fetch transaction history when Payouts tab is active
  useEffect(() => {
    if (activeTab !== 'payouts' || !authToken) return;

    fetch('/api/affiliate/payouts', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.payouts)) {
          setPayoutsHistory(data.payouts);
        }
      })
      .catch((err) => console.error('Error fetching payouts:', err));
  }, [activeTab, authToken]);
    
    
    
  // Update dynamic CSS variable on active tab change

useEffect(() => {
  const tabColors: Record<string, string> = {
    dashboard: "var(--color-dashboard, #3b82f6)",
    links: "var(--color-links, #10b981)",
    payouts: "var(--color-payouts, #f59e0b)",
    referrals: "var(--color-referrals, #8b5cf6)",
    "store-management": "var(--primary-color, #ff2d55)",
    "prestige-roadmap": "var(--primary-color, #ff2d55)",
  };

  const targetColor = tabColors[activeTab] || "var(--primary-color, #ff2d55)";
  document.documentElement.style.setProperty("--active-dot-color", targetColor);
}, [activeTab]);
    
    
    // Prevent flash of unauthenticated content while loading session
  if (isAuthLoading) {
    return (
      <div className="aff-dash-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        <p>Verifying authentication...</p>
      </div>
    );
  }


  const triggerToast = (message: string, type: 'success' | 'removed' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };



// --- SECTION 3: EVENT HANDLERS & ACTION FUNCTIONS ---

  // Security & Sanitization Helpers
  const sanitizeInput = (str: string): string => {
    return str.replace(/[<>]/g, '').trim();
  };

  const isValidHttpUrl = (str: string): boolean => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  };




  // --- LINK GENERATOR HANDLERS ---
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

  const handleSaveLink = () => {
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
    localStorage.setItem('myAffiliateLinks', JSON.stringify(updated));
    setLinkNickname('');
    triggerToast("Link saved with nickname!");
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

      const data = await res.json();

      if (res.ok && data.success) {
        setSavedLinks((prev) => prev.filter((l) => l.id !== linkToDelete));
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


// --- WITHDRAWAL HANDLER ---
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
        // Optimistically update local balances
        setAvailableBalance((prev) => parseFloat((prev - amountNum).toFixed(2)));
        setPendingBalance((prev) => parseFloat((prev + amountNum).toFixed(2)));
        
        // Add new record to top of history
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

 // --- MEDIA & STORE HANDLERS ---
  const handleUpdateVideoFromLink = async () => {
    if (!videoUrl.trim()) {
      triggerToast('Please enter a video URL first', 'removed');
      return;
    }

    try {
      const res = await fetch('/api/affiliate/store/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ videoUrl: videoUrl.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVideoEmbedSrc(data.featuredVideoUrl || videoUrl.trim());
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
    
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileNameDisplay(file.name);
      const fileUrl = URL.createObjectURL(file);
      setVideoEmbedSrc(fileUrl);
      setVideoPreviewType('file');
      setVideoUrl('');
      triggerToast("Local video selected!");
    }
  };

  const handleDeleteVideoData = () => {
    if (confirm("Are you sure you want to remove the media?")) {
      setVideoUrl('');
      setFileNameDisplay('');
      setVideoEmbedSrc('');
      setVideoPreviewType('none');
      triggerToast("Media removed", "removed");
    }
  };

 // --- HANDPICKED SERVICES HANDLERS ---
  const filteredServices = serviceSearch.trim()
    ? marketplaceServices.filter(
        (s) =>
          s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
          s.category.toLowerCase().includes(serviceSearch.toLowerCase())
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

  const handleRemoveService = (id: number) => {
    if (confirm("Remove this service from your recommendations?")) {
      const updated = selectedServices.filter((s) => s.id !== id);
      handleSavePinnedServices(updated);
    }
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

    
    
    // --- PERSIST HANDPICKED SERVICES & REORDERING TO BACKEND ---
  const handleSavePinnedServices = async (updatedServicesList: HandpickedService[]) => {
    // Optimistic UI update
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
                      {currentTier} Tier <span className="tier-card-level">(Lvl {prestigeLevel})</span>
                    </h2>
                    <div className="tier-card-badge">
                      🏆 {prestigeBadge}
                    </div>
                  </div>
                  <div className="tier-card-points-wrapper">
                    <span className="tier-card-points-label">Prestige Points</span>
                    <div className="tier-card-points-val">{prestigePoints.toLocaleString()} PTS</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="tier-card-progress-wrapper">
                  <div className="tier-card-progress-labels">
                    <span>Progress to <strong>{nextTier} Tier</strong></span>
                    <span>${currentEarnings.toLocaleString()} / ${tierTargetEarnings.toLocaleString()} ({tierProgressPercent}%)</span>
                  </div>
                  <div className="tier-card-progress-track">
                    <div 
                      className="tier-card-progress-fill"
                      style={{ width: `${tierProgressPercent}%` }} 
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
        <h2 className="s-value">${currentEarnings.toFixed(2)}</h2>
      </div>
    </div>
    <div className="aff-card stat-item bg-green">
      <div className="stat-icon-circle"><i className="fas fa-clock"></i></div>
      <div className="stat-content">
        <span className="s-label">Pending Balance</span>
        <h2 className="s-value">${pendingBalance.toFixed(2)}</h2>
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
      ) : chartData.length > 0 ? (
        <div className="mock-chart">
          {(() => {
            const maxVal = Math.max(...chartData.map((d) => d.amount), 1);

            return chartData.map((item) => {
              const heightPercent = Math.max((item.amount / maxVal) * 100, 8);
              const isHighest = item.amount === maxVal && item.amount > 0;

              return (
                <div
                  key={item.date}
                  className={`bar ${isHighest ? 'highlight' : ''}`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${item.label} (${item.date}): $${item.amount.toFixed(2)}`}
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
  {savedLinks.length === 0 ? (
    <tr>
      <td colSpan={4} style={{ textAlign: 'center', color: '#718096' }}>
        No recent link activity recorded.
      </td>
    </tr>
  ) : (
    savedLinks.map((link) => (
      <tr key={link.id}>
        <td>{link.name}</td>
        <td>0</td>
        <td>$0.00</td>
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
                      value={storeTitle}
                      onChange={(e) => setStoreTitle(e.target.value)}
                      placeholder="Store Title (e.g., Alex's Tech & Design Hub)"
                      required
                    />
                  </div>

                  <div className="input-group-glass" style={{ marginBottom: '15px' }}>
                    <i className="fas fa-align-left"></i>
                    <textarea
                      value={storeDescription}
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
                      value={videoUrl}
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
                      value={fileNameDisplay}
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
                  <span className="badge-count" style={{ background: selectedServices.length === 6 ? '#e53e3e' : '#cc0000', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                    {selectedServices.length} / 6 Slots Used
                  </span>
                </div>
                <p className="section-desc" style={{ marginTop: '8px' }}>Select up to 6 services to display in your &quot;Recommended&quot; section.</p>
                  <div className="search-container-wrapper">
                  <div className="service-search-bar">
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search services to add (e.g., 'Logo Design')..."
                    />
                    <button className="btn-search-icon"><i className="fas fa-search"></i></button>
                  </div>
                  
                  {serviceSearch.trim() && (
                    <div id="search-results-dropdown" className="glass-results-dropdown" style={{ display: 'block' }}>
                      {filteredServices.length > 0 ? (
                        filteredServices.map((service) => (
                          <div
                            key={service.id}
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
                  {selectedServices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
                      <i className="fas fa-mouse-pointer" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                      <p>Search and add up to 6 services to feature them on your profile.</p>
                    </div>
                  ) : (
                    selectedServices.map((service, index) => (
                      <div
                        key={service.id}
                        className="managed-service-item"
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '8px' }}
                      >
                        <img src={service.img} alt="Service" style={{ width: '40px', borderRadius: '6px' }} />
                        <div className="service-meta" style={{ flexGrow: 1 }}>
                          <strong>{service.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#718096' }}>ID: #{service.id} • {service.category}</div>
                        </div>
                        <div className="item-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div className="btn-move" title="Drag to reorder" style={{ cursor: 'grab', color: '#a0aec0' }}>
                            <i className="fas fa-grip-vertical"></i>
                          </div>
                          <button
                            className="btn-remove-service"
                            onClick={() => handleRemoveService(service.id)}
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
            <div className="aff-card generator-island">
                <div className="island-header">
                  <h3><i className="fas fa-link"></i> Recruit Freelancers</h3>
                </div>
                <p className="section-desc">Share this static link to recruit sellers and earn overrides.</p>
                <div className="gen-flex">
                  <input
                    type="text"
                    id="freelancer-recruitment-link"
                    value={`https://mymarketplace.com/join?ref=${affiliateId}&type=freelancer`}
                    readOnly
                  />
                  <button
                    className="btn-main-red"
                    onClick={() => copyToClipboard(`https://mymarketplace.com/join?ref=${affiliateId}&type=freelancer`, 'Recruitment link copied!')}
                  >
                    Copy
                  </button>
                </div>
                <small className="input-hint">This link is fixed and linked to your unique ID.</small>
              </div>

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
                    value={linkNickname}
                    onChange={(e) => setLinkNickname(e.target.value)}
                    placeholder='e.g., "Logo Design Project" or "Summer Sale"'
                  />
                </div>

                <div className="gen-flex">
                  <input
                    type="text"
                    value={targetUrl}
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

              <div className="aff-card saved-links-island">
                <div className="island-header">
                  <h3>My Saved Links</h3>
                  <span className="badge-count" id="link-count">{savedLinks.length} Links</span>
                </div>
                <div id="saved-links-container">
                  {savedLinks.length === 0 ? (
                    <p className="empty-msg">No links saved yet.</p>
                  ) : (
                    savedLinks.map((link) => (
                      <div key={link.id} className="saved-link-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="saved-link-info">
                            <strong title={link.url}>{link.name}</strong>
                            <small className="truncated-url" style={{ display: 'block', color: '#718096' }}>{link.url}</small>
                          </div>
                          <div className="button-group-flex" style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-outline"
                              title="Share"
                              onClick={() => setActiveShareSheetId(activeShareSheetId === link.id ? null : link.id)}
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
                              onClick={() => setLinkToDelete(link.id)}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>

                        {activeShareSheetId === link.id && (
                          <div className="share-sheet" style={{ display: 'flex', width: '100%', marginTop: '10px', justifyContent: 'center', gap: '15px' }}>
                            <a href={`https://wa.me/?text=${encodeURIComponent(link.name + ': ' + link.url)}`} target="_blank" rel="noreferrer" className="share-icon wa"><i className="fab fa-whatsapp"></i></a>
                            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(link.name)}&url=${encodeURIComponent(link.url)}`} target="_blank" rel="noreferrer" className="share-icon tw"><i className="fab fa-twitter"></i></a>
                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.url)}`} target="_blank" rel="noreferrer" className="share-icon fb"><i className="fab fa-facebook-f"></i></a>
                          </div>
                        )}
                      </div>
                    ))
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
      <div className="aff-stats-row">
        <div className="aff-card stat-item bg-dark">
          <div className="stat-content">
            <span className="s-label">Available for Withdrawal</span>
            <h2 className="s-value">${availableBalance.toFixed(2)}</h2>
            <button className="btn-withdraw-small" onClick={() => setIsWithdrawModalOpen(true)}>
              Withdraw Funds
            </button>
          </div>
        </div>
        <div className="aff-card stat-item bg-total-paid">
          <div className="stat-content">
            <span className="s-label" style={{ color: '#718096' }}>Total Paid Out</span>
            <h2 className="s-value" style={{ color: '#2d3748' }}>${totalPaidOut.toFixed(2)}</h2>
          </div>
        </div>
        <div className="aff-card stat-item bg-pending">
          <div className="stat-content">
            <span className="s-label" style={{ color: '#718096' }}>Pending Verification</span>
            <h2 className="s-value" style={{ color: '#2d3748' }}>${pendingBalance.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <div className="aff-card table-island">
        <div className="island-header">
          <h3>Transaction History</h3>
        </div>
        <table className="aff-modern-table">
          <thead>
            <tr><th>Date</th><th>Reference</th><th>Method</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {payoutsHistory.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#718096' }}>No transactions recorded yet.</td>
              </tr>
            ) : (
              payoutsHistory.map((item) => (
                <tr key={item._id}>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>#{item._id.substring(item._id.length - 6).toUpperCase()}</td>
                  <td>{item.method}</td>
                  <td><span className="amt-negative">-${Number(item.amount).toFixed(2)}</span></td>
                  <td>
                    <span className={`tag-status ${item.status === 'completed' ? 'green' : 'orange'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
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
      <div className="aff-card recruitment-island">
        <div className="island-header">
          <div className="header-text">
            <h3>Permanent Recruitment Link</h3>
            <p className="small-text">Recruits are locked to your account forever upon signup.</p>
          </div>
          <i className="fas fa-shield-alt fa-2x" style={{ color: '#48bb78', opacity: 0.5 }}></i>
        </div>
        <div className="gen-flex">
          <input type="text" id="recruit-link" value={`https://mymarketplace.com/join?ref=${affiliateId}`} readOnly />
          <button className="btn-main-red" onClick={() => copyToClipboard(`https://mymarketplace.com/join?ref=${affiliateId}`, 'Recruitment link copied!')}>
            Copy Link
          </button>
        </div>
      </div>

      <div className="team-views-wrapper" style={{ width: '100%' }}>
        {networkView === 'view-partners' && (
          <div id="view-partners" className="team-view active" style={{ display: 'flex' }}>
            <div className="horizontal-list" style={{ width: '100%' }}>
              
              {loadingTeam ? (
                <p style={{ padding: '20px', color: '#94a3b8' }}>Loading sub-affiliates...</p>
              ) : teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((member) => {
                  const memberId = member.id || member._id || member.affiliateId;
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
                  const formattedEarnings = typeof earningsVal === 'number' 
                    ? earningsVal.toFixed(2) 
                    : parseFloat(earningsVal || 0).toFixed(2);

                  return (
                    <div key={memberId} className="aff-card team-horizontal-card">
                      <div className="card-left">
                        <div className="user-avatar-rect">
                          {memberName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="user-info-text">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{memberName}</strong>
                            {/* Dynamic Source Icon */}
                            <i 
                              className={getSourceIconClass(member.source)} 
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

        
       {networkView === 'view-freelancers' && (
  <div id="view-freelancers" className="team-view active team-view-flex">
    <div className="horizontal-list team-list-full">
      {loadingFreelancers ? (
        <div className="aff-card loading-state-card">
          <p className="loading-text">Loading recruited freelancers...</p>
        </div>
      ) : freelancers.length > 0 ? (
        freelancers.map((item) => {
          const freelancerId = item._id || item.id;
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
        

        {networkView === 'view-customers' && (
  <div id="view-customers" className="team-view active team-view-flex">
    <div className="horizontal-list team-list-full">
      {loadingCustomers ? (
        <div className="aff-card loading-state-card">
          <p className="loading-text">Loading referred customers...</p>
        </div>
      ) : customers.length > 0 ? (
        customers.map((item) => {
          const customerId = item._id || item.id;
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
                  <strong className="spend-value">${(item.totalSpent || 0).toFixed(2)}</strong>
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
                <div className="placeholder-content" style={{ textAlign: 'center', padding: '60px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ color: '#cc0000', fontSize: '2rem' }}></i>
                  <p style={{ marginTop: '15px', color: '#666' }}>Loading your Prestige Roadmap...</p>
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
  <div className="modal-overlay is-active" id="delete-modal">
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

      {/* BRAND MEDIA KIT MODAL */}
{isMediaKitOpen && (
 <div className="modal-overlay is-active" id="media-kit-modal">
    <div className="modal-content glass-gallery">
      <div className="modal-header">
        <div className="header-main">
          <i className="fas fa-photo-video"></i>
          <div>
            <h3>Brand Media Kit</h3>
            <p>Select and download assets to promote MyMarketplace</p>
          </div>
        </div>
        <button onClick={() => setIsMediaKitOpen(false)} className="close-btn">&times;</button>
      </div>

      <div className="gallery-filter-bar">
        <button className="filter-btn active">All Assets</button>
        <button className="filter-btn">Banners</button>
        <button className="filter-btn">Logos</button>
        <button className="filter-btn">Social</button>
      </div>

      <div className="gallery-grid">
        <div className="gallery-item">
          <div className="item-preview">
            <img src="https://via.placeholder.com/300x200" alt="Banner 1" />
          </div>
          <div className="item-info">
            <strong>Hero Banner (Dark)</strong>
            <span>1200 x 600 • JPG</span>
            <a href="#" className="item-dl-link"><i className="fas fa-download"></i> Download</a>
          </div>
        </div>

        <div className="gallery-item">
          <div className="item-preview">
            <img src="https://via.placeholder.com/300x200" alt="Logo 1" />
          </div>
          <div className="item-info">
            <strong>Primary Logo</strong>
            <span>Transparent • PNG</span>
            <a href="#" className="item-dl-link"><i className="fas fa-download"></i> Download</a>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      
      
      {/* WITHDRAWAL REQUEST MODAL */}
      {isWithdrawModalOpen && (
        <div className="modal-overlay is-active">
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
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="50.00"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payout Method</label>
                <select
                  value={withdrawMethod}
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
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type === 'removed' ? 'removed' : ''}`}>
            <i className={`fas ${toast.type === 'removed' ? 'fa-trash-alt' : 'fa-check-circle'}`}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}