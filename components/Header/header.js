'use client';

import { useState, useEffect } from 'react';

/**
 * Clean Hook for Next.js 
 * This removes all document.getElementById calls to prevent crashes.
 */
export const useHeader = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState('guest');
    const [toasts, setToasts] = useState([]); // Initialized as array to fix .map() error

    useEffect(() => {
        // Sync with storage only when in the browser
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const role = localStorage.getItem('userRole') || 'guest';
        
        setIsLoggedIn(loggedIn);
        setUserRole(role);
        
        console.log("Thick 9 Hook: Security guard active (No redirects for DB testing).");
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        window.location.href = '/';
    };

    const handleAccountSwitching = () => {
        const roles = ['buyer', 'freelancer', 'affiliate'];
        const nextIndex = (roles.indexOf(userRole) + 1) % roles.length;
        const newRole = roles[nextIndex];
        
        localStorage.setItem('userRole', newRole);
        setUserRole(newRole);
    };

    // Return empty objects/functions for things you haven't built yet to prevent errors
    return {
        isLoggedIn,
        userRole,
        toasts,
        handleLogout,
        handleAccountSwitching,
        mobileMenuOpen: false, 
        accountMenuOpen: false,
        authModalOpen: false,
        activeAuthTab: 'login',
        openMobileMenu: () => {},
        closeMobileMenu: () => {},
        toggleAccountMenu: () => {},
        openAuthModal: () => {},
        closeAuthModal: () => {},
        switchAuthTab: () => {},
        simulateSocialAuth: () => {},
        accountBtnRef: { current: null },
        accountMenuRef: { current: null }
    };
};