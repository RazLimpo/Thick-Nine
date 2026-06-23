"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BRAND, API_BASE_URL } from '@/lib/constants'; // Your centralized configuration file

// Define structural types for cleaner component data mapping
interface ToastState {
  visible: boolean;
  message: string;
  icon: string;
}

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

  const [toast, setToast] = useState<ToastState>({ 
    visible: false, 
    message: '', 
    icon: '' 
  });
    
    
    
    
    
    
    
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
  const handleAccountSwitching = () => {
    // 1. Grab values safely from browser environment storage with default fallbacks
    const currentRole = localStorage.getItem('userRole') || 'client';
    const storageStrength = localStorage.getItem('accountStrength');
    
    // Parse baseline tier strength safely (default to 50 matching starter DB tier schemas)
    const strength = storageStrength ? parseInt(storageStrength, 10) : 50;
    
    let newRole: 'client' | 'freelancer' | 'affiliate' = 'client';

    // 2. Set up the explicit circular account rotation
    if (currentRole === 'client') {
      newRole = 'freelancer';
    } else if (currentRole === 'freelancer') {
      newRole = 'affiliate';
    } else {
      newRole = 'client';
    }

    // 3. THE PRODUCTION SECURITY GATE: Stop execution if profile strength criteria is unmet
    if (newRole === 'freelancer' && strength < 60) {
      closeAllUI(); // Cleanly close dropdown menu overlay
      showToast(`Profile strength too low (${strength}%). Please complete your profile to unlock Freelancing!`, "fa-lock");
      return; // HARD ABORT: Do not alter local states or push route switches
    }

    // Safety fallback block handling unbuilt layout branches gracefully
    if (newRole === 'affiliate') {
      closeAllUI();
      showToast("Affiliate mode is coming soon! Staying in Buying mode.", "fa-info-circle");
      return;
    }

    // 4. Commit verified authorization changes to local records and update states
    localStorage.setItem('userRole', newRole);
    setUserRole(newRole);
    
    // Announce configuration changes cleanly to secondary mounted event listeners
    window.dispatchEvent(new Event('userRoleChanged'));
    closeAllUI();
    showToast(`Switched to ${newRole.toUpperCase()} mode`, "fa-exchange-alt");

    // Push the browser route context directly based on the new validated tier
    if (newRole === 'freelancer') router.push('/freelancer-dashboard');
    else if (newRole === 'client') router.push('/client-dashboard');
  };
    
  // Generates clean action button strings dynamically depending on the active state
  const getSwitcherText = () => {
    if (userRole === 'client') return "Switch to Freelancing";
    if (userRole === 'freelancer') return "Switch to Affiliate";
    return "Switch to Buying";
  };

  // Clears active authorization records cleanly and routes back to the root page context
  const handleSignOut = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
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

  const handleSocialAuth = (provider: string) => {
    const dummyData = { 
      email: "user@example.com", 
      name: "New User", 
      photo: "https://via.placeholder.com/150" 
    };
    localStorage.setItem('tempAuthData', JSON.stringify(dummyData));
    router.push('/mandatory');
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
      '/', '/search-results', '/about', '/terms', '/privacy',
      '/service-details', '/freelancer-profile', '/verify-email', '/mandatory'
    ];
    const isSafePage = safePages.includes(currentPath || '');

    if (!isSafePage) {
      if (!loggedIn) {
        setTimeout(() => openAuthModal('login'), 100); 
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

  // Click Outside Listener: Smoothly collapses the account profile dropdown menu box when clicking away
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!event.target || !(event.target as Element).closest('.account-dropdown-container')) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (userRole === 'freelancer') profilePath = "/freelancer-profile";
    else if (userRole === 'affiliate') profilePath = "/affiliate-profile";

    // Build common links shared across authorized profiles
    items.push(
      <li key="profile">
        <Link href={profilePath} role="menuitem" onClick={closeAllUI}>
          <i className="fas fa-user"></i> Profile
        </Link>
      </li>
    );

    // Append Role-Specific Sub-Menu Lists
    if (userRole === 'freelancer') {
      items.push(
        <li key="f-orders"><Link href="/withdrawal" onClick={closeAllUI}><i className="fas fa-spinner"></i> Order Management</Link></li>,
        <li key="f-withdraw"><Link href="/withdrawal" onClick={closeAllUI}><i className="fas fa-wallet"></i> Withdrawal</Link></li>,
        <li key="f-stats"><Link href="/stats" onClick={closeAllUI}><i className="fas fa-chart-line"></i> Stats</Link></li>,
        <li key="f-clients"><Link href="/client-management" onClick={closeAllUI}><i className="fas fa-users"></i> Clients</Link></li>,
        <li key="f-settings"><Link href="/settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Settings</Link></li>
      );
    } else if (userRole === 'client') {
      items.push(
        <li key="b-settings"><Link href="/settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Account Settings</Link></li>
      );
    } else if (userRole === 'affiliate') {
      items.push(
        <li key="a-dash"><Link href="/dashboard" onClick={closeAllUI}><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>,
        <li key="a-settings"><Link href="/settings" onClick={closeAllUI}><i className="fas fa-cog"></i> Settings</Link></li>
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

    if (isLoading) return;
    setIsLoading(true);

    const userData = { fullName: "New User", username: email.split('@')[0], email, password, role: "client" };

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
  
    const form = e.currentTarget as HTMLFormElement;
    const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;

    if (!emailInput?.value || !passwordInput?.value) {
      showToast("Please enter email and password", "fa-exclamation-triangle");
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role || 'client');
        localStorage.setItem('accountStrength', (data.user.accountStrength || 0).toString()); 
        localStorage.setItem('isEmailVerified', (data.user.isEmailVerified ?? false).toString());
        localStorage.setItem('isProfileComplete', (data.user.isProfileComplete ?? false).toString());

        setIsLoggedIn(true);
        setUserRole(data.user.role || 'client');
        setIsEmailVerified(data.user.isEmailVerified ?? false);
        setIsProfileComplete(data.user.isProfileComplete ?? false);
        
        closeAllUI();      
        showToast(`Welcome back, ${data.user.fullName || 'User'}!`, "fa-sign-in-alt");
        setTimeout(() => router.push('/'), 1200);
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
                <li><Link href="/service-manager" className={`nav-link ${currentPath === '/service-manager' ? 'active' : ''}`}>Services</Link></li>
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
                <li><Link href="/dashboard" className={`nav-link ${currentPath === '/dashboard' ? 'active' : ''}`}>Dashboard</Link></li>
                <li><Link href="/affiliate-stats" className={`nav-link ${currentPath === '/affiliate-stats' ? 'active' : ''}`}>Stats</Link></li>
                <li><Link href="/affiliate-campaigns" className={`nav-link ${currentPath === '/affiliate-campaigns' ? 'active' : ''}`}>Campaigns</Link></li>
              </>
            )}
          </ul>
        </nav>

        {/* Action Triggers & Dropdown Access Points */}
        <div className="user-actions">
          {isLoggedIn && (
            <>
              <button className="icon-btn notification-btn" title="Notifications">
                <i className="fas fa-bell"></i>
                <span className="badge hidden"></span>
              </button>
              
              <button className="icon-btn notification-bell" title="Messages">
                <i className="fas fa-envelope"></i>
                <span className="badge hidden"></span> 
              </button>
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
                    <input type="email" placeholder="Email Address" required />
                    <input type="password" placeholder="Password" required />
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
                    <input type="password" id="reg-password" placeholder="Create Password" required />
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
                    By joining, you agree to our <Link href="/terms" onClick={closeAllUI}>Terms of Service</Link> and <Link href="/privacy" onClick={closeAllUI}>Privacy Policy</Link>.
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