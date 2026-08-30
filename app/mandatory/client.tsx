//mandatory


'use client';

// ============ SECTION 1 - IMPORTS ============
import React, {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import Link from 'next/link';
import ReactCountryFlag from 'react-country-flag';

import '@/styles/pages/mandatory.css';
import { API_BASE_URL } from '@/lib/constants';
import { POPULAR_COUNTRIES, ALL_COUNTRIES } from '@/lib/countries';



// ============ SECTION 2 - TYPE DEFINITIONS ============

type UserRole =
  | 'client'
  | 'freelancer'
  | 'affiliate';

interface RegistrationData {
  fullName: string;
  gender: string;
  email: string;
  country: string;
  city: string;
  role: UserRole;
  referralCode: string;
  agreedToTerms: boolean;
}

interface UIState {
  isSubmitting: boolean;
  showSuccess: boolean;
  resendCooldown: number;
  isCountryOpen: boolean;
  countrySearch: string;
  highlightedIndex: number;
}

interface FormErrors {
  fullName?: string;
  gender?: string;
  email?: string;
  country?: string;
  city?: string;
  role?: string;
  referralCode?: string;
  agreedToTerms?: string;
}



// ============ SECTION 3 - COMPONENT INITIALIZATION ============

export default function MandatoryClientPage() {

  /**
   * ------------------------------------------------
   * PRODUCTION NOTES
   * ------------------------------------------------
   * - This component is fully client-side.
   * - All UI logic is state-driven.
   * - No direct DOM manipulation is used.
   * - Safe for Next.js App Router usage.
   * - Authentication/session logic should
   *   eventually move server-side.
   * ------------------------------------------------
   */
  
  
  
  // ==================================================
  // SECTION 4 — FORM STATE MANAGEMENT
  // ==================================================

  /**
   * Main controlled form state.
   * All inputs are fully state-driven.
   * No uncontrolled inputs are used.
   */

  const [formData, setFormData] =
    useState<RegistrationData>({
      fullName: '',
      gender: '',
      email: '',
      country: '',
      city: '',
      role: 'client',
      referralCode: '',
      agreedToTerms: false,
    });
      
      
      
      
      // ==================================================
  // SECTION 5 — UI STATE MANAGEMENT
  // ==================================================

  /**
   * Centralized UI state.
   * Keeps visual behavior predictable
   * and fully state-driven.
   */

  const [ui, setUi] = useState<UIState>({
    isSubmitting: false,
    showSuccess: false,
    resendCooldown: 0,
    isCountryOpen: false,
    countrySearch: '',
    highlightedIndex: -1,
  });    
    
    
    // ==================================================
  // SECTION 6 — ERROR STATE MANAGEMENT
  // ==================================================

  /**
   * Centralized validation errors.
   * Each field maps to its own
   * optional error message.
   */

  const [errors, setErrors] =
    useState<FormErrors>({});
      
      
      
      
      // ==================================================
  // SECTION 7 — REFS / TIMER MANAGEMENT
  // ==================================================

  /**
   * Persistent timeout references.
   * Prevents memory leaks and ensures
   * proper cleanup during unmounts.
   */

  const submitTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null);

  const resendTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);
      
      
      
      
      // ==================================================
  // SECTION 8 — LOAD TEMPORARY AUTH DATA EFFECT
  // ==================================================

  /**
   * Loads temporary auth data created
   * during the lightweight signup flow.
   *
   * This helps users continue onboarding
   * without re-entering their information.
   */

  useEffect(() => {
    /**
     * Prevent execution during SSR.
     */
    if (typeof window === 'undefined') {
      return;
    }

    const tempAuthData =
      localStorage.getItem('tempAuthData');

    if (!tempAuthData) {
      return;
    }

    try {
      const parsedData = JSON.parse(
        tempAuthData
      );

      setFormData((prev) => ({
        ...prev,
        fullName:
          typeof parsedData?.name === 'string'
            ? parsedData.name
            : '',

        email:
          typeof parsedData?.email === 'string'
            ? parsedData.email
            : '',
      }));

      /**
       * Remove temporary onboarding data
       * after successful hydration.
       */
      localStorage.removeItem(
        'tempAuthData'
      );

    } catch (error) {

      console.error(
        'Failed to parse tempAuthData:',
        error
      );

      /**
       * Remove corrupted data to avoid
       * future parsing failures.
       */
      localStorage.removeItem(
        'tempAuthData'
      );
    }
  }, []);
      
      
      
      
          
      
      
    // ==================================================
  // SECTION 9 — RESEND COOLDOWN EFFECT
  // ==================================================

  /**
   * Controls resend email cooldown.
   * Prevents rapid repeated requests.
   */

  useEffect(() => {

    if (ui.resendCooldown <= 0) {
      return;
    }

    const interval = window.setInterval(() => {

      setUi((prev) => ({
        ...prev,

        resendCooldown:
          prev.resendCooldown > 0
            ? prev.resendCooldown - 1
            : 0,
      }));

    }, 1000);

    return () => {
      window.clearInterval(interval);
    };

  }, [ui.resendCooldown]);
      
      
      
      
    // ==================================================
  // SECTION 10 — UNMOUNT CLEANUP EFFECT
  // ==================================================

  useEffect(() => {
    const submitTimeout = submitTimeoutRef.current;
    const resendTimeout = resendTimeoutRef.current;

    return () => {
      if (submitTimeout) {
        window.clearTimeout(submitTimeout);
      }
      if (resendTimeout) {
        window.clearTimeout(resendTimeout);
      }
    };
  }, []);      
      
      
      
      // ==================================================
  // SECTION 11 - SEARCHABLE COUNTRY FILTER & CLOSE ON CLICK OUTSIDE
  // ==================================================
  const countryContainerRef = useRef<HTMLDivElement | null>(null);

  // Close country dropdown when clicking outside
  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      countryContainerRef.current &&
      !countryContainerRef.current.contains(event.target as Node)
    ) {
      setUi((prev) => ({
        ...prev,
        isCountryOpen: false,
        countrySearch: '',
        highlightedIndex: -1,
      }));
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
    
  // Filter countries based on name or code or aliases (e.g. USA -> United States)
  const filteredCountries = ALL_COUNTRIES.filter((country) => {
    const query = ui.countrySearch.toLowerCase().trim();
    if (!query) return true;
    
    const nameMatch = country.name.toLowerCase().includes(query);
    const codeMatch = country.code.toLowerCase().includes(query);
    const aliasMatch = country.aliases?.some((alias) =>
      alias.toLowerCase().includes(query)
    );

    return nameMatch || codeMatch || aliasMatch;
  });

  const selectedCountryObj = ALL_COUNTRIES.find(
    (c) => c.code === formData.country
  );
    
    
    // Keep highlightedIndex valid whenever the visible list changes
useEffect(() => {
  if (!ui.isCountryOpen) return;

  const list = ui.countrySearch
    ? filteredCountries
    : [...POPULAR_COUNTRIES, ...filteredCountries];

  setUi((prev) => {
    if (list.length === 0) {
      return prev.highlightedIndex === -1
        ? prev
        : { ...prev, highlightedIndex: -1 };
    }

    const next = Math.min(
      Math.max(prev.highlightedIndex, 0),
      list.length - 1
    );

    return next === prev.highlightedIndex
      ? prev
      : { ...prev, highlightedIndex: next };
  });
}, [ui.countrySearch, ui.isCountryOpen]); // removed filteredCountries    
    

// ---------- Keyboard navigation helpers ----------
    const getVisibleCountries = () => {
  if (ui.countrySearch) return filteredCountries;
  return [...POPULAR_COUNTRIES, ...filteredCountries];
};

const handleCountryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  const list = getVisibleCountries();
  const max = list.length - 1;

  // Open the dropdown with ArrowDown / Enter when closed
  if (!ui.isCountryOpen) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      setUi((prev) => ({
        ...prev,
        isCountryOpen: true,
        countrySearch: '',
        highlightedIndex: list.length > 0 ? 0 : -1,
      }));
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (list.length === 0) return;
      setUi((prev) => ({
        ...prev,
        highlightedIndex:
          prev.highlightedIndex < max ? prev.highlightedIndex + 1 : 0,
      }));
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (list.length === 0) return;
      setUi((prev) => ({
        ...prev,
        highlightedIndex:
          prev.highlightedIndex > 0 ? prev.highlightedIndex - 1 : max,
      }));
      break;

    case 'Home':
      e.preventDefault();
      if (list.length === 0) return;
      setUi((prev) => ({ ...prev, highlightedIndex: 0 }));
      break;

    case 'End':
      e.preventDefault();
      if (list.length === 0) return;
      setUi((prev) => ({ ...prev, highlightedIndex: max }));
      break;

    case 'Enter':
      e.preventDefault();
      if (ui.highlightedIndex >= 0 && list[ui.highlightedIndex]) {
        const c = list[ui.highlightedIndex];
        setFormData((prev) => ({ ...prev, country: c.code }));
        setErrors((prev) => ({ ...prev, country: undefined }));
        setUi((prev) => ({
          ...prev,
          isCountryOpen: false,
          countrySearch: '',
          highlightedIndex: -1,
        }));
      }
      break;

    case 'Escape':
      e.preventDefault();
      setUi((prev) => ({
        ...prev,
        isCountryOpen: false,
        countrySearch: '',
        highlightedIndex: -1,
      }));
      break;

    default:
      break;
  }
};
  
    // ---------- end keyboard helpers ----------
      
      
      
      
      // ==================================================
  // SECTION 12 — INPUT CHANGE HANDLER
  // ==================================================

  /**
   * Centralized controlled input handler.
   *
   * Handles:
   * - text inputs
   * - email inputs
   * - password inputs
   * - select dropdowns
   * - checkbox inputs
   *
   * Also clears field-specific validation
   * errors automatically after correction.
   */

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {

    const {
      id,
      name,
      value,
      type,
    } = event.target;

    /**
     * Use either id or name
     * as the state key.
     */

    const fieldKey =
      (id || name) as keyof RegistrationData;

    /**
     * Safely handle checkbox values.
     */

    const fieldValue =
      type === 'checkbox'
        ? (
            event.target as HTMLInputElement
          ).checked
        : value;

    /**
     * Update form state.
     */

    setFormData((prev) => ({
      ...prev,

      [fieldKey]: fieldValue,
    }));

    /**
     * Automatically clear the field's
     * validation error once the user
     * starts correcting the input.
     */

    if (errors[fieldKey]) {

      setErrors((prev) => ({
        ...prev,

        [fieldKey]: undefined,
      }));
    }
  };
      
      
      
      
      
      // ==================================================
  // SECTION 13 — ROLE CHANGE HANDLER
  // ==================================================

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      referralCode: role !== 'affiliate' ? '' : prev.referralCode,
    }));
  };      
      
      
      // ==================================================
  // SECTION 14 — FORM VALIDATION
  // ==================================================

  /**
   * Validates all form fields before
   * Profile finalization submission.
   */

  const validateForm = (): boolean => {

    const newErrors: FormErrors = {};

    /**
     * Normalize user inputs.
     */

    const trimmedFullName =
      formData.fullName.trim();

    const trimmedEmail =
      formData.email.trim().toLowerCase();
    
    const trimmedCity = formData.city.trim(); 

    const trimmedReferralCode =
      formData.referralCode.trim();

    // --------------------------------------------------
    // FULL NAME VALIDATION
    // --------------------------------------------------

    if (!trimmedFullName) {

      newErrors.fullName =
        'Full name is required.';

    } else if (trimmedFullName.length < 2) {

      newErrors.fullName =
        'Full name must be at least 2 characters.';
    }

    // --------------------------------------------------
    // GENDER VALIDATION
    // --------------------------------------------------

    if (!formData.gender) {

      newErrors.gender =
        'Please select your gender.';
    }

    // --------------------------------------------------
    // EMAIL VALIDATION
    // --------------------------------------------------

    if (!trimmedEmail) {

      newErrors.email =
        'Email address is required.';

    } else {

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(trimmedEmail)) {

        newErrors.email =
          'Please enter a valid email address.';
      }
    }

    
    // --------------------------------------------------
    // COUNTRY VALIDATION
    // --------------------------------------------------

    if (!formData.country) {

      newErrors.country =
        'Please select your country.';
    }

      
      // --------------------------------------------------
// CITY VALIDATION
// --------------------------------------------------

if (!trimmedCity) {
  newErrors.city = 'City is required.';
} else if (trimmedCity.length < 2) {
  newErrors.city = 'City name must be at least 2 characters.';
}
      
    // --------------------------------------------------
    // AFFILIATE REFERRAL VALIDATION
    // --------------------------------------------------

    if (
      formData.role === 'affiliate' &&
      trimmedReferralCode.length > 0 &&
      trimmedReferralCode.length < 4
    ) {

      newErrors.referralCode =
        'Referral code is too short.';
    }

    // --------------------------------------------------
    // TERMS VALIDATION
    // --------------------------------------------------

    if (!formData.agreedToTerms) {

      newErrors.agreedToTerms =
        'You must agree to the Terms and Privacy Policy.';
    }

    /**
     * Update validation state.
     */

    setErrors(newErrors);

    /**
     * Return validation result.
     */

    return Object.keys(newErrors).length === 0;
  };
      
      
      
      
   // ==================================================
  // SECTION 15 — SUBMIT HANDLER (UPDATE PROFILE)
  // ==================================================   
      
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (ui.isSubmitting) return;

    const isValid = validateForm();
    if (!isValid) return;

    // 1. Get the authenticated token from initial signup/login
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Session expired or missing auth token. Please log in again.");
      return;
    }

    setUi((prev) => ({ ...prev, isSubmitting: true }));

    const normalizedFullName = formData.fullName.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedCity = formData.city.trim();
    const normalizedReferralCode = formData.referralCode.trim();

    // Normalize gender to match Mongoose enum ["male", "female"]
    const normalizedGender =
      formData.gender === 'M' ? 'male' : formData.gender === 'F' ? 'female' : '';

    // 2. Build payload matching profile update schema
    const payload = {
      fullName: normalizedFullName,
      gender: normalizedGender,
      email: normalizedEmail,
      location: {
        country: formData.country,
        city: normalizedCity,
      },
      role: formData.role,
      referralCode: normalizedReferralCode || undefined,
      isProfileComplete: true,
    };

    try {
      // 3. Make API call as PUT or PATCH to update profile with Auth Header
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT', // Use PUT or PATCH for profile updates
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Pass the authenticated user's token
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // 4. Update Local Storage with fresh user details
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', formData.role);
        localStorage.setItem('userName', normalizedFullName);
        localStorage.setItem('isProfileComplete', 'true');
        localStorage.setItem('accountStrength', data.user?.accountStrength || '80');

        if (formData.role === 'affiliate' && normalizedReferralCode) {
          localStorage.setItem('affiliateReferralCode', normalizedReferralCode);
        }

        // Wake up Header / Navbar components
        window.dispatchEvent(new Event('storage'));

        // Show success state
        setUi((prev) => ({
          ...prev,
          isSubmitting: false,
          showSuccess: true,
        }));

      } else {
        setUi((prev) => ({ ...prev, isSubmitting: false }));
        const errorMsg =
          data.msg || data.message || data.error || 'Profile completion failed.';
        console.error('Backend validation error:', data);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setUi((prev) => ({ ...prev, isSubmitting: false }));
      alert('Network or server connection issues. Please try again.');
    }
  };      
         
      
      
      
      // ==================================================
  // SECTION 16 — RESEND VERIFICATION HANDLER
  // ==================================================

  /**
   * Handles verification email resend flow.
   */

  const handleResendEmail = () => {

    /**
     * Prevent resend spam during cooldown.
     */

    if (ui.resendCooldown > 0) {
      return;
    }

    /**
     * Activate cooldown timer.
     */

    setUi((prev) => ({
      ...prev,

      resendCooldown: 60,
    }));

    /**
     * Simulated resend request.
     *
     * Replace with real backend API
     * request in production.
     */

    resendTimeoutRef.current =
      window.setTimeout(() => {

        try {

          console.log(
            'Verification email resend triggered.'
          );

        } catch (error) {

          console.error(
            'Failed to resend verification email:',
            error
          );
        }

      }, 1000);
  };
      
      
      
      
      
      
      // ==================================================
  // SECTION 17 — MAIN LAYOUT WRAPPER
  // ==================================================

  return (

    <main
      className="form-layout"
      aria-labelledby="mandatory-page-title"
    >

      <div className="form-container">
        
        
        
        
        {/* ==================================================
            SECTION 18 — HEADER / INSTRUCTIONS
        ================================================== */}

        <header className="form-header">

          <h1 id="mandatory-page-title">
            Update Your Profile
          </h1>

          <p className="form-instruction">
            Complete your profile setup to unlock
            full platform access.
          </p>

        </header>
        
        
        
        
        {/* ==================================================
            SECTION 19 — FORM WRAPPER + FULL NAME FIELD
        ================================================== */}

        <form
          className="registration-form"
          onSubmit={handleSubmit}
          noValidate
        >

          {/* Full Name */}
          <div className="form-group">

            <label htmlFor="fullName">
              Full Name
            </label>

            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="John Doe or Acme Corp"
              autoComplete="name"
              required
              maxLength={100}
              value={formData.fullName}
              onChange={handleInputChange}
              aria-invalid={
                !!errors.fullName
              }
              aria-describedby={
                errors.fullName
                  ? 'fullName-error'
                  : undefined
              }
            />

            {errors.fullName && (
              <small
                id="fullName-error"
                className="error-text"
                role="alert"
              >
                {errors.fullName}
              </small>
            )}

          </div>





{/* ==================================================
              SECTION 20 — GENDER FIELD
          ================================================== */}

          <div className="form-group">

            <label htmlFor="gender">
              Gender
            </label>

            <select
              id="gender"
              name="gender"
              required
              value={formData.gender}
              onChange={handleInputChange}
              aria-invalid={
                !!errors.gender
              }
              aria-describedby={
                errors.gender
                  ? 'gender-error'
                  : undefined
              }
            >

              <option value="" disabled>
                Select your gender
              </option>

              <option value="M">
                Male
              </option>

              <option value="F">
                Female
              </option>

            </select>

            {errors.gender && (
              <small
                id="gender-error"
                className="error-text"
                role="alert"
              >
                {errors.gender}
              </small>
            )}

          </div>





{/* ==================================================
              SECTION 21 — EMAIL FIELD
          ================================================== */}

          <div className="form-group">

            <label htmlFor="email">
              Email Address
            </label>

            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={120}
              value={formData.email}
              onChange={handleInputChange}
              aria-invalid={
                !!errors.email
              }
              aria-describedby={
                errors.email
                  ? 'email-error'
                  : undefined
              }
            />

            {errors.email && (
              <small
                id="email-error"
                className="error-text"
                role="alert"
              >
                {errors.email}
              </small>
            )}

          </div>






           {/* ==================================================
          SECTION 22 — SEARCHABLE COUNTRY SELECTOR
================================================== */}

<div className="form-group" ref={countryContainerRef}>
  <label htmlFor="country-search-input">Country of Origin</label>

  <div className="custom-country-select-wrapper" style={{ position: 'relative' }}>
    {/* Selected Flag & Input Field */}
    <div
      className="country-input-box"
      style={{
        display: 'flex',
        alignItems: 'center',
        border: errors.country ? '1px solid #e53e3e' : '1px solid #ccc',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        backgroundColor: '#fff',
        cursor: 'text',
      }}
      onClick={() =>
        setUi((prev) => ({
          ...prev,
          isCountryOpen: true,
          highlightedIndex: 0,
        }))
      }
    >
      {formData.country && (
        <span style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <ReactCountryFlag
            countryCode={formData.country}
            svg
            style={{ width: '1.4rem', height: '1.4rem' }}
          />
        </span>
      )}

      <input
  id="country-search-input"
  type="text"
  role="combobox"
  aria-expanded={ui.isCountryOpen}
  aria-controls="country-dropdown-list"
  aria-haspopup="listbox"
  aria-autocomplete="list"
  aria-activedescendant={
    ui.isCountryOpen && ui.highlightedIndex >= 0
      ? `country-option-${ui.highlightedIndex}`
      : undefined
  }
  placeholder="Type to search country..."
  value={
    ui.isCountryOpen
      ? ui.countrySearch
      : selectedCountryObj?.name || ''
  }
  onKeyDown={handleCountryKeyDown}
  onChange={(e) => {
    const val = e.target.value;
    setUi((prev) => ({
      ...prev,
      countrySearch: val,
      isCountryOpen: true,
      highlightedIndex: 0,
    }));
  }}
  onFocus={() =>
    setUi((prev) => ({
      ...prev,
      isCountryOpen: true,
      countrySearch: '',
      highlightedIndex: 0,
    }))
  }
  style={{
    border: 'none',
    outline: 'none',
    width: '100%',
    background: 'transparent',
    fontSize: '1rem',
  }}
/>

<i
  className={`fas ${ui.isCountryOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}
  style={{ color: '#888', marginLeft: '0.5rem', cursor: 'pointer' }}
/>
    </div>
      
    {/* Floating Dropdown List */}
    {ui.isCountryOpen && (
      <ul
        id="country-dropdown-list"
        className="country-dropdown-list"
        role="listbox"
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '220px',
          overflowY: 'auto',
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          margin: '4px 0 0 0',
          padding: 0,
          listStyle: 'none',
        }}
      >
        {/* Popular choices (only when not searching) */}
        {!ui.countrySearch && POPULAR_COUNTRIES.length > 0 && (
          <>
            <li
              role="presentation"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#888',
                backgroundColor: '#f8f9fa',
              }}
            >
              POPULAR CHOICES
            </li>
            {POPULAR_COUNTRIES.map((c, idx) => {
              const isHighlighted = ui.highlightedIndex === idx;
              return (
                <li
                  key={`pop-${c.code}`}
                  id={`country-option-${idx}`}
                  role="option"
                  aria-selected={formData.country === c.code}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, country: c.code }));
                    setErrors((prev) => ({ ...prev, country: undefined }));
                    setUi((prev) => ({
                      ...prev,
                      isCountryOpen: false,
                      countrySearch: '',
                      highlightedIndex: -1,
                    }));
                  }}
                  onMouseEnter={() =>
                    setUi((prev) => ({ ...prev, highlightedIndex: idx }))
                  }
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: isHighlighted
                      ? '#e8f0fe'
                      : formData.country === c.code
                      ? '#f0f7ff'
                      : '#fff',
                  }}
                >
                  <ReactCountryFlag
                    countryCode={c.code}
                    svg
                    style={{ width: '1.2rem', height: '1.2rem' }}
                  />
                  <span>{c.name}</span>
                </li>
              );
            })}
            <li
              role="presentation"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#888',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #eee',
              }}
            >
              ALL COUNTRIES
            </li>
          </>
        )}

        {/* Filtered / All Countries list */}
        {filteredCountries.length > 0 ? (
          filteredCountries.map((c, idx) => {
            // When popular section is visible, offset the index
            const absoluteIndex = !ui.countrySearch
              ? POPULAR_COUNTRIES.length + idx
              : idx;
            const isHighlighted = ui.highlightedIndex === absoluteIndex;

            return (
              <li
                key={`all-${c.code}`}
                id={`country-option-${absoluteIndex}`}
                role="option"
                aria-selected={formData.country === c.code}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, country: c.code }));
                  setErrors((prev) => ({ ...prev, country: undefined }));
                  setUi((prev) => ({
                    ...prev,
                    isCountryOpen: false,
                    countrySearch: '',
                    highlightedIndex: -1,
                  }));
                }}
                onMouseEnter={() =>
                  setUi((prev) => ({ ...prev, highlightedIndex: absoluteIndex }))
                }
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: isHighlighted
                    ? '#e8f0fe'
                    : formData.country === c.code
                    ? '#f0f7ff'
                    : '#fff',
                }}
              >
                <ReactCountryFlag
                  countryCode={c.code}
                  svg
                  style={{ width: '1.2rem', height: '1.2rem' }}
                />
                <span>{c.name}</span>
              </li>
            );
          })
        ) : (
          <li
            role="presentation"
            style={{
              padding: '12px',
              textAlign: 'center',
              color: '#888',
              fontSize: '0.9rem',
            }}
          >
            No countries found
          </li>
        )}
      </ul>
    )}

    {errors.country && (
      <small id="country-error" className="error-text" role="alert">
        {errors.country}
      </small>
    )}
  </div>
</div>

{/* ==================================================
              SECTION 23 — CITY FIELD
          ================================================== */}

          <div className="form-group">
            <label htmlFor="city">City</label>

            <input
              type="text"
              id="city"
              name="city"
              placeholder="e.g. Accra, Lagos, Nairobi"
              autoComplete="address-level2"
              required
              maxLength={100}
              value={formData.city}
              onChange={handleInputChange}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'city-error' : undefined}
            />

            {errors.city && (
              <small id="city-error" className="error-text" role="alert">
                {errors.city}
              </small>
            )}
          </div>



          {/* ==================================================
              SECTION 24 — ROLE SELECTION CARDS
          ================================================== */}

          <div className="form-group">
            <label id="role-selection-label">
              How will you use MyMarketplace?
            </label>

            <div
              className="role-selection"
              role="radiogroup"
              aria-labelledby="role-selection-label"
            >
              {/* Client */}
              <label
                className={`role-card ${
                  formData.role === 'client' ? 'active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={formData.role === 'client'}
                  onChange={() => handleRoleChange('client')}
                />
                <i className="fas fa-briefcase" aria-hidden="true"></i>
                <span>I want to Hire</span>
                <small>For clients buying a service.</small>
              </label>

              {/* Freelancer */}
              <label
                className={`role-card ${
                  formData.role === 'freelancer' ? 'active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="freelancer"
                  checked={formData.role === 'freelancer'}
                  onChange={() => handleRoleChange('freelancer')}
                />
                <i className="fas fa-pen-nib" aria-hidden="true"></i>
                <span>I want to Sell Services</span>
                <small>For freelancers selling services.</small>
              </label>

              {/* Affiliate */}
              <label
                className={`role-card ${
                  formData.role === 'affiliate' ? 'active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="affiliate"
                  checked={formData.role === 'affiliate'}
                  onChange={() => handleRoleChange('affiliate')}
                />
                <i className="fas fa-chart-line" aria-hidden="true"></i>
                <span>I am an Affiliate</span>
                <small>Earn commission by promoting services.</small>
              </label>
            </div>
          </div>

          {/* ==================================================
              SECTION 25 — REFERRAL FIELD + CONDITIONAL DISPLAY
          ================================================== */}

          <div
            id="referral-group"
            className={`form-group hidden-field ${
              formData.role === 'affiliate' ? 'show' : ''
            }`}
            aria-hidden={formData.role !== 'affiliate'}
          >
            <label htmlFor="referralCode">
              Referral / Invite Code (Optional)
            </label>

            <input
              type="text"
              id="referralCode"
              name="referralCode"
              placeholder="Enter code if you have one"
              value={formData.referralCode}
              onChange={handleInputChange}
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errors.referralCode}
              aria-describedby={
                errors.referralCode ? 'referral-error' : undefined
              }
            />

            {errors.referralCode && (
              <small id="referral-error" className="error-text" role="alert">
                {errors.referralCode}
              </small>
            )}
          </div>



        {/* ==================================================
              SECTION 26 — TERMS & CONDITIONS CHECKBOX
          ================================================== */}

          <div className="form-group terms-check">

            <label htmlFor="agreedToTerms">

              <input
                type="checkbox"
                id="agreedToTerms"
                name="agreedToTerms"
                checked={
                  formData.agreedToTerms
                }
                onChange={handleInputChange}
                required
                aria-invalid={
                  !!errors.agreedToTerms
                }
                aria-describedby={
                  errors.agreedToTerms
                    ? 'terms-error'
                    : undefined
                }
              />

              <span className="terms-text">

                I agree to the{' '}

                <Link
                  href="/terms"
                  className="terms-link"
                >
                  Terms of Service
                </Link>

                {' '}and{' '}

                <Link
                  href="/privacy"
                  className="terms-link"
                >
                  Privacy Policy
                </Link>

                .

              </span>

            </label>

            {errors.agreedToTerms && (
              <small
                id="terms-error"
                className="error-text"
                role="alert"
              >
                {errors.agreedToTerms}
              </small>
            )}

          </div>





{/* ==================================================
              SECTION 27 — SUBMIT BUTTON + LOGIN LINK
          ================================================== */}

          <button
            type="submit"
            id="submit-btn"
            className="btn-primary full-width-btn post-button"
            disabled={ui.isSubmitting}
            aria-busy={ui.isSubmitting}
          >

            <span className="btn-text">

              {ui.isSubmitting
                ? 'Finalizing...'
                : 'Save & Finalize Profile'}

            </span>

            {ui.isSubmitting && (
              <i
                className="fas fa-spinner fa-spin loader"
                aria-hidden="true"
              ></i>
            )}

          </button>

          {/* Login Link */}
          <p className="login-link">
  Already have an account?{' '}
  <Link href="/?auth=login">
    Sign In
  </Link>
</p>
        </form>


</div>

     
{/* ==================================================
          SECTION 28 — SUCCESS OVERLAY WRAPPER
      ================================================== */}

      {ui.showSuccess && (

        <div
          id="success-overlay"
          className="overlay show"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          aria-describedby="success-description"
        >

          <div className="overlay-content">
            
            {/* ==================================================
                SECTION 29 — SUCCESS CONTENT + PROFILE COMPLETE UI
            ================================================== */}            
                        
            <i
              className="fas fa-check-circle success-icon"
              aria-hidden="true"
            ></i>

            <h2 id="success-title">
              Profile Setup Complete!
            </h2>

            <p id="success-description">
              Your profile has been successfully updated. You now have full access to all platform features.
            </p>

            <Link
  href={
    formData.role === 'freelancer'
      ? '/freelancer-dashboard'
      : formData.role === 'affiliate'
      ? '/dashboard'
      : '/client-dashboard'
  }
  className="btn-primary full-width-btn"
>
  Continue to Dashboard
</Link>

          </div>

        </div>

      )}

      {/* ==================================================
          SECTION 30 — FINAL JSX CLOSURE
      ================================================== */}           

    </main>
  );
}
