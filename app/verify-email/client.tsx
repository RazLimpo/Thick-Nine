'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faExclamationTriangle, 
  faArrowRight, 
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const EXPIRY_LIMIT = 24 * 60 * 60 * 1000;

const VerifyEmailClient = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    setIsHydrated(true);
    
    const regTime = parseInt(localStorage.getItem('registrationTimestamp') || '0');
    const storedName = localStorage.getItem('userName') || 'User';
    setUserName(storedName);

    if (!regTime || Date.now() - regTime > EXPIRY_LIMIT) {
      setIsExpired(true);
    } else {
      startConfetti();
    }
  }, []);

  const handleResendClick = () => {
    if (isCooldown || isLoading) return;

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsCooldown(true);
      localStorage.setItem('registrationTimestamp', Date.now().toString());
      // TODO: Show toast notification
    }, 1300);
  };

  // Cooldown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isCooldown && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsCooldown(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCooldown]);

  const startConfetti = () => {
    const confetti = (window as any).confetti;
    if (!confetti) return;

    const end = Date.now() + 3000;
    const frame = () => {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: ['#d96464', '#22c55e']
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: ['#d96464', '#22c55e']
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  if (!isHydrated) return null;

  return (
    <div className="verify-container" style={{ marginTop: '80px' }}>
      {isExpired ? (
        <div className="verify-card show">
          <img src="/logo-header.png" alt="Logo" className="card-logo-img" />
          <div className="icon-circle warning">
            <FontAwesomeIcon icon={faExclamationTriangle} className="expired-icon" />
          </div>
          <h1>Link Expired</h1>
          <p>Verification links expire after 24 hours. Please request a new one.</p>
          
          <button 
            className="neumorph-btn" 
            onClick={handleResendClick}
            disabled={isLoading || isCooldown}
          >
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              "Resend Verification Link"
            )}
          </button>

          {isCooldown && (
            <p style={{ marginTop: '15px' }}>
              Resend available in {timerSeconds}s
            </p>
          )}
        </div>
      ) : (
        <div className="verify-card show">
          <img src="/logo-header.png" alt="Logo" className="card-logo-img" />
          <div className="icon-circle">
            <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
          </div>
          <h1>Account Verified, {userName}!</h1>
          <p>Your email has been successfully verified. Welcome to Thick 9.</p>
          
          <button 
            className="neumorph-btn" 
            onClick={() => {
              const role = localStorage.getItem('userRole') || 'freelancer';
              window.location.href = `/${role}-dashboard`;
            }}
          >
            Go to Dashboard <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailClient;