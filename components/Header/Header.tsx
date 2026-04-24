// --- First Section ---

"use client"; // This MUST be the very first line 

import React, { useState, useEffect } from 'react'; 
import Link from 'next/link'; 
import { useRouter, usePathname } from 'next/navigation'; 


const Header = () => { 
  const router = useRouter();
  const currentPath = usePathname(); // Tracks the URL for the security guard

  // A. AUTH STATES
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userRole, setUserRole] = useState('guest');

  // B. UI STATES (FIXED: Added missing states needed for Step 2.2 and 1.5)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [toast, setToast] = useState({ visible: false, message: '', icon: '' });

 

// --- 2.1 THE SECURITY GUARD ---
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const profileDone = localStorage.getItem('isProfileComplete') === 'true';
    const role = localStorage.getItem('userRole') || 'guest';

    setIsLoggedIn(loggedIn);
    setIsProfileComplete(profileDone);
    setUserRole(loggedIn ? role : 'guest');

    const safePages = ['/', '/search', '/mandatory', '/verify-email', '/about'];

    if (!safePages.includes(currentPath)) {
      if (!loggedIn) {
        setTimeout(() => openAuthModal('register'), 100);
      } else if (!profileDone && currentPath !== '/mandatory') {
        router.push('/mandatory');
      }
    }
  }, [currentPath]); // Dependency on path change

  // --- 2.2 UI MANAGEMENT HANDLERS ---
  const showToast = (message: string, icon: string) => {
    setToast({ visible: true, message, icon });
    setTimeout(() => setToast({ visible: false, message: '', icon: '' }), 3000);
  };

  const openAuthModal = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setIsModalOpen(true);
  };

  const toggleAccountMenu = () => setIsAccountMenuOpen(!isAccountMenuOpen);

  const closeAllUI = () => {
    setIsMobileMenuOpen(false);
    setIsModalOpen(false);
    setIsAccountMenuOpen(false);
    document.body.style.overflow = 'auto';
  };

  const toggleMobileMenu = () => {
    if (!isMobileMenuOpen) {
      closeAllUI();
      setIsMobileMenuOpen(true);
      document.body.style.overflow = 'hidden';
    } else {
      closeAllUI();
    }
  };





 





// --- 2.3 ROLE-BASED UI HELPERS ---

  // This helper function handles the dynamic text for your account switcher
  // Replaces the innerHTML manipulation from Section 3 of header.js
  const getSwitcherText = () => {
    if (!isLoggedIn) return "";
    const roleName = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    return `Switch from ${roleName}`;
  };

  // This replaces the .textContent logic for the menu titles
  const getMenuTitle = () => {
    if (userRole === 'guest') return "Welcome";
    return `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Menu`;
  };




// --- 2.4 ACCOUNT SWITCHING LOGIC ---

  /**
   * Replaces the handleAccountSwitching function.
   * Instead of manual DOM manipulation, we update the React state.
   */
  const handleAccountSwitching = (e: React.MouseEvent) => {
    if (e) e.preventDefault(); // Prevents page jump if clicked on an <a> tag
    
    const roles = ['buyer', 'freelancer', 'affiliate'];
    // We use the 'userRole' variable from our React State (Stage 2.1)
    const nextIndex = (roles.indexOf(userRole) + 1) % roles.length;
    const newRole = roles[nextIndex];

    // A. Update Persistent Storage
    localStorage.setItem('userRole', newRole);
    
    // B. Update React State (This automatically triggers Stage 2.3 updates)
    setUserRole(newRole);

    // C. Close menus after switching (matches your prototype behavior)
    closeAllUI();

    // D. Show Notification
    const roleName = newRole.charAt(0).toUpperCase() + newRole.slice(1);
    showToast(`Switched to ${roleName} mode`, 'fa-exchange-alt');
  };





// --- 2.5 AUTH INTERACTION (BACKEND API CALLS) ---

  /**
   * Replaces the Registration Form submit listener.
   * Uses React's FormEvent and async/await.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // We can still use getElementById or state; staying close to your logic:
    const email = (document.getElementById('reg-email') as HTMLInputElement).value;
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;

    const userData = {
      fullName: "New User", 
      username: email.split('@')[0], 
      email: email,
      password: password,
      role: "buyer" 
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        
        showToast("Account created successfully!", "fa-user-check");
        
        // Next.js redirect instead of window.location
        setTimeout(() => { router.push('/mandatory'); }, 1500);
      } else {
        showToast(data.msg || "Registration failed", "fa-exclamation-triangle");
      }
    } catch (err) {
      showToast("Server is offline. Try again later.", "fa-wifi");
    }
  };

  /**
   * Replaces the Login Form submit listener.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Selecting inputs exactly like your prototype Section 8
    const form = e.currentTarget as HTMLFormElement;
    const emailInput = form.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = form.querySelector('input[type="password"]') as HTMLInputElement;

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailInput.value, 
          password: passwordInput.value 
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        
        showToast(`Welcome back, ${data.user.fullName || 'User'}!`, "fa-sign-in-alt");
        
        // Redirect to home/index after login
        setTimeout(() => { router.push('/'); }, 1500);
      } else {
        showToast(data.msg || "Invalid credentials", "fa-lock");
      }
    } catch (err) {
      showToast("Server connection failed", "fa-wifi");
    }
  };






// --- 2.6 LOGOUT & SOCIAL AUTH ---

  /**
   * Replaces the .sign-out-link event listeners.
   * Cleans up the session and redirects to the home page.
   */
  const handleSignOut = (e: React.MouseEvent) => {
    if (e) e.preventDefault(); // Prevents default link behavior
    
    // A. Clear session flags exactly like your prototype
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token'); // Also clearing the JWT token for security
    
    // B. Update local state so the UI changes immediately
    setIsLoggedIn(false);
    setUserRole('guest');
    
    // C. Close any open menus
    closeAllUI();
    
    // D. Redirect to home using Next.js router
    router.push('/');
  };

  /**
   * Replaces the window.simulateSocialAuth function.
   * Handles the temporary data storage before the mandatory profile step.
   */
  const handleSocialAuth = (provider: string) => {
    // Replicating your dummy data exactly
    const dummyData = { 
        email: "user@example.com", 
        name: "John Doe", 
        photo: "https://via.placeholder.com/150" 
    };
    
    // Save to localStorage for the mandatory.html (now /mandatory) page to read
    localStorage.setItem('tempAuthData', JSON.stringify(dummyData));
    
    // Redirect to the profile completion page
    router.push('/mandatory');
  };

  




return (
    <>  
{/* 1.1 LOGO & SEARCH */}
<div className="logo-container">
    <Link href="/" className="logo">
        <img src="../images/logos/logo-header.png" alt="Thick 9 Logo" className="header-logo-img" />
    </Link>
</div>

<div className="header-search-container" id="desktop-search">
    <input 
        type="search" 
        placeholder="what are you looking for ...." 
        className="header-search-input" 
    />
    <i className="fas fa-search search-icon"></i>
</div>




{/* 1.2 DESKTOP NAVIGATION */}
<nav className="top-nav">
    <ul className="nav-list">
        {/* Freelancer Specific Links */}
        {userRole === 'freelancer' && (
            <>
                <li><Link href="/freelancer-dashboard" className="nav-link">Dashboard</Link></li>
                <li><Link href="/freelancer-orders-history" className="nav-link active">Orders</Link></li>
                <li><Link href="/freelancer-client-management" className="nav-link">Clients</Link></li>
                <li><Link href="/service-manager" className="nav-link">Services</Link></li>
            </>
        )}

        {/* Buyer Specific Links */}
        {userRole === 'buyer' && (
            <>
                <li><Link href="/client-dashboard" className="nav-link">Dashboard</Link></li>
                <li><Link href="/client-order-history" className="nav-link active">Orders</Link></li>
                <li><Link href="/client-all-friends" className="nav-link">Network</Link></li>
            </>
        )}
    </ul>
</nav>




{/* 1.3 USER ACTIONS & ACCOUNT DROPDOWN */}
<div className="user-actions">
    {/* Notifications - Shown to any 'member' (logged-in user) */}
    {isLoggedIn && (
        <div className="header-notifications">
            <div className="icon-btn notification-bell" title="Messages">
                <i className="fas fa-envelope"></i>
                <span className="badge">3</span> 
            </div>
            <div className="icon-btn notification-bell" title="Notifications">
                <i className="fas fa-bell"></i>
                <span className="badge">3</span> 
            </div>
        </div>
    )}

    <div className="account-dropdown-container">
        <button 
            id="account-icon-btn" 
            className="icon-btn account-icon" 
            aria-expanded={isAccountMenuOpen}
            title="Account Menu"
            onClick={toggleAccountMenu} // Wire this to a function later
        >
            <i className={userRole === 'guest' ? "fas fa-sign-in-alt" : "fas fa-user-circle"}></i>
        </button>
        
        {/* The Menu List */}
        <ul id="account-menu" className={`dropdown-menu ${isAccountMenuOpen ? 'is-active' : ''}`} role="menu">
            {/* GUEST SECTION */}
            {!isLoggedIn && (
                <>
                    <li>
                        <button onClick={() => openAuthModal('register')} className="register-link" role="menuitem">
                            <i className="fas fa-user-plus"></i> Register
                        </button>
                    </li>
                    <li>
                        <button onClick={() => openAuthModal('login')} className="login-link" role="menuitem">
                            <i className="fas fa-sign-in-alt"></i> Login
                        </button>
                    </li>
                </>
            )}

            {/* MEMBER SECTION (Any logged-in user) */}
            {isLoggedIn && (
                <li><Link href="/profile" role="menuitem"><i className="fas fa-user"></i> Profile</Link></li>
            )}

            {/* FREELANCER SECTION */}
            {userRole === 'freelancer' && (
                <>
                    <li><Link href="/withdrawal" role="menuitem"><i className="fas fa-spinner"></i> Order Management</Link></li>
                    <li><Link href="/withdrawal" role="menuitem"><i className="fas fa-wallet"></i> Withdrawal</Link></li>
                    <li><Link href="/stats" role="menuitem"><i className="fas fa-chart-line"></i> Stats & Insight</Link></li>
                    <li><Link href="/client-management" role="menuitem"><i className="fas fa-users"></i> Client Management</Link></li>
                    <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
                </>
            )}

            {/* BUYER SECTION */}
            {userRole === 'buyer' && (
                <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
            )}

            {/* AFFILIATE SECTION */}
            {userRole === 'affiliate' && (
                <>
                    <li><Link href="/dashboard" role="menuitem"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>
                    <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
                </>
            )}
           
            {/* UNIVERSAL ITEMS */}
            <li>
                <button onClick={handleAccountSwitching} className="account-switcher" role="menuitem">
                    <i className="fas fa-exchange-alt"></i> Account Switching
                </button>
            </li>
            
            {isLoggedIn && (
                <li>
                    <button onClick={handleSignOut} className="sign-out-link" role="menuitem">
                        <i className="fas fa-sign-out-alt"></i> Sign Out
                    </button>
                </li>
            )}
        </ul>
    </div>
    
    <button className="icon-btn menu-toggle" id="menu-toggle-btn" onClick={toggleMobileMenu}>
        <i className="fas fa-bars"></i>
    </button>
</div>





{/* 1.4 MOBILE MENU PANEL */}
<nav className={`mobile-menu-panel ${isMobileMenuOpen ? 'is-open' : ''}`} id="mobile-menu-panel">
    <div className="mobile-menu-header">
        <h4 className="menu-title">
            {userRole === 'guest' ? "Welcome" : `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Menu`}
        </h4>
        <i className="fas fa-times close-menu-btn" id="close-menu-btn" onClick={closeAllUI}></i>
    </div>
    
    <div className="mobile-search-container">
        <input type="search" placeholder="search here ...." className="header-search-input" />
        <i className="fas fa-search search-icon"></i>
    </div>
    
    <ul className="mobile-main-nav">
        {/* GUEST SECTION */}
        {!isLoggedIn && (
            <>
                <li>
                    <button onClick={() => openAuthModal('register')} className="register-link" role="menuitem">
                        <i className="fas fa-user-plus"></i> Register
                    </button>
                </li>
                <li>
                    <button onClick={() => openAuthModal('login')} className="login-link" role="menuitem">
                        <i className="fas fa-sign-in-alt"></i> Login
                    </button>
                </li>
            </>
        )}
        
        {/* MEMBER SECTION */}
        {isLoggedIn && (
            <li><Link href="/profile" role="menuitem"><i className="fas fa-user"></i> Profile</Link></li>
        )}

        {/* FREELANCER SECTION */}
        {userRole === 'freelancer' && (
            <>
                <li><Link href="/withdrawal" role="menuitem"><i className="fas fa-spinner"></i> Order Management</Link></li>
                <li><Link href="/withdrawal" role="menuitem"><i className="fas fa-wallet"></i> Withdrawal</Link></li>
                <li><Link href="/stats" role="menuitem"><i className="fas fa-chart-line"></i> Stats & Insight</Link></li>
                <li><Link href="/client-management" role="menuitem"><i className="fas fa-users"></i> Client Management</Link></li>
                <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
            </>
        )}

        {/* BUYER SECTION */}
        {userRole === 'buyer' && (
            <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
        )}

        {/* AFFILIATE SECTION */}
        {userRole === 'affiliate' && (
            <>
                <li><Link href="/dashboard" role="menuitem"><i className="fas fa-tachometer-alt"></i> Dashboard</Link></li>
                <li><Link href="/settings" role="menuitem"><i className="fas fa-cog"></i> Account Settings</Link></li>
            </>
        )}
        
        {/* MOBILE SWITCHER & LOGOUT */}
        <li>
            <button onClick={handleAccountSwitching} className="account-switcher" role="menuitem">
                <i className="fas fa-exchange-alt"></i> Account Switching
            </button>
        </li>
       
        {isLoggedIn && (
            <li>
                <button onClick={handleSignOut} className="sign-out-link" role="menuitem">
                    <i className="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </li>
        )}
    </ul>
</nav>




{/* 1.5 AUTH MODAL (Login & Register) */}
<div id="auth-modal" className={`modal-overlay ${isModalOpen ? 'is-active' : ''}`}>
    <div className="modal-container">
        <button className="modal-close" id="close-auth-modal" onClick={closeAllUI}>&times;</button>
        <div className="modal-content-wrapper">
            
            {/* Left Side: Branding */}
            <div className="modal-image-side">
                <div className="image-overlay-text">
                    <i className="fas fa-cog logo-icon"></i>
                    <h2>Osino<span>Works</span></h2>
                    <p>Unlock your professional potential today.</p>
                </div>
            </div>

            {/* Right Side: Forms */}
            <div className="modal-form-side">
                <div className="modal-tabs">
                    <button 
                        className={`tab-btn ${authTab === 'login' ? 'active' : ''}`} 
                        onClick={() => setAuthTab('login')}
                    >
                        Login
                    </button>
                    <button 
                        className={`tab-btn ${authTab === 'register' ? 'active' : ''}`} 
                        onClick={() => setAuthTab('register')}
                    >
                        Register
                    </button>
                </div>

                {/* Login View */}
                <div id="login-view" className={`auth-view ${authTab === 'login' ? 'active' : ''}`}>
                    <h3>Welcome Back</h3>
                    <div className="social-auth">
                        <button className="btn-social google" onClick={() => handleSocialAuth('google')}>
                            <i className="fab fa-google color-google"></i> Continue with Google
                        </button>
                        <button className="btn-social facebook" onClick={() => window.simulateSocialAuth('facebook')}>
                            <i className="fab fa-facebook-f color-facebook"></i> Continue with Facebook
                        </button>
                    </div>
                    <div className="divider"><span>OR</span></div>
                    <form id="login-form" onSubmit={handleLogin}>
                        <div className="input-group">
                            <input type="email" placeholder="Email Address" required />
                            <input type="password" placeholder="Password" required />
                        </div>
                        <button type="submit" className="btn-primary full-width-btn">Login</button>
                    </form>
                </div>

                {/* Register View */}
                <div id="register-view" className={`auth-view ${authTab === 'register' ? 'active' : ''}`}>
                    <h3>Create Account</h3>
                    <div className="social-auth">
                        <button className="btn-social google" onClick={() => window.simulateSocialAuth('google')}>
                            <i className="fab fa-google color-google"></i> Sign up with Google
                        </button>
                    </div>
                    <div className="divider"><span>OR</span></div>
                    <form id="register-form" onSubmit={handleRegister}>
                        <div className="input-group">
                            <input type="email" id="reg-email" placeholder="Email Address" required />
                            <input type="password" id="reg-password" placeholder="Create Password" required />
                        </div>
                        <button type="submit" className="btn-primary full-width-btn">Continue</button>
                        <p className="legal-note">
                            By joining, you agree to our 
                            <Link href="/terms">Terms of Service</Link> and 
                            <Link href="/privacy">Privacy Policy</Link>.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

{/* 1.6 DYNAMIC TOAST NOTIFICATION */}
{toast.visible && (
    <div id="toast-container">
        <div className="toast fade-in">
            <i className={`fas ${toast.icon}`}></i>
            <span>{toast.message}</span>
        </div>
    </div>
)}

</>

); // This closes the return statement

}; // This closes the Header component itself








export default Header;
