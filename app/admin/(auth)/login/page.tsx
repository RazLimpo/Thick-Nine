// app/admin/login/page.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import "@/styles/pages/admin-login.css";
import { API_BASE_URL, BRAND } from '@/lib/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // Enforce strict Admin check on the backend response payload
        if (data.user.role !== 'admin') {
          setErrorMsg('Access denied. Administrator privileges required.');
          setIsLoading(false);
          return;
        }

        // Store explicit Admin credentials cleanly
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('accountStrength', (data.user.accountStrength || 100).toString());
        localStorage.setItem('isEmailVerified', 'true');
        localStorage.setItem('isProfileComplete', 'true');

        window.dispatchEvent(new Event('userRoleChanged'));

        // Route directly to the Admin Dashboard
        router.push('/admin/dashboard');
      } else {
        setErrorMsg(data.msg || data.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to server. Check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        {/* Left Side Branding Pane */}
        <div className="login-left-pane">
          <div className="decorative-art">
            <div className="art-shape shape-1"></div>
            <div className="art-shape shape-2"></div>
            <div className="art-shape shape-3"></div>
          </div>

          <div className="brand-header">
            <div className="brand-logo">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h2>{BRAND?.pretty || 'thick9'}<span>™</span></h2>
            <p className="brand-subtitle">Control & Administration Portal</p>
          </div>

          <div className="brand-footer-text">
            <h3>You are accessing the secure central management hub.</h3>
            <div className="pane-actions">
              <Link href="/" className="pane-btn">Return to App</Link>
              <Link href="/terms-and-privacy?tab=privacy" className="pane-link">Security Policies</Link>
            </div>
          </div>
        </div>

        {/* Right Side Form Pane */}
        <div className="login-right-pane">
          <div className="form-card-inner">
            <h1 className="form-title">Log In to Admin Portal</h1>

            {errorMsg && (
              <div className="error-alert">
                <i className="fas fa-exclamation-circle"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin}>
              <div className="input-field-group">
                <label htmlFor="admin-email">Your Email</label>
                <div className="input-wrapper">
                  <input
                    id="admin-email"
                    type="email"
                    placeholder="admin@thick9.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <i className="fas fa-user input-icon"></i>
                </div>
              </div>

              <div className="input-field-group">
                <label htmlFor="admin-password">Your Password</label>
                <div className="input-wrapper">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-meta">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Remember
                </label>
                <a href="mailto:support@thick9.com" className="forgot-link">Forgotten?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="btn-spinner">
                    <i className="fas fa-spinner fa-spin"></i> Authenticating...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}