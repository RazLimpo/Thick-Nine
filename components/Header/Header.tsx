"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const Header = () => {
  const router = useRouter();
  const currentPath = usePathname();

  // States
  
  // Replace your existing state declarations with these
  
  // 1. Initialize all Auth-related states immediately
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('isLoggedIn') === 'true';
    return false;
  });

  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('userRole') || 'guest';
    return 'guest';
  });

  const [userProfilePic, setUserProfilePic] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('userPhoto');
    return null;
  });

  // 2. Initialize secondary status flags
  const [isEmailVerified, setIsEmailVerified] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('isEmailVerified') === 'true';
    return false;
  });

  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('isProfileComplete') === 'true';
    return false;
  });

 
  
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [toast, setToast] = useState({ visible: false, message: '', icon: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);     //
 

  // ====================== HELPER FUNCTIONS ======================

  const closeAllUI = () => {
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsModalOpen(false);
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    closeAllUI();
    setAuthTab(tab);
    setIsModalOpen(true);
  };

  const showToast = (message: string, icon: string = 'fa-info-circle') => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast({ visible: false, message: '', icon: '' }), 3000);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
    if (!isMobileMenuOpen) {
      setIsAccountMenuOpen(false);
      setIsModalOpen(false);
    }
  };

const handleAccountSwitching = () => {
    const currentRole = localStorage.getItem('userRole') || 'client';
    // NEW: Get the strength value we just saved
    const strength = parseInt(localStorage.getItem('accountStrength') || '0');
    
    let newRole: 'client' | 'freelancer' | 'affiliate' = 'client';

    // NEW Logic: If switching to freelancer, check strength first
    if (currentRole === 'client') {
      if (strength < 60) {
        showToast("Profile strength too low (under 60%). Please update your profile!", "fa-lock");
        return; // This stops the switch from happening
      }
      newRole = 'freelancer';
    } 
    else if (currentRole === 'freelancer') newRole = 'affiliate';
    else newRole = 'client';

    localStorage.setItem('userRole', newRole);
    setUserRole(newRole);
    
    window.dispatchEvent(new Event('userRoleChanged'));
    closeAllUI();
    showToast(`Switched to ${newRole.toUpperCase()} mode`, "fa-exchange-alt");

    if (newRole === 'freelancer') router.push('/freelancer-dashboard');
    else if (newRole === 'client') router.push('/client-dashboard');
    else if (newRole === 'affiliate') router.push('/affiliate-dashboard');
  };

  const getSwitcherText = () => {
    if (userRole === 'client') return "Switch to Freelancing";
    if (userRole === 'freelancer') return "Switch to Affiliate";
    return "Switch to Buying";
  };

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


  

// ====================== SECURITY GUARD ======================

  const checkSecurity = useCallback(() => {
    if (typeof window === 'undefined') return;

    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const emailVerified = localStorage.getItem('isEmailVerified') === 'true';
    const profileDone = localStorage.getItem('isProfileComplete') === 'true';
    const role = localStorage.getItem('userRole') || 'guest';
    const photo = localStorage.getItem('userPhoto');

    const effectiveRole = loggedIn ? role : 'guest';

    // Update states and DOM attribute
    setIsLoggedIn(loggedIn);
    setIsEmailVerified(emailVerified);
    setIsProfileComplete(profileDone);
    setUserRole(effectiveRole); 
    setUserProfilePic(photo); 
    
    document.body.setAttribute('data-user-role', effectiveRole); 

    const safePages = [
      '/', '/search-results', '/about', '/terms', '/privacy',
      '/service-details', '/freelancer-profile', '/verify-email', '/mandatory'
    ];
    const isSafePage = safePages.includes(currentPath || '');

    if (!isSafePage) {
      if (!loggedIn) {
        // Use setTimeout to prevent modal from opening during initial render
        setTimeout(() => {
          openAuthModal('login');
        }, 50);
      } else if (!emailVerified && currentPath !== '/verify-email') {
        router.push('/verify-email');
      } else if (emailVerified && !profileDone && currentPath !== '/mandatory') {
        router.push('/mandatory');
      }
    }
  }, [currentPath, router, openAuthModal]);
    
    
    
    // ====================== SECURITY GUARD: PART 2 (THE LISTENER) ======================

 // ====================== SECURITY GUARD: PART 2 (THE LISTENER) ======================

  useEffect(() => {
    // 1. Run the security check immediately when the header loads
    checkSecurity();
    
    // 2. Mark component as mounted after first sync (prevents hydration mismatch)
    setIsMounted(true);

    // 3. Listen for changes in other browser tabs
    window.addEventListener('storage', checkSecurity);

    // 4. ADDED: Listen for the internal role switch event we created
    window.addEventListener('userRoleChanged', checkSecurity);
    
    // 5. Clean up
    return () => {
      window.removeEventListener('storage', checkSecurity);
      // REMEMBER: Always remove the listener you added above
      window.removeEventListener('userRoleChanged', checkSecurity);
    };
  }, [checkSecurity]);
    


  // Click outside to close account menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!event.target || !(event.target as Element).closest('.account-dropdown-container')) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ====================== SEARCH ======================
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length > 0) {
      const encodedQuery = encodeURIComponent(trimmedQuery);
      setIsMobileMenuOpen(false);
      router.push(`/search-results?q=${encodedQuery}`);
    } else {
      showToast("Please enter something to search", "fa-search");
    }
  };

  // ====================== MENU ITEMS - SHARED ======================
  const getMenuItems = () => {
    const items: React.ReactNode[] = [];

    if (!isLoggedIn) {
      items.push(
        <li key="register"><button onClick={() => openAuthModal('register')} className="register-link" role="menuitem"><i className="fas fa-user-plus"></i> Register</button></li>,
        <li key="login"><button onClick={() => openAuthModal('login')} className="login-link" role="menuitem"><i className="fas fa-sign-in-alt"></i> Login</button></li>
      );
      return items;
    }

    let profilePath = "/client-profile";
    if (userRole === 'freelancer') profilePath = "/freelancer-profile";
    else if (userRole === 'affiliate') profilePath = "/affiliate-profile";

    items.push(
      <li key="profile"><Link href={profilePath} role="menuitem"><i className="fas fa-user"></i> Profile</Link></li>
    );

    if (userRole === 'freelancer') {
      items.push(
        <li key="f-orders"><Link href="/withdrawal"><i className="fas fa-spinner"></i> Order Management</Link></li>,
        <li key="f-withdraw"><Link href="/withdrawal"><i className="fas fa-wallet"></i> Withdrawal</Link></li>,
        <li key="f-stats"><Link href="/stats"><i className="fas fa-chart-line"></i> Stats</Link></li>,
        <li key="f-clients"><Link href="/client-management"><i className="fas fa-users"></i> Clients</Link></li>,
        <li key="f-settings"><Link href="/settings"><i className="fas fa-cog"></i> Settings</Link></li>
      );
    } else if (userRole === 'client') {
      items.push(<li key="b-settings"><Link href="/settings"><i className="fas fa-cog"></i> Account Settings</Link></li>);
    } else if (userRole === 'affiliate') {
      items.push(
        <li key="a-dash"><Link href="/dashboard"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>,
        <li key="a-settings"><Link href="/settings"><i className="fas fa-cog"></i> Settings</Link></li>
      );
    }

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

  // ====================== AUTH HANDLERS ======================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role || 'client');
        localStorage.setItem('registrationTimestamp', Date.now().toString());

        setIsLoggedIn(true);
        setUserRole(data.user.role || 'client');
        showToast("Account created! Check email to verify.", "fa-user-check");
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        
        // ADD THIS LINE TO SAVE ACCOUNT STRENGTH 
        localStorage.setItem('accountStrength', (data.user.accountStrength || 0).toString()); 

        setIsLoggedIn(true);
        setUserRole(data.user.role || 'client');
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



 // ====================== RENDER ======================
  
  // Prevent hydration mismatch - only render dynamic content after client has synced auth state
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <header className="main-header">
        {/* Logo & Search */}
        <div className="logo-container">
          <Link href="/" className="logo">
            <img src="/logo-header.png" alt="Thick 9 Logo" className="header-logo-img" />
          </Link>
        </div>

        {/* Desktop Search - Restoring ID for CSS/Scripting compatibility */}
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



        {/* Desktop Navigation */}
       
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
        
        

        {/* User Actions */}
        <div className="user-actions">
          {isLoggedIn && (
  <>
    <button className="icon-btn notification-btn" title="Notifications">
      <i className="fas fa-bell"></i>
      <span className="badge"></span>
    </button>
    
    <button className="icon-btn notification-bell" title="Messages">
      <i className="fas fa-envelope"></i>
      <span className="badge"></span> 
    </button>
  </>
)}

          <div className="account-dropdown-container">
          <button
  className="account-trigger"
  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
  aria-expanded={isAccountMenuOpen}
  title="Account Menu" // Restoring tooltip from Header-A
  aria-haspopup="true" // Tells the browser this button opens a menu
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

      {/* Mobile Menu */}
      <nav className={`mobile-menu-panel ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-menu-header">
          <h4>{userRole === 'guest' ? "Welcome" : `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Menu`}</h4>
          <i className="fas fa-times close-menu-btn" onClick={closeAllUI}></i>
        </div>

        {/* Mobile Search - Restoring the clickable icon */}
<div className="mobile-search-container">
    <form 
        onSubmit={(e) => {
            e.preventDefault();
            handleSearch(e);
            setIsMobileMenuOpen(false); 
        }} 
        style={{ width: '100%' }}
    >
        <input 
            type="search" 
            placeholder="search here ...." 
            className="header-search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" style={{ display: 'none' }}></button> 
    </form>
    
    <i 
        className="fas fa-search search-icon" 
        onClick={() => {
            // Create a minimal event object to satisfy handleSearch
            handleSearch({ preventDefault: () => {} } as React.FormEvent);
            setIsMobileMenuOpen(false);
        }}
    ></i>
</div>

        <ul className="mobile-main-nav">
          {getMenuItems()}
        </ul>
      </nav>

      {/* Auth Modal */}
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

              {/* Login Form */}
              {/* Restoring brand color classes and view IDs for CSS hooks */}
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
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                </form>
              </div>

              {/* Register Form */}
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
                    {isLoading ? "Creating Account..." : "Continue"}
                  </button>
                  <p className="legal-note">
                    By joining, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
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