// components/Header/header.js
'use client';   // ← THIS IS THE FIX (must be the very first line)

import { useState, useEffect, useRef } from 'react';

export const useHeader = () => {
  // LocalStorage states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userRole, setUserRole] = useState('guest');

  // UI states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeAuthTab, setActiveAuthTab] = useState('login');
  const [toasts, setToasts] = useState([]);

  const accountBtnRef = useRef(null);
  const accountMenuRef = useRef(null);

  // Toast helper
  const showToast = (message, iconClass = 'fa-check-circle') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, iconClass }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Security Guard
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const profileComplete = localStorage.getItem('isProfileComplete') === 'true';
    const emailVerified = localStorage.getItem('isEmailVerified') === 'true';
    const savedRole = loggedIn ? (localStorage.getItem('userRole') || 'freelancer') : 'guest';

    setIsLoggedIn(loggedIn);
    setIsProfileComplete(profileComplete);
    setIsEmailVerified(emailVerified);
    setUserRole(savedRole);

    document.body.setAttribute('data-user-role', savedRole);

    const currentPage = window.location.pathname.split('/').pop()?.split('?')[0] || 'index.html';
    const safePages = ['index.html', 'search.html', 'mandatory.html', 'verify-email.html', 'login.html', 'register.html'];

    if (loggedIn && !profileComplete && currentPage !== 'mandatory.html') {
      window.location.href = 'mandatory.html';
    } else if (loggedIn && profileComplete && !emailVerified && !safePages.includes(currentPage)) {
      window.location.href = 'mandatory.html?status=pending_verification';
    }
  }, []);

  // Click outside account menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        accountMenuOpen &&
        accountBtnRef.current &&
        !accountBtnRef.current.contains(e.target) &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  const openMobileMenu = () => {
    setMobileMenuOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.style.overflow = 'auto';
  };

  const toggleAccountMenu = () => setAccountMenuOpen((prev) => !prev);

  const handleAccountSwitching = () => {
    const roles = ['buyer', 'freelancer', 'affiliate'];
    let current = userRole === 'guest' ? 'freelancer' : userRole;
    const nextIndex = (roles.indexOf(current) + 1) % roles.length;
    const newRole = roles[nextIndex];

    localStorage.setItem('userRole', newRole);
    setUserRole(newRole);
    setAccountMenuOpen(false);
    showToast(`Switched to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} mode`, 'fa-exchange-alt');
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.setItem('isLoggedIn', 'false');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setUserRole('guest');
    window.location.href = 'index.html';
  };

  const openAuthModal = (tab) => {
    setActiveAuthTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => setAuthModalOpen(false);
  const switchAuthTab = (tab) => setActiveAuthTab(tab);

  const simulateSocialAuth = (provider) => {
    const dummyData = { email: 'user@example.com', name: 'John Doe', photo: 'https://via.placeholder.com/150' };
    localStorage.setItem('tempAuthData', JSON.stringify(dummyData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', 'freelancer');
    setIsLoggedIn(true);
    setUserRole('freelancer');
    setAuthModalOpen(false);
    showToast('Successfully logged in!', 'fa-check-circle');
  };

  return {
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
  };
};