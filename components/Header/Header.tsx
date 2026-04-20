'use client';   // ← MUST BE THE VERY FIRST LINE (no comments above it)

import React from 'react';
import './header.css';
import { useHeader } from './header';

const Header: React.FC = () => {
  const {
    isLoggedIn,
    userRole,
    mobileMenuOpen,
    accountMenuOpen,
    authModalOpen,
    activeAuthTab,
    toasts,
    accountBtnRef,
    accountMenuRef,
    openMobileMenu,
    closeMobileMenu,
    toggleAccountMenu,
    handleAccountSwitching,
    handleLogout,
    openAuthModal,
    closeAuthModal,
    switchAuthTab,
    simulateSocialAuth,
  } = useHeader();

  return (
    <>
      <header className="main-header">
        <div className="logo-container">
          <a href="index.html" className="logo">
            <img src="images/logos/logo-header.png" alt="Thick 9 Logo" className="header-logo-img" />
          </a>
        </div>

        <div className="header-search-container" id="desktop-search">
          <input type="search" placeholder="what are you looking for now ...." className="header-search-input" />
          <i className="fas fa-search search-icon"></i>
        </div>

        <nav className="top-nav">
  <ul style={{ display: 'flex', gap: '20px', listStyle: 'none', margin: 0, padding: 0 }}>
    {userRole === 'freelancer' && (
      <>
        <li><a href="freelancer-dashboard.html" className="nav-link">Dashboard</a></li>
        <li><a href="freelancer-order-history.html" className="nav-link active">Orders</a></li>
        <li><a href="freelancer-client-management.html" className="nav-link">Clients</a></li>
        <li><a href="service-manager.html" className="nav-link">Services</a></li>
      </>
    )}
    {userRole === 'buyer' && (
      <>
        <li><a href="client-dashboard.html" className="nav-link">Dashboard</a></li>
        <li><a href="client-order-history.html" className="nav-link active">Orders</a></li>
        <li><a href="client-all-friends.html" className="nav-link">Network</a></li>
      </>
    )}
  </ul>
</nav>
        <div className="user-actions">
          {isLoggedIn && (
            <div className="header-notifications" data-role="member">
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
              ref={accountBtnRef}
              id="account-icon-btn"
              className="icon-btn account-icon"
              aria-expanded={accountMenuOpen}
              onClick={toggleAccountMenu}
            >
              <i className="fas fa-user-circle"></i>
            </button>

            <ul
              ref={accountMenuRef}
              id="account-menu"
              className={`dropdown-menu ${accountMenuOpen ? 'is-active' : ''}`}
            >
              {!isLoggedIn ? (
                <>
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); openAuthModal('register'); }}>
                      <i className="fas fa-user-plus"></i> Register
                    </a>
                  </li>
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); openAuthModal('login'); }}>
                      <i className="fas fa-sign-in-alt"></i> Login
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li><a href="/profile"><i className="fas fa-user"></i> Profile</a></li>
                  {userRole === 'freelancer' && (
                    <>
                      <li><a href="/withdrawal"><i className="fas fa-spinner"></i> Order Management</a></li>
                      <li><a href="/withdrawal"><i className="fas fa-wallet"></i> Withdrawal</a></li>
                      <li><a href="/stats"><i className="fas fa-chart-line"></i> Stats &amp; Insight</a></li>
                      <li><a href="/client-management"><i className="fas fa-users"></i> Client Management</a></li>
                    </>
                  )}
                  <li><a href="/settings"><i className="fas fa-cog"></i> Account Settings</a></li>
                  <li className="separator"></li>
                  <li>
                    <a id="account-switcher" onClick={(e) => { e.preventDefault(); handleAccountSwitching(); }}>
                      <i className="fas fa-exchange-alt"></i> Account Switching
                    </a>
                  </li>
                  <li className="separator"></li>
                  <li>
                    <a href="#" className="sign-out-link" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt"></i> Sign Out
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>

          <button className="icon-btn menu-toggle" onClick={openMobileMenu}>
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <nav className={`mobile-menu-panel ${mobileMenuOpen ? 'is-open' : ''}`}>
        <div className="mobile-menu-header">
          <h4 className="menu-title">
            {userRole === 'guest' ? 'Welcome' : `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} Menu`}
          </h4>
          <i className="fas fa-times close-menu-btn" onClick={closeMobileMenu}></i>
        </div>

        <div className="mobile-search-container">
          <input type="search" placeholder="Search on OsinoWorks..." className="header-search-input" />
          <i className="fas fa-search search-icon"></i>
        </div>

        <ul className="mobile-main-nav">
          <li><a href="freelancer-dashboard.html"><i className="fas fa-tachometer-alt"></i> Dashboard</a></li>
          <li><a href="freelancer-orders-history.html"><i className="fas fa-clipboard-list"></i> Orders</a></li>
          <li><a href="freelancer-client-management.html"><i className="fas fa-users"></i> Clients</a></li>
          <li><a href="freelancer-services.html"><i className="fas fa-suitcase"></i> Services</a></li>
          <li><a href="messages.html"><i className="fas fa-envelope"></i> Messages</a></li>
          <li><a href="freelancer-account-settings.html"><i className="fas fa-cog"></i> Account Settings</a></li>
          {isLoggedIn && (
            <li>
              <a href="#" className="btn-mobile-action sign-out-link" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Sign Out
              </a>
            </li>
          )}
        </ul>
      </nav>

      {/* Toasts */}
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <i className={`fas ${toast.iconClass}`}></i>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Auth Modal */}
      <div className={`modal-overlay ${authModalOpen ? 'is-active' : ''}`}>
        <div className="modal-container">
          <button className="modal-close" onClick={closeAuthModal}>&times;</button>

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
                <button
                  className={`tab-btn ${activeAuthTab === 'login' ? 'active' : ''}`}
                  onClick={() => switchAuthTab('login')}
                >
                  Login
                </button>
                <button
                  className={`tab-btn ${activeAuthTab === 'register' ? 'active' : ''}`}
                  onClick={() => switchAuthTab('register')}
                >
                  Register
                </button>
              </div>

              {activeAuthTab === 'login' && (
                <div className="auth-view active">
                  <h3>Welcome Back</h3>
                  <div className="social-auth">
                    <button className="btn-social google" onClick={() => simulateSocialAuth('google')}>
                      <i className="fab fa-google color-google"></i> Continue with Google
                    </button>
                    <button className="btn-social facebook">
                      <i className="fab fa-facebook-f color-facebook"></i> Continue with Facebook
                    </button>
                  </div>
                  <div className="divider"><span>OR</span></div>
                  <form>
                    <div className="input-group">
                      <input type="email" placeholder="Email Address" required />
                      <input type="password" placeholder="Password" required />
                    </div>
                    <button type="submit" className="btn-primary full-width-btn">Login</button>
                  </form>
                </div>
              )}

              {activeAuthTab === 'register' && (
                <div className="auth-view active">
                  <h3>Create Account</h3>
                  <div className="social-auth">
                    <button className="btn-social google" onClick={() => simulateSocialAuth('google')}>
                      <i className="fab fa-google color-google"></i> Sign up with Google
                    </button>
                  </div>
                  <div className="divider"><span>OR</span></div>
                  <form>
                    <div className="input-group">
                      <input type="email" placeholder="Email Address" required />
                      <input type="password" placeholder="Create Password" required />
                    </div>
                    <button type="submit" className="btn-primary full-width-btn">Continue</button>
                    <p className="legal-note">
                      By joining, you agree to our{' '}
                      <a href="terms.html" target="_blank" rel="noopener">Terms of Service</a> and{' '}
                      <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};  

export default Header;

