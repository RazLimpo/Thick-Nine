'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Moved here!
import { BRAND, API_BASE_URL } from '@/lib/constants';       // Consolidated here!
import '@/styles/pages/verify-email.css';


// ============ TYPES & INTERFACES ============
interface VerifyEmailState {
  isExpired: boolean;
  isVerified: boolean; 
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
  onClick={(e) => {
    e.preventDefault(); // 🛑 Stops default browser page reloads
    onResendClick();
  }}
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
  
  
  
  
  
  
  interface PendingCardProps {
  onResendClick: () => void;
  isLoading: boolean;
  isCooldown: boolean;
  timerSeconds: number;
}

const PendingCard: React.FC<PendingCardProps> = ({ onResendClick, isLoading, isCooldown, timerSeconds }) => (
  <div id="card-pending" className="verify-card show">
    <img src="/logo-header.png" alt="Thick 9 Logo" className="card-logo-img" />
    <div className="icon-circle">
      <i className="fa-solid fa-envelope-open-text" style={{ color: '#d96464', fontSize: '3rem' }}></i>
    </div>
    <h1>Verify Your Email</h1>
    <p>We have sent a verification link to your email address. Please open it to activate your account.</p>
    
   <button 
  id="btn-resend" 
  className="neumorph-btn" 
  onClick={(e) => {
    e.preventDefault(); // 🛑 Stops default browser page reloads
    onResendClick();
  }}
  disabled={isCooldown || isLoading}
>
  {isLoading ? (
    <><i className="fa-solid fa-spinner fa-spin"></i> Sending...</>
  ) : (
    <><i className="fa-solid fa-paper-plane"></i> Resend Email</>
  )}
</button>
    
    {isCooldown && (
      <p style={{ marginTop: '20px', color: '#555', fontSize: '0.98rem' }}>
        Resend available in <span>{timerSeconds}</span> seconds
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
  // Next.js Routing hooks
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- STATE MANAGEMENT ---
  const [state, setState] = useState<VerifyEmailState>({
    isExpired: false,
    isVerified: false,
    isLoading: true, // Default to true while checking tokens or local state
    isCooldown: false,
    userName: 'User',
    timerSeconds: COOLDOWN_DURATION,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // --- REFS ---
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const confettiFrameRef = useRef<number | null>(null);

  // --- INITIALIZATION & LIVE TOKEN VALIDATION ---
  useEffect(() => {
    setIsHydrated(true);

    const token = searchParams.get('token');
    const userName = localStorage.getItem('userName') || 'User';

    // 1. IF TOKEN EXISTS: The user clicked a live link from their email inbox
    if (token) {
      const processEmailActivation = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });

          const data = await response.json();

          if (response.ok) {
            // Write authenticated flags to local storage matching backend authorization maps
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('token', data.token);
            localStorage.setItem('isEmailVerified', 'true');
            localStorage.setItem('isProfileComplete', 'false'); // Force profile onboarding next!
            localStorage.setItem('accountStrength', (data.user.accountStrength || 65).toString());

            setState(prev => ({
              ...prev,
              userName: data.user.fullName || userName,
              isVerified: true,
              isExpired: false,
              isLoading: false
            }));

            showToast('Email verified successfully!', 'fa-circle-check');
            setTimeout(() => startConfetti(), 200);
          } else {
            // Check if backend specifically identified an expiration or invalid token
            setState(prev => ({
              ...prev,
              isVerified: false,
              isExpired: true,
              isLoading: false
            }));
            showToast(data.msg || 'Verification link failed.', 'fa-triangle-exclamation');
          }
        } catch (err) {
          setState(prev => ({ ...prev, isLoading: false }));
          showToast('Could not reach verification servers.', 'fa-wifi');
        }
      };

      processEmailActivation();
      return;
    }

    // 2. IF NO TOKEN EXISTS: They are just sitting in the registration holding room
    const registrationTimestamp = localStorage.getItem('registrationTimestamp');
    const regTime = registrationTimestamp ? parseInt(registrationTimestamp, 10) : null;
    const isAlreadyVerified = localStorage.getItem('isEmailVerified') === 'true';
    const isExpiredLink = !regTime || Date.now() - regTime > EXPIRY_LIMIT;

    setState(prev => ({
      ...prev,
      userName,
      isExpired: isExpiredLink,
      isVerified: isAlreadyVerified,
      isLoading: false // Done assessing client state
    }));

    if (isAlreadyVerified && !isExpiredLink) {
      setTimeout(() => startConfetti(), 100);
    }

    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (confettiFrameRef.current) cancelAnimationFrame(confettiFrameRef.current);
    };
  }, [searchParams]);

  // --- TOAST SYSTEM ---
  const showToast = (message: string, iconClass: string = 'fa-check-circle') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, icon: iconClass }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  
  
    // --- LIVE RESEND LOGIC VIA BACKEND ---
  const handleResendClick = async () => {
    if (state.isCooldown || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // 1. Pull the authentication token from local storage safely
      const userToken = localStorage.getItem('token');
      
      // 2. Point to the backend route using the clean GET method configuration
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'GET', // ✅ Fixed typo from 'POS' to 'GET'
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}` // ✅ Securely sends your token to the backend
        }
      });

      const data = await response.json();

      if (response.ok) {
        showToast('A fresh verification link has been dispatched!', 'fa-paper-plane');
        localStorage.setItem('registrationTimestamp', Date.now().toString());

        setState(prev => ({
          ...prev,
          isLoading: false,
          isCooldown: true,
          timerSeconds: COOLDOWN_DURATION,
        }));

        cooldownIntervalRef.current = setInterval(() => {
          setState(prev => {
            const newSeconds = prev.timerSeconds - 1;
            if (newSeconds <= 0) {
              if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
              return { ...prev, isCooldown: false, timerSeconds: COOLDOWN_DURATION };
            }
            return { ...prev, timerSeconds: newSeconds };
          });
        }, 1000);
      } else {
        showToast(data.msg || 'Failed to dispatch email.', 'fa-exclamation-triangle');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      showToast('Network issue sending request.', 'fa-wifi');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };
    
    
    
    
  // --- DASHBOARD REDIRECT (Fowards cleanly to mandatory onboarding page) ---
  const handleDashboardClick = () => {
    // Forward directly to profile complete wizard since they verified email successfully
    router.push('/mandatory');
  };

  // --- CONFETTI ANIMATION ---
  const startConfetti = () => {
    if (typeof window === 'undefined') return;
    const confetti = (window as any).confetti;
    if (!confetti) return;

    const end = Date.now() + CONFETTI_DURATION;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#d96464', '#22c55e'] });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#d96464', '#22c55e'] });

      if (Date.now() < end) {
        confettiFrameRef.current = requestAnimationFrame(frame);
      }
    };
    frame();
  };

  // --- RENDER ---
  if (!isHydrated) {
    return (
      <div className="verify-container">
        <div className="verify-card show" style={{ opacity: 0 }}></div>
      </div>
    );
  }

  return (
    <div className="verify-container">
      {state.isLoading ? (
        <div className="verify-card show" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <img src="/logo-header.png" alt="Thick 9 Logo" className="card-logo-img" style={{ marginBottom: '20px' }} />
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #d96464', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px auto' }}></div>
          <p style={{ fontWeight: '500', color: '#333' }}>Validating registration security token...</p>
          <style jsx>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : state.isExpired ? (
        <ExpiredCard isLoading={state.isLoading} isCooldown={state.isCooldown} timerSeconds={state.timerSeconds} onResendClick={handleResendClick} />
      ) : state.isVerified ? (
        <SuccessCard userName={state.userName} onDashboardClick={handleDashboardClick} />
      ) : (
        <PendingCard isLoading={state.isLoading} isCooldown={state.isCooldown} timerSeconds={state.timerSeconds} onResendClick={handleResendClick} />
      )}

      <div id="toast-container" className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default VerifyEmailClient;