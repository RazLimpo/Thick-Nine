'use client';

import React, { useState, useEffect, useRef } from 'react';
import '@/styles/pages/verify-email.css';
import { BRAND } from '@/lib/constants'; // Added this for branding consistency





// ============ TYPES & INTERFACES ============
interface VerifyEmailState {
  isExpired: boolean;
  isLoading: boolean;
  isCooldown: boolean;
  userName: string;
  timerSeconds: number;
}

interface ToastMessage {
  id: string;
  message: string;
  icon: string;
}

// ============ CONSTANTS ============
const EXPIRY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const COOLDOWN_DURATION = 60; // seconds
const TOAST_DURATION = 4000; // milliseconds
const TOAST_FADE_OUT = 500; // milliseconds
const CONFETTI_DURATION = 3000; // milliseconds
const RESEND_SIMULATE_DELAY = 1300; // milliseconds

// ============ SUB-COMPONENTS ============

interface SuccessCardProps {
  userName: string;
  onDashboardClick: () => void;
}

const SuccessCard: React.FC<SuccessCardProps> = ({ userName, onDashboardClick }) => (
  <div id="card-success" className="verify-card show">
    <img src="/logo-header.png" alt="Thick 9 Logo" className="card-logo-img" />
    
  <div className="icon-circle">
  <i className="fa-solid fa-circle-check success-icon"></i>
</div>
    
    <h1 id="welcome-title">Account Verified, {userName}!</h1>
    <p>Your email has been successfully verified. You now have full access to the {BRAND.pretty}marketplace.</p>
    
 <button id="btn-success" className="neumorph-btn" onClick={onDashboardClick}>
  <i className="fa-solid fa-arrow-right"></i>
  Go to Dashboard
</button>
  </div>
);

interface ExpiredCardProps {
  isLoading: boolean;
  isCooldown: boolean;
  timerSeconds: number;
  onResendClick: () => void;
}

const ExpiredCard: React.FC<ExpiredCardProps> = ({ 
  isLoading, 
  isCooldown, 
  timerSeconds, 
  onResendClick 
}) => (
  <div id="card-expired" className="verify-card show">
    <img src="/logo-header.png" alt="Thick 9 Logo" className="card-logo-img" />
    
   <div className="icon-circle">
  <i className="fa-solid fa-triangle-exclamation expired-icon"></i>
</div>
    
    <h1>Link Expired</h1>
    <p>For your security, verification links expire after 24 hours. Please request a new link.</p>
    
    <button 
      id="btn-resend" 
      className="neumorph-btn" 
      onClick={onResendClick}
      disabled={isCooldown || isLoading}
      style={{
        opacity: isCooldown || isLoading ? '0.7' : '1',
        pointerEvents: isCooldown || isLoading ? 'none' : 'auto',
      }}
    >
      {isLoading ? (
        <>
  <i className="fa-solid fa-spinner fa-spin"></i>
  {' '}Sending...
</>
      ) : (
       <>
  <i className="fa-solid fa-paper-plane"></i>
  {' '}Resend Verification Link
</>
      )}
    </button>
    
    {isCooldown && (
      <p id="resend-timer" style={{ marginTop: '20px', color: '#555', fontSize: '0.98rem' }}>
        You can resend again in <span id="timer-seconds">{timerSeconds}</span> seconds
      </p>
    )}
  </div>
);

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false); // ← NEW: Controls animation

  useEffect(() => {
    // Trigger animation after mount
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10); // 10ms delay to let browser register the element

    // Remove toast after duration
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade-out animation to complete before removing
      setTimeout(() => onRemove(toast.id), TOAST_FADE_OUT);
    }, TOAST_DURATION);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div className={`toast ${isVisible ? 'show' : ''}`}>
  {/* We use the variable directly in the className */}
  <i className={`fa-solid ${toast.icon} toast-icon`}></i>
  <span>{toast.message}</span>
</div>
  );
};

// ============ MAIN COMPONENT ============
const VerifyEmailClient: React.FC = () => {
    // --- STATE MANAGEMENT ---
  const [state, setState] = useState<VerifyEmailState>({
    isExpired: false,
    isLoading: false,
    isCooldown: false,
    userName: 'User',
    timerSeconds: COOLDOWN_DURATION,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false); // ← NEW: Prevents hydration mismatch
  
  // --- REFS ---
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const confettiFrameRef = useRef<number | null>(null);

      // --- INITIALIZATION EFFECTS ---
  useEffect(() => {
    // Mark component as hydrated (client-side ready)
    setIsHydrated(true);
    initializeComponent();
    
    return () => {
      // Cleanup on unmount - prevents memory leaks
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      if (confettiFrameRef.current) {
        cancelAnimationFrame(confettiFrameRef.current);
        confettiFrameRef.current = null;
      }
    };
  }, []);
    
    
    
  const initializeComponent = () => {
    const registrationTimestamp = localStorage.getItem('registrationTimestamp');
    const regTime = registrationTimestamp ? parseInt(registrationTimestamp, 10) : null;
    const userName = localStorage.getItem('userName') || 'User';

    const isExpired = !regTime || Date.now() - regTime > EXPIRY_LIMIT;

    setState(prev => ({
      ...prev,
      userName,
      isExpired,
    }));

    // Trigger confetti if not expired
    if (!isExpired) {
      setTimeout(() => startConfetti(), 100);
    }
  };

   // --- TOAST SYSTEM ---
  const showToast = (message: string, iconClass: string = 'fa-check-circle') => {
    const id = `${Date.now()}-${Math.random()}`;

    setToasts(prev => [...prev, { id, message, icon: iconClass }]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, TOAST_DURATION);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // --- RESEND LOGIC ---
  const handleResendClick = () => {
    if (state.isCooldown || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    setTimeout(() => {
      showToast('New verification link sent!', 'fa-paper-plane');
      localStorage.setItem('registrationTimestamp', Date.now().toString());

      setState(prev => ({
        ...prev,
        isLoading: false,
        isCooldown: true,
        timerSeconds: COOLDOWN_DURATION,
      }));

      // Cooldown countdown
      cooldownIntervalRef.current = setInterval(() => {
        setState(prev => {
          const newSeconds = prev.timerSeconds - 1;
          
          if (newSeconds <= 0) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
            }
            return {
              ...prev,
              isCooldown: false,
              timerSeconds: COOLDOWN_DURATION,
            };
          }

          return {
            ...prev,
            timerSeconds: newSeconds,
          };
        });
      }, 1000);
    }, RESEND_SIMULATE_DELAY);
  };

  // --- DASHBOARD REDIRECT ---
  const handleDashboardClick = () => {
    localStorage.setItem('isEmailVerified', 'true');
    const role = localStorage.getItem('userRole') || 'freelancer';
    window.location.href = `/${role}-dashboard`;
  };

  // --- CONFETTI ANIMATION ---
  const startConfetti = () => {
    if (typeof window === 'undefined') return; // SSR safety check

    const confetti = (window as any).confetti;
    if (!confetti) return;

    const end = Date.now() + CONFETTI_DURATION;
    
    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ['#d96464', '#22c55e'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ['#d96464', '#22c55e'],
      });

      if (Date.now() < end) {
        confettiFrameRef.current = requestAnimationFrame(frame);
      }
    };

    frame();
  };

   // --- RENDER ---
  // Don't render until hydrated to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="verify-container">
        <div className="verify-card show" style={{ opacity: 0 }}>
          {/* Empty placeholder */}
        </div>
      </div>
    );
  }

  return (
    <div className="verify-container">
      {state.isExpired ? (
        <ExpiredCard
          isLoading={state.isLoading}
          isCooldown={state.isCooldown}
          timerSeconds={state.timerSeconds}
          onResendClick={handleResendClick}
        />
      ) : (
        <SuccessCard
          userName={state.userName}
          onDashboardClick={handleDashboardClick}
        />
      )}

      <div id="toast-container" className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </div>
  );
};

export default VerifyEmailClient;
