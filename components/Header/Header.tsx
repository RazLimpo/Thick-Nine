"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BRAND, API_BASE_URL } from '@/lib/constants'; // Your centralized configuration file

// Define structural types for cleaner component data mapping
interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
}


// Helper for all administrative roles
const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'support',
  'moderator',
  'senior_support',
  'custom',
  'sub_admin',
];
const isAdminRole = (role: string) => ADMIN_ROLES.includes(role);


const Header = () => {
  const router = useRouter();
  const currentPath = usePathname();

  // ====================== AUTHENTICATION & PROFILE STATES ======================
  // All auth states are initialized with safe server-side defaults to eliminate hydration mismatches.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string>('guest');
  const [userProfilePic, setUserProfilePic] = useState<string | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);

  // ====================== UI INTERACTION STATES ======================
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMounted, setIsMounted] = useState<boolean>(false); // Production safeguard flag
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [bellCount, setBellCount] = useState(0);
  const [notifItems, setNotifItems] = useState<
  Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    href: string;
    createdAt: string;
  }>
>([]);
const [isNotifOpen, setIsNotifOpen] = useState(false);  

  const [toast, setToast] = useState<ToastState>({ 
    visible: false, 
    message: '', 
    icon: '' 
  });
    
    
    
    // ====================== URL SEARCH PARAMS ======================
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  const sourceParam = searchParams.get('source') || 'direct';
    
    
    
    // ====================== UI CONTROL METHODS ======================
  // Collapses all open dropdown boxes, overlay wrappers, and slide-out menus safely
  const closeAllUI = useCallback(() => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsModalOpen(false);
  }, []);

  // Opens the main entry login/register modal window smoothly
  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login') => {
    closeAllUI();
    setAuthTab(tab);
    setIsModalOpen(true);
  }, [closeAllUI]);

  // Triggers self-destructing layout alert toast boxes across the app
  const showToast = useCallback((message: string, icon: string = 'fa-info-circle') => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast({ visible: false, message: '', icon: '' }), 3000);
  }, []);
    
  // Toggles the compact mobile drawer while hiding open desktop elements
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => {
      const newState = !prev;
      if (newState) {
        setIsAccountMenuOpen(false);
        setIsModalOpen(false);
      }
      return newState;
    });
  }, []);



    // ====================== ACCOUNT ROLE ROTATION ENGINE ======================
const handleAccountSwitching = async () => {
  // Guard: administrative roles do not rotate
  if (isAdminRole(userRole)) {
    closeAllUI();
    showToast("You are logged in as an Administrator", "fa-shield-alt");
    return;
  }

  // 1. Grab values safely from browser environment storage with default fallbacks
  const currentRole = localStorage.getItem("userRole") || "client";
  const storageStrength = localStorage.getItem("accountStrength");

  // Parse baseline tier strength safely (default to 50 matching starter DB tier schemas)
  const strength = storageStrength ? parseInt(storageStrength, 10) : 50;

  let newRole: "client" | "freelancer" | "affiliate" = "client";

  // 2. Set up the explicit circular account rotation
  if (currentRole === "client") {
    newRole = "freelancer";
  } else if (currentRole === "freelancer") {
    newRole = "affiliate";
  } else {
    newRole = "client";
  }

  // 3. THE PRODUCTION SECURITY GATE: Stop execution if profile strength criteria is unmet
  if (newRole === "freelancer" && strength < 60) {
    closeAllUI();
    showToast(
      `Profile strength too low (${strength}%). Please complete your profile to unlock Freelancing!`,
      "fa-lock"
    );
    return;
  }

  const token = localStorage.getItem("token");

  // 4. Persist role on the server so draft/publish guards match the UI
  try {
    if (token) {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update role on server");
      }
      const data = await res.json().catch(() => ({}));
      if (data?.user?.accountStrength != null) {
        localStorage.setItem(
          "accountStrength",
          String(data.user.accountStrength)
        );
      }
    }
  } catch (err) {
    console.error("Role switch persist failed:", err);
    closeAllUI();
    showToast(
      err instanceof Error ? err.message : "Could not switch role. Try again.",
      "fa-exclamation-triangle"
    );
    return; // do not flip local mode if server rejected
  }

  // 5. Commit verified authorization changes to local records and update states
  localStorage.setItem("userRole", newRole);
  setUserRole(newRole);

  window.dispatchEvent(new Event("userRoleChanged"));
  closeAllUI();
  showToast(`Switched to ${newRole.toUpperCase()} mode`, "fa-exchange-alt");

  if (newRole === "freelancer") {
    router.push("/freelancer-dashboard");
  } else if (newRole === "affiliate") {
    router.push("/affiliate-dashboard");
  } else {
    router.push("/client-dashboard");
  }
};
    

  // Generates clean action button strings dynamically depending on the active state
  const getSwitcherText = () => {
  if (isAdminRole(userRole)) return "Admin Mode";
  if (userRole === 'client') return "Switch to Freelancing";
  if (userRole === 'freelancer') return "Switch to Affiliate";
  return "Switch to Buying";
};



  // Clears active authorization records cleanly and routes back to the root page context
  const handleSignOut = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem("adminRole");
    localStorage.removeItem('accountStrength'); 
    localStorage.removeItem('isEmailVerified');
    localStorage.removeItem('isProfileComplete');

    setIsLoggedIn(false);
    setUserRole('guest');
    setUserProfilePic(null);

    closeAllUI();
    showToast("Signed out successfully", "fa-sign-out-alt");
    router.push('/');
  };

    
 // ====================== SOCIAL AUTH HANDLER ======================
  const handleSocialAuth = (provider: string) => {
    // Flag social authentication provider for mandatory onboarding alignment
    localStorage.setItem('authProvider', provider);
    
    // In production, initiate OAuth redirect here (e.g., window.location.href = `${API_BASE_URL}/api/auth/${provider}`)
    showToast(`Redirecting to ${provider.toUpperCase()}...`, "fa-spin fa-spinner");
  };   
    
    
    
    
    
    
    // ====================== SECURITY GUARD LAYER ======================
  // Validates user session credentials and enforces account routing milestones
  const checkSecurity = useCallback(() => {
    if (typeof window === 'undefined') return;

    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const emailVerified = localStorage.getItem('isEmailVerified') === 'true';
    const profileDone = localStorage.getItem('isProfileComplete') === 'true';
    const role = localStorage.getItem('userRole') || 'guest';
    const photo = localStorage.getItem('userPhoto');

    const effectiveRole = loggedIn ? role : 'guest';

    // Synchronize state flags cleanly with active local records
    setIsLoggedIn(loggedIn);
    setIsEmailVerified(emailVerified);
    setIsProfileComplete(profileDone);
    setUserRole(effectiveRole); 
    setUserProfilePic(photo); 
    
    // Bind current credentials to DOM attribute triggers for CSS selection architecture
    document.body.setAttribute('data-user-role', effectiveRole); 

   // Setup safe context directories accessible without active registration tokens
const safePages = [
  '/', 
  '/search-results', 
  '/about', 
  '/terms-and-privacy', 
  '/service-details', 
  '/freelancer-profile', 
  '/verify-email', 
  '/mandatory',
  '/admin/login'
];
    const isSafePage = safePages.includes(currentPath || '');

   if (!isSafePage) {
  if (!loggedIn) {
    router.replace('/?auth=login'); 
  } else if (!emailVerified && currentPath !== '/verify-email') {
    router.push('/verify-email');
  } else if (emailVerified && !profileDone && currentPath !== '/mandatory') {
    router.push('/mandatory');
  }
}
  }, [currentPath, router, openAuthModal]);
    
  // Primary mount synchronization hook (Defeats Next.js server pre-render hydration mismatches)
  useEffect(() => {
    // 1. Hydrate security configurations from localStorage immediately upon client mount
    checkSecurity();
    
    // 2. Flip the production mount flag to true
    setIsMounted(true);

    // 3. Set up listeners to catch session updates or logouts occurring in other browser tabs
    window.addEventListener('storage', checkSecurity);

    // 4. Set up an internal listener for custom profile switching updates
    window.addEventListener('userRoleChanged', checkSecurity);
    
    // 5. Explicitly strip event hooks on component unmount to completely prevent memory leaks
    return () => {
      window.removeEventListener('storage', checkSecurity);
      window.removeEventListener('userRoleChanged', checkSecurity);
    };
  }, [checkSecurity]);

  // Click outside to close: account menu + notification dropdown
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (!event.target) return;
    const el = event.target as Element;

    if (!el.closest('.account-dropdown-container')) {
      setIsAccountMenuOpen(false);
    }
    if (!el.closest('.notif-dropdown-container')) {
      setIsNotifOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  // Open auth modal when landing with ?auth=login or ?auth=register
useEffect(() => {
  if (!isMounted) return;

  const authParam = searchParams.get('auth');
  if (authParam === 'login' || authParam === 'register') {
    openAuthModal(authParam);
    // Clean the URL so refreshing doesn't reopen the modal
    router.replace('/', { scroll: false });
  }
}, [isMounted, searchParams, openAuthModal, router]);
    
    
    // Unread Messages Count
    useEffect(() => {
  if (!isMounted || !isLoggedIn || !isAdminRole(userRole)) {
    setMessageUnreadCount(0);
    setBellCount(0);
    setNotifItems([]);
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) return;

  let cancelled = false;

  async function loadNotifs() {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [countsRes, feedRes] = await Promise.all([
        fetch("/api/admin/notifications/counts", { headers }),
        fetch("/api/admin/notifications/feed", { headers }),
      ]);

      const countsData = await countsRes.json().catch(() => ({}));
      const feedData = await feedRes.json().catch(() => ({}));

      if (!cancelled && countsRes.ok && countsData.success && countsData.counts) {
        const m = Number(countsData.counts.messages) || 0;
        const o = Number(countsData.counts.orders) || 0;
        const w = Number(countsData.counts.withdrawals) || 0;
        setMessageUnreadCount(m);
        setBellCount(o + w);
      }

      if (!cancelled && feedRes.ok && feedData.success) {
        setNotifItems(Array.isArray(feedData.items) ? feedData.items : []);
      }
    } catch (err) {
      console.error("Header notifications failed:", err);
    }
  }

  loadNotifs();
  const id = window.setInterval(loadNotifs, 60000);
  return () => {
    cancelled = true;
    window.clearInterval(id);
  };
}, [isMounted, isLoggedIn, userRole]);
    
    
          
  // ====================== GLOBAL SEARCH FORM ROUTER ======================
  const handleSearch = (e: React.FormEvent) => {
    // Ensure standard HTML forms do not trigger heavy browser-reloading actions
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length > 0) {
      const encodedQuery = encodeURIComponent(trimmedQuery);
      setIsMobileMenuOpen(false); // Drop open mobile navigations instantly
      router.push(`/search-results?q=${encodedQuery}`); // Route using standard homepage variables
    } else {
      showToast("Please enter something to search", "fa-search");
    }
  };
    
    
   
    
    
    
    
    // ====================== MENU ITEMS ENGINE (DYNAMIC RENDER MATRIX) ======================
  // Computes the navigation nodes on-the-fly depending on user roles and active authentication
  const getMenuItems = () => {
    const items: React.ReactNode[] = [];

    // Guest Link Matrix
    if (!isLoggedIn) {
      items.push(
        <li key="register">
          <button onClick={() => openAuthModal('register')} className="register-link" role="menuitem">
            <i className="fas fa-user-plus"></i> Register
          </button>
        </li>,
        <li key="login">
          <button onClick={() => openAuthModal('login')} className="login-link" role="menuitem">
            <i className="fas fa-sign-in-alt"></i> Login
          </button>
        </li>
      );
      return items;
    }

    // Assign profile paths depending on active authorization states
let profilePath = "/client-profile";
if (isAdminRole(userRole)) {
  profilePath = "/admin/profile";
} else if (userRole === "freelancer") {
  profilePath = "/freelancer-profile";
} else if (userRole === "affiliate") {
  profilePath = "/affiliate-profile";
}

    // Build common links shared across authorized profiles
    items.push(
      <li key="profile">
        <Link href={profilePath} role="menuitem" onClick={closeAllUI}>
          <i className="fas fa-user"></i> Profile
        </Link>
      </li>
    );


// ========== ADMIN BLOCK ==========
  if (isAdminRole(userRole)) {
  items.push(
    <li key="adm-dash">
      <Link href="/admin/dashboard" onClick={closeAllUI}>
        <i className="fas fa-shield-alt"></i> Admin Dashboard
      </Link>
    </li>,
    <li key="adm-clients">
      <Link href="/admin/clients" onClick={closeAllUI}>
        <i className="fas fa-users"></i> Manage Clients
      </Link>
    </li>,
    <li key="adm-orders">
      <Link href="/admin/orders" onClick={closeAllUI}>
        <i className="fas fa-file-invoice-dollar"></i> Orders & Escrow
      </Link>
    </li>
  );

  // Real rank from Admin collection (set on login via /api/admin/me)
  const isSuperAdmin =
    typeof window !== "undefined" &&
    localStorage.getItem("adminRole") === "super_admin";

  if (isSuperAdmin) {
    items.push(
      <li key="adm-team">
        <Link href="/admin/sub-admins" onClick={closeAllUI}>
          <i className="fas fa-user-shield"></i> Team & Roles
        </Link>
      </li>,
      <li key="adm-audit">
        <Link href="/admin/audit-logs" onClick={closeAllUI}>
          <i className="fas fa-history"></i> Audit Logs
        </Link>
      </li>
    );
  }
}

    


    // Append Role-Specific Sub-Menu Lists
    if (userRole === 'freelancer') {
      items.push(
        <li key="f-orders"><Link href="/freelancer-order-management" onClick={closeAllUI}><i className="fas fa-spinner"></i> Order Management</Link></li>,
        <li key="f-withdraw"><Link href="/freelancer-withdrawal" onClick={closeAllUI}><i className="fas fa-wallet"></i> Withdrawal</Link></li>,
        <li key="f-stats"><Link href="/freelancer-analytics" onClick={closeAllUI}><i className="fas fa-chart-line"></i> Stats</Link></li>,
        <li key="f-clients"><Link href="/freelancer-client-management" onClick={closeAllUI}><i className="fas fa-users"></i> Clients</Link></li>,
        <li key="f-settings"><Link href="/freelancer-settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Settings</Link></li>
      );
    } else if (userRole === 'client') {
      items.push(
        <li key="b-settings"><Link href="/client-settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Account Settings</Link></li>
      );
    } else if (userRole === 'affiliate') {
      items.push(
        <li key="a-dash"><Link href="/affiliate-dashboard" onClick={closeAllUI}><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>,
        <li key="a-settings"><Link href="/affiliate-settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Settings</Link></li>
      );
    }

    // Append common closing features (Switcher controls & Disconnect actions)
    items.push(
      <li key="switcher">
        <button onClick={handleAccountSwitching} className="account-switcher" role="menuitem">
          <i className="fas fa-exchange-alt"></i> {getSwitcherText()}
        </button>
      </li>,
      <li key="signout">
        <button onClick={handleSignOut} className="sign-out-link" role="menuitem">
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </button>
      </li>
    );

    return items;
  };

  // ====================== AUTH SUBMIT MANIPULATION ACTIONS ======================
  
// Registration Endpoint Pipeline
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
   
    const email = (document.getElementById('reg-email') as HTMLInputElement)?.value.trim();
    const password = (document.getElementById('reg-password') as HTMLInputElement)?.value.trim();

    if (!email || !password) {
      showToast("Please fill in all fields", "fa-exclamation-triangle");
      return;
    }

    if (password.length < 8) {
      showToast("Password must be at least 8 characters long", "fa-exclamation-triangle");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);


    const userData = { 
  fullName: "New User", 
  username: email.split('@')[0], 
  email, 
  password, 
  role: "client",
  source: sourceParam
};

try {
  const response = await fetch(`${API_BASE_URL}/api/auth/finalize-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
      
      const data = await response.json();

      if (response.ok) {
        // Hydrate records immediately to flag the verification system context gates
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role || 'client');
        localStorage.setItem('isEmailVerified', 'false');    
        localStorage.setItem('isProfileComplete', 'false');   
        localStorage.setItem('accountStrength', (data.user.accountStrength || 50).toString());
        localStorage.setItem('registrationTimestamp', Date.now().toString());
      
        setIsLoggedIn(true);
        setUserRole(data.user.role || 'client');
        setIsEmailVerified(false);
        setIsProfileComplete(false);

        closeAllUI(); 
        showToast("Account created! Check your email inbox to verify.", "fa-paper-plane");
        
        setTimeout(() => router.push('/verify-email'), 1500);
      } else {
        showToast(data.msg || "Registration failed", "fa-exclamation-triangle");
      }
    } catch (err) {
      showToast("Server connection issues.", "fa-wifi");
    } finally {
      setIsLoading(false);
    }
  };

 // Login Endpoint Pipeline
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Direct ID selectors to guarantee value extractions
    const emailInput = (document.getElementById('login-email') as HTMLInputElement)?.value.trim();
    const passwordInput = (document.getElementById('login-password') as HTMLInputElement)?.value.trim();

    if (!emailInput || !passwordInput) {
      showToast("Please enter email and password", "fa-exclamation-triangle");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      const data = await response.json();

      if (response.ok) {
  const userRole = data.user.role || "client";
  const token = data.token as string;

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("token", token);
  localStorage.setItem("userRole", userRole);
  localStorage.setItem(
    "accountStrength",
    (data.user.accountStrength || 0).toString()
  );
  localStorage.setItem(
    "isEmailVerified",
    (data.user.isEmailVerified ?? false).toString()
  );
  localStorage.setItem(
    "isProfileComplete",
    (data.user.isProfileComplete ?? false).toString()
  );

  // Resolve Admin.role for Team / Audit menu (User stays "admin")
  localStorage.removeItem("adminRole");
  if (isAdminRole(userRole)) {
    try {
      const meRes = await fetch("/api/admin/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const meData = await meRes.json().catch(() => ({}));
      if (meRes.ok && meData?.admin?.role) {
        localStorage.setItem("adminRole", String(meData.admin.role));
      }
    } catch (err) {
      console.error("Failed to load admin profile:", err);
    }
  }

  setIsLoggedIn(true);
  setUserRole(userRole);
  setIsEmailVerified(data.user.isEmailVerified ?? false);
  setIsProfileComplete(data.user.isProfileComplete ?? false);

  closeAllUI();
  showToast(`Welcome back, ${data.user.fullName || "User"}!`, "fa-sign-in-alt");

  setTimeout(() => {
    if (isAdminRole(userRole)) router.push("/admin/dashboard");
    else if (userRole === "freelancer") router.push("/freelancer-dashboard");
    else if (userRole === "affiliate") router.push("/affiliate-dashboard");
    else router.push("/client-dashboard");
  }, 1200);


      } else {
        showToast(data.msg || "Invalid credentials", "fa-lock");
      }
    } catch (err) {
      showToast("Server connection failed", "fa-wifi");
    } finally {
      setIsLoading(false);
    }
  };




// ====================== PRODUCTION RENDER ASSURANCE ======================
  // Blocks pre-render layouts until states are safely hydrated from local storage, eliminating blinking bugs
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <header className="main-header">
        {/* Platform Brand Identity / Logo */}
        <div className="logo-container">
          <Link href="/" className="logo" onClick={closeAllUI}>
            <img 
              src="/images/logos/logo-header.png" 
              alt={`${BRAND.pretty} Logo`} 
              className="header-logo-img" 
            />
          </Link>
        </div>

        {/* Desktop Engine Keyword Search Bar Input */}
        <div className="header-search-container" id="desktop-search">
          <form onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="search it here ...."
              className="header-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-icon-btn">
              <i className="fas fa-search search-icon"></i>
            </button>
          </form>
        </div>

        {/* Dynamic Desktop Context Tab Navigation Links */}
        <nav className="top-nav">
          <ul className="nav-list">
            {userRole === 'freelancer' && (
              <>
                <li><Link href="/freelancer-dashboard" className={`nav-link ${currentPath === '/freelancer-dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
                <li><Link href="/freelancer-orders-history" className={`nav-link ${currentPath === '/freelancer-orders-history' ? 'active' : ''}`}>Orders</Link></li>
                <li><Link href="/freelancer-client-management" className={`nav-link ${currentPath === '/freelancer-client-management' ? 'active' : ''}`}>Clients</Link></li>
                <li><Link href="/service-management" className={`nav-link ${currentPath === '/service-management' ? 'active' : ''}`}>Services</Link></li>
              </>
            )}

            {userRole === 'client' && (
              <>
                <li><Link href="/client-dashboard" className={`nav-link ${currentPath === '/client-dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
                <li><Link href="/client-order-history" className={`nav-link ${currentPath === '/client-order-history' ? 'active' : ''}`}>Orders</Link></li>
                <li><Link href="/client-all-friends" className={`nav-link ${currentPath === '/client-all-friends' ? 'active' : ''}`}>Network</Link></li>
              </>
            )}

            {userRole === 'affiliate' && (
              <>
                {/* 1. CAMPAIGNS */}
<li>
  <Link 
    href="/affiliate-dashboard?tab=campaigns" 
    className={`nav-link ${currentPath === '/affiliate-dashboard' && currentTab === 'campaigns' ? 'active' : ''}`}
  >
    Campaigns
  </Link>
</li>

{/* 2. EARNINGS */}
<li>
  <Link 
    href="/affiliate-dashboard?tab=payouts" 
    className={`nav-link ${currentPath === '/affiliate-dashboard' && currentTab === 'payouts' ? 'active' : ''}`}
  >
    Earnings
  </Link>
</li>

{/* 3. MY TEAM */}
<li>
  <Link 
    href="/affiliate-dashboard?tab=referrals" 
    className={`nav-link ${currentPath === '/affiliate-dashboard' && currentTab === 'referrals' ? 'active' : ''}`}
  >
    My Team
  </Link>
</li>
          </>
            )}
          </ul>
        </nav>

        {/* Action Triggers & Dropdown Access Points */}
        <div className="user-actions">
         {isLoggedIn && (
  <>
    {/* BELL: orders + withdrawals */}
    {isAdminRole(userRole) ? (
      <div className="notif-dropdown-container" style={{ position: "relative" }}>
        <button
          type="button"
          className="icon-btn notification-btn"
          title="Notifications"
          onClick={() => setIsNotifOpen((v) => !v)}
          aria-expanded={isNotifOpen}
        >
          <i className="fas fa-bell"></i>
          <span className={`badge ${bellCount > 0 ? "" : "hidden"}`}>
            {bellCount > 99 ? "99+" : bellCount || ""}
          </span>
        </button>

        {isNotifOpen && (
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <strong>Notifications</strong>
            </div>
            {notifItems.length === 0 ? (
              <p className="notif-empty">No pending orders or withdrawals</p>
            ) : (
              <ul className="notif-list">
                {notifItems.map((item) => (
                  <li key={`\( {item.type}- \){item.id}`}>
                    <button
                      type="button"
                      className="notif-item"
                      onClick={() => {
                        setIsNotifOpen(false);
                        router.push(item.href);
                      }}
                    >
                      <span className="notif-type">
                        {item.type === "withdrawal" ? "Withdrawal" : "Order"}
                      </span>
                      <span className="notif-title">{item.title}</span>
                      <span className="notif-sub">{item.subtitle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    ) : (
      <button className="icon-btn notification-btn" title="Notifications">
        <i className="fas fa-bell"></i>
        <span className="badge hidden"></span>
      </button>
    )}

    {/* ENVELOPE: messages only */}
    {isAdminRole(userRole) ? (
      <button
        type="button"
        className="icon-btn notification-bell"
        title="Messages"
        onClick={() => router.push("/admin/messages")}
      >
        <i className="fas fa-envelope"></i>
        <span className={`badge ${messageUnreadCount > 0 ? "" : "hidden"}`}>
          {messageUnreadCount > 99 ? "99+" : messageUnreadCount || ""}
        </span>
      </button>
    ) : (
      <button className="icon-btn notification-bell" title="Messages">
        <i className="fas fa-envelope"></i>
        <span className="badge hidden"></span>
      </button>
    )}
  </>
)}
          <div className="account-dropdown-container">
            <button
              className="icon-btn account-trigger"
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              aria-expanded={isAccountMenuOpen}
              title="Account Menu"
              aria-haspopup="true"
            >
              {isLoggedIn && userProfilePic ? (
                <img src={userProfilePic} alt="Profile" className="user-profile-pic" />
              ) : (
                <i className={`fas ${isLoggedIn ? 'fa-user-circle' : 'fa-user-plus'}`}></i>
              )}
            </button>

            <ul className={`dropdown-menu ${isAccountMenuOpen ? 'is-active' : ''}`} role="menu">
              {getMenuItems()}
            </ul>
          </div>

          <button className="icon-btn menu-toggle" onClick={toggleMobileMenu} aria-label="Open Menu">
            {isLoggedIn && userProfilePic ? (
              <img src={userProfilePic} alt="Profile" className="user-profile-pic" />
            ) : (
              <i className={`fas ${isLoggedIn ? 'fa-user-circle' : 'fa-bars'}`}></i>
            )}
          </button>
        </div>
      </header>

      {/* Responsive Slide-Out Mobile Navigation Panel Drawer */}
      <nav className={`mobile-menu-panel ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-menu-header">
          <h4>{userRole === 'guest' ? "Welcome" : `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Menu`}</h4>
          <i className="fas fa-times close-menu-btn" onClick={closeAllUI}></i>
        </div>

        <div className="mobile-search-container">
          <form onSubmit={handleSearch} style={{ width: '100%' }}>
            <input 
              type="search" 
              placeholder="search here ...." 
              className="header-search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" style={{ display: 'none' }}></button> 
          </form>
          <i className="fas fa-search search-icon" onClick={handleSearch}></i>
        </div>

        <ul className="mobile-main-nav">
          {getMenuItems()}
        </ul>
      </nav>

      {/* Authentication Gateway Dialog Modal Popover Box */}
      <div className={`modal-overlay ${isModalOpen ? 'is-active' : ''}`}>
        <div className="modal-container">
          <button className="modal-close" onClick={closeAllUI}>&times;</button>
          <div className="modal-content-wrapper">
            
            <div className="modal-image-side">
              <div className="image-overlay-text">
                <i className="fas fa-cog logo-icon"></i>
                <h2>Osino<span>Works</span></h2>
                <p>Unlock your professional potential today.</p>
              </div>
            </div>

            <div className="modal-form-side">
              <div className="modal-tabs">
                <button className={`tab-btn ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>Login</button>
                <button className={`tab-btn ${authTab === 'register' ? 'active' : ''}`} onClick={() => setAuthTab('register')}>Register</button>
              </div>

             {/* Login Form Layout View */}
<div id="login-view" className={`auth-view ${authTab === 'login' ? 'active' : ''}`}>
  <h3>Welcome Back</h3>
  <div className="social-auth">
    <button className="btn-social google" onClick={() => handleSocialAuth('google')}>
      <i className="fab fa-google color-google"></i> Continue with Google
    </button>
    <button className="btn-social facebook" onClick={() => handleSocialAuth('facebook')}>
      <i className="fab fa-facebook-f color-facebook"></i> Continue with Facebook
    </button>
  </div>
  
  <div className="divider"><span>OR</span></div>
  
  <form onSubmit={handleLogin}>
    <div className="input-group">
      <input type="email" id="login-email" placeholder="Email Address" required />
      <input type="password" id="login-password" placeholder="Password" required />
    </div>
    <button type="submit" className="btn-primary full-width-btn" disabled={isLoading}>
      {isLoading ? (
        <div className="dots-spinner">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      ) : (
        "Login"
      )}
    </button>
  </form>
</div>
             
              {/* Registration Form Layout View */}
              <div id="register-view" className={`auth-view ${authTab === 'register' ? 'active' : ''}`}>
                <h3>Create Account</h3>
                <div className="social-auth">
                  <button className="btn-social google" onClick={() => handleSocialAuth('google')}>
                    <i className="fab fa-google color-google"></i> Sign up with Google
                  </button>
                </div>
                
                <div className="divider"><span>OR</span></div>
                
                <form onSubmit={handleRegister}>
                  <div className="input-group">
                    <input type="email" id="reg-email" placeholder="Email Address" required />
                    <input 
                      type="password" 
                      id="reg-password" 
                      placeholder="Create Password (min. 8 characters)" 
                      minLength={8}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-primary full-width-btn" disabled={isLoading}>
                    {isLoading ? (
                      <div className="dots-spinner">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    ) : (
                      "Continue"
                    )}
                  </button>
                  <p className="legal-note">
  By joining, you agree to our{" "}
  <Link href="/terms-and-privacy?tab=terms" onClick={closeAllUI}>
    Terms of Service
  </Link>{" "}
  and{" "}
  <Link href="/terms-and-privacy?tab=privacy" onClick={closeAllUI}>
    Privacy Policy
  </Link>
  .
</p>
                </form>
              </div>
              

            </div>
          </div>
        </div>
      </div>

      {/* Floating System Application Action Notification Toast Container */}
      {toast.visible && (
        <div id="toast-container">
          <div className="toast fade-in">
            <i className={`fas ${toast.icon}`}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;