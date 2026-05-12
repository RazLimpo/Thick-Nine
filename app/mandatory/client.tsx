'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ReactCountryFlag from 'react-country-flag';

import '@/styles/pages/mandatory.css';

// ============ TYPES ============
type UserRole = 'client' | 'freelancer' | 'affiliate';

interface RegistrationData {
  fullName: string;
  gender: string;
  email: string;
  password: string;
  retypePassword: string;
  country: string;
  role: UserRole;
  referralCode: string;
  agreedToTerms: boolean;
}

interface UIState {
  isSubmitting: boolean;
  showSuccess: boolean;
  passwordVisible: boolean;
  confirmVisible: boolean;
  resendCooldown: number;
  passwordStrength: number;
  strengthText: string;
}

interface FormErrors {
  fullName?: string;
  gender?: string;
  email?: string;
  password?: string;
  retypePassword?: string;
  country?: string;
  role?: string;
  referralCode?: string;
  agreedToTerms?: string;
}

// ============ COMPONENT ============
export default function MandatoryClientPage() {
  // --- Form State ---
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: '',
    gender: '',
    email: '',
    password: '',
    retypePassword: '',
    country: '',
    role: 'client',
    referralCode: '',
    agreedToTerms: false,
  });

  // --- UI State ---
  const [ui, setUi] = useState<UIState>({
    isSubmitting: false,
    showSuccess: false,
    passwordVisible: false,
    confirmVisible: false,
    resendCooldown: 0,
    passwordStrength: 0,
    strengthText: 'Too short',
  });

  // --- Errors ---
  const [errors, setErrors] = useState<FormErrors>({});

  // --- Role Selection ---
  const [selectedRole, setSelectedRole] =
    useState<UserRole>('client');

  // --- Timeout Refs ---
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    
    
    
    
    
    
    
    // ============ EFFECTS ============

  // --- Load Temporary Auth Data ---
  useEffect(() => {
    const tempAuthData = localStorage.getItem('tempAuthData');

    if (!tempAuthData) return;

    try {
      const parsed = JSON.parse(tempAuthData);

      setFormData((prev) => ({
        ...prev,
        fullName: parsed?.name || '',
        email: parsed?.email || '',
      }));

      localStorage.removeItem('tempAuthData');
    } catch (error) {
      console.error('Failed to parse tempAuthData:', error);
      localStorage.removeItem('tempAuthData');
    }
  }, []);

  // --- Password Strength Checker ---
  useEffect(() => {
    const password = formData.password;

    const calculateStrength = (pw: string) => {
      let score = 0;

      if (pw.length >= 8) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;

      return score;
    };

    const strength = calculateStrength(password);

    const strengthLabels = [
      'Too short',
      'Weak',
      'Fair',
      'Good',
      'Strong',
    ];

    setUi((prev) => ({
      ...prev,
      passwordStrength: strength,
      strengthText: strengthLabels[strength] || 'Too short',
    }));
  }, [formData.password]);

  // --- Resend Cooldown Timer ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (ui.resendCooldown > 0) {
      interval = setInterval(() => {
        setUi((prev) => ({
          ...prev,
          resendCooldown: Math.max(prev.resendCooldown - 1, 0),
        }));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [ui.resendCooldown]);

  // --- Cleanup Timeouts On Unmount ---
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      if (resendTimeoutRef.current) {
        clearTimeout(resendTimeoutRef.current);
      }
    };
  }, []);
    
    
    
    
    
    
    
    // ============ HANDLERS ============

  // --- Input Change Handler ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { id, name, value, type } = e.target;

    const fieldKey = (id || name) as keyof RegistrationData;

    const fieldValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : value;

    setFormData((prev) => ({
      ...prev,
      [fieldKey]:
        typeof fieldValue === 'string'
          ? fieldValue
          : fieldValue,
    }));

    // Clear field-specific error
    if (errors[fieldKey]) {
      setErrors((prev) => ({
        ...prev,
        [fieldKey]: '',
      }));
    }
  };

  // --- Role Selection ---
  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);

    setFormData((prev) => ({
      ...prev,
      role,
    }));
  };

  // --- Form Validation ---
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const trimmedFullName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();

    // Full Name
    if (!trimmedFullName) {
      newErrors.fullName = 'Full name is required.';
    }

    // Gender
    if (!formData.gender) {
      newErrors.gender = 'Please select your gender.';
    }

    // Email
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email =
          'Please enter a valid email address.';
      }
    }

    // Password
    if (formData.password.length < 8) {
      newErrors.password =
        'Password must be at least 8 characters.';
    }

    // Confirm Password
    if (
      formData.password !== formData.retypePassword
    ) {
      newErrors.retypePassword =
        'Passwords do not match.';
    }

    // Country
    if (!formData.country) {
      newErrors.country =
        'Please select your country.';
    }

    // Terms
    if (!formData.agreedToTerms) {
      newErrors.agreedToTerms =
        'You must agree to the Terms and Privacy Policy.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // --- Submit Handler ---
  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUi((prev) => ({
      ...prev,
      isSubmitting: true,
    }));

    submitTimeoutRef.current = setTimeout(() => {
      try {
        // NOTE:
        // Replace this with real backend auth/session logic in production.

        localStorage.setItem('isLoggedIn', 'true');

        localStorage.setItem(
          'userName',
          formData.fullName.trim()
        );

        localStorage.setItem(
          'userRole',
          formData.role
        );

        localStorage.setItem(
          'isProfileComplete',
          'true'
        );

        localStorage.setItem(
          'isEmailVerified',
          'false'
        );

        localStorage.setItem(
          'registrationTimestamp',
          Date.now().toString()
        );

        // Clear sensitive password data
        setFormData((prev) => ({
          ...prev,
          password: '',
          retypePassword: '',
        }));

        setUi((prev) => ({
          ...prev,
          isSubmitting: false,
          showSuccess: true,
        }));
      } catch (error) {
        console.error(
          'Failed to finalize account:',
          error
        );

        setUi((prev) => ({
          ...prev,
          isSubmitting: false,
        }));
      }
    }, 1800);
  };

  // --- Resend Verification Email ---
  const handleResendEmail = () => {
    if (ui.resendCooldown > 0) {
      return;
    }

    setUi((prev) => ({
      ...prev,
      resendCooldown: 60,
    }));

    resendTimeoutRef.current = setTimeout(() => {
      console.log(
        'Verification email resend triggered.'
      );

      // Replace with backend API request
    }, 1000);
  };
      
      
      
      
      
      
      
      
      // ============ RENDER ============
  return (
    <main className="form-layout">
      <div className="form-container">

        <h1>Finalize Your Account</h1>

        <p className="form-instruction">
          Complete your account setup to unlock full platform access.
        </p>

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
              aria-invalid={!!errors.fullName}
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
              >
                {errors.fullName}
              </small>
            )}
          </div>

          {/* Gender */}
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
              aria-invalid={!!errors.gender}
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
              >
                {errors.gender}
              </small>
            )}
          </div>

          {/* Email */}
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
              required
              maxLength={120}
              value={formData.email}
              onChange={handleInputChange}
              aria-invalid={!!errors.email}
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
              >
                {errors.email}
              </small>
            )}
          </div>






{/* Password */}
          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-wrapper">

              <input
                type={
                  ui.passwordVisible
                    ? 'text'
                    : 'password'
                }
                id="password"
                name="password"
                placeholder="Min 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={formData.password}
                onChange={handleInputChange}
                aria-invalid={!!errors.password}
              />

              <button
                type="button"
                className="toggle-password"
                aria-label={
                  ui.passwordVisible
                    ? 'Hide password'
                    : 'Show password'
                }
                onClick={() =>
                  setUi((prev) => ({
                    ...prev,
                    passwordVisible:
                      !prev.passwordVisible,
                  }))
                }
              >

                <i
                  className={`fas ${
                    ui.passwordVisible
                      ? 'fa-eye-slash'
                      : 'fa-eye'
                  }`}
                  aria-hidden="true"
                ></i>

              </button>

            </div>

            <div className="strength-meter">
              <div
                className={`strength-bar ${
                  ui.passwordStrength === 1
                    ? 'strength-weak'
                    : ui.passwordStrength === 2 ||
                      ui.passwordStrength === 3
                    ? 'strength-medium'
                    : ui.passwordStrength === 4
                    ? 'strength-strong'
                    : ''
                }`}
                style={{
                  width: `${
                    (ui.passwordStrength / 4) *
                    100
                  }%`,
                }}
              ></div>
            </div>

            <small id="strength-text">
              Strength: {ui.strengthText}
            </small>

            {errors.password && (
              <small
                className="error-text"
                style={{ display: 'block' }}
              >
                {errors.password}
              </small>
            )}
          </div>

          {/* Retype Password */}
          <div className="form-group">
            <label htmlFor="retypePassword">
              Retype Password
            </label>

            <div className="password-wrapper">

              <input
                type={
                  ui.confirmVisible
                    ? 'text'
                    : 'password'
                }
                id="retypePassword"
                name="retypePassword"
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={formData.retypePassword}
                onChange={handleInputChange}
                aria-invalid={
                  !!errors.retypePassword
                }
              />

              <button
                type="button"
                className="toggle-password"
                aria-label={
                  ui.confirmVisible
                    ? 'Hide password'
                    : 'Show password'
                }
                onClick={() =>
                  setUi((prev) => ({
                    ...prev,
                    confirmVisible:
                      !prev.confirmVisible,
                  }))
                }
              >

                <i
                  className={`fas ${
                    ui.confirmVisible
                      ? 'fa-eye-slash'
                      : 'fa-eye'
                  }`}
                  aria-hidden="true"
                ></i>

              </button>

            </div>

            {errors.retypePassword && (
              <small
                className="error-text"
                style={{ display: 'block' }}
              >
                {errors.retypePassword}
              </small>
            )}
          </div>



{/* Country */}
          <div className="form-group">
            <label htmlFor="country">
              Country of Origin
            </label>

            <div className="select-wrapper">

              {/* Flag Preview */}
<span
  id="flag-preview"
  className={`flag-placeholder ${
    formData.country ? 'show' : ''
  }`}
  aria-hidden="true"
>
  {formData.country && (
    <ReactCountryFlag
      countryCode={formData.country}
      svg
      style={{
        width: '24px',
        height: '24px',
      }}
    />
  )}
</span>

              <select
                id="country"
                name="country"
                required
                value={formData.country}
                onChange={handleInputChange}
                aria-invalid={!!errors.country}
                aria-describedby={
                  errors.country
                    ? 'country-error'
                    : undefined
                }
              >
                <option value="" disabled>
                  Select your country
                </option>

                {/* Frequent Countries */}
                <option value="US">
                  United States
                </option>

                <option value="GB">
                  United Kingdom
                </option>

                <option value="CA">
                  Canada
                </option>

                <option value="AU">
                  Australia
                </option>

                <option value="NG">
                  Nigeria
                </option>

                <option value="IN">
                  India
                </option>

                <option disabled>
                  ──────────
                </option>

                <option disabled>
                  FULL LIST (ALPHABETICAL)
                </option>

                {/* Full Country List Continues Below */}
                
                
      <option value="AF">Afghanistan</option>
      <option value="AL">Albania</option>
      <option value="DZ">Algeria</option>
      <option value="AD">Andorra</option>
      <option value="AO">Angola</option>
      <option value="AR">Argentina</option>
      <option value="AM">Armenia</option>
      <option value="AT">Austria</option>
      <option value="AZ">Azerbaijan</option>
      <option value="BS">Bahamas</option>
      <option value="BH">Bahrain</option>
      <option value="BD">Bangladesh</option>
      <option value="BE">Belgium</option>
      <option value="BZ">Belize</option>
      <option value="BJ">Benin</option>
      <option value="BT">Bhutan</option>
      <option value="BO">Bolivia</option>
      <option value="BR">Brazil</option>
      <option value="VG">British Virgin Islands</option>
      <option value="BN">Brunei</option>
      <option value="BG">Bulgaria</option>
      <option value="BF">Burkina Faso</option>
      <option value="BI">Burundi</option>
      <option value="KH">Cambodia</option>
      <option value="CM">Cameroon</option>
      <option value="CV">Cape Verde</option>
      <option value="CF">Central African Republic</option>
      <option value="TD">Chad</option>
      <option value="CL">Chile</option>
      <option value="CN">China</option>
      <option value="CO">Colombia</option>
      <option value="KM">Comoros</option>
      <option value="CG">Congo - Brazzaville</option>
      <option value="CD">Congo - Kinshasa</option>
      <option value="CR">Costa Rica</option>
      <option value="CI">Côte d’Ivoire</option>
      <option value="HR">Croatia</option>
      <option value="CU">Cuba</option>
      <option value="CY">Cyprus</option>
      <option value="CZ">Czech Republic</option>
      <option value="DK">Denmark</option>
      <option value="DJ">Djibouti</option>
      <option value="DM">Dominica</option>
      <option value="DO">Dominican Republic</option>
      <option value="EC">Ecuador</option>
      <option value="EG">Egypt</option>
      <option value="SV">El Salvador</option>
      <option value="GQ">Equatorial Guinea</option>
      <option value="ER">Eritrea</option>
      <option value="EE">Estonia</option>
      <option value="ET">Ethiopia</option>
      <option value="FJ">Fiji</option>
      <option value="FI">Finland</option>
      <option value="FR">France</option>
      <option value="GA">Gabon</option>
      <option value="GM">Gambia</option>
      <option value="GE">Georgia</option>
      <option value="DE">Germany</option>
      <option value="GR">Greece</option>
      <option value="GD">Grenada</option>
      <option value="GT">Guatemala</option>
      <option value="GN">Guinea</option>
      <option value="GW">Guinea-Bissau</option>
      <option value="GY">Guyana</option>
      <option value="HT">Haiti</option>
      <option value="HN">Honduras</option>
      <option value="HK">Hong Kong SAR China</option>
      <option value="HU">Hungary</option>
      <option value="IS">Iceland</option>
      <option value="ID">Indonesia</option>
      <option value="IR">Iran</option>
      <option value="IQ">Iraq</option>
      <option value="IE">Ireland</option>
      <option value="IL">Israel</option>
      <option value="IT">Italy</option>
      <option value="JM">Jamaica</option>
      <option value="JP">Japan</option>
      <option value="JO">Jordan</option>
      <option value="KZ">Kazakhstan</option>
      <option value="KE">Kenya</option>
      <option value="KI">Kiribati</option>
      <option value="KW">Kuwait</option>
      <option value="KG">Kyrgyzstan</option>
      <option value="LA">Laos</option>
      <option value="LV">Latvia</option>
      <option value="LB">Lebanon</option>
      <option value="LS">Lesotho</option>
      <option value="LR">Liberia</option>
      <option value="LY">Libya</option>
      <option value="LI">Liechtenstein</option>
      <option value="LT">Lithuania</option>
      <option value="LU">Luxembourg</option>
      <option value="MO">Macau SAR China</option>
      <option value="MK">Macedonia</option>
      <option value="MG">Madagascar</option>
      <option value="MW">Malawi</option>
      <option value="MY">Malaysia</option>
      <option value="MV">Maldives</option>
      <option value="ML">Mali</option>
      <option value="MT">Malta</option>
      <option value="MH">Marshall Islands</option>
      <option value="MR">Mauritania</option>
      <option value="MU">Mauritius</option>
      <option value="MX">Mexico</option>
      <option value="FM">Micronesia</option>
      <option value="MD">Moldova</option>
      <option value="MC">Monaco</option>
      <option value="MN">Mongolia</option>
      <option value="ME">Montenegro</option>
      <option value="MA">Morocco</option>
      <option value="MZ">Mozambique</option>
      <option value="MM">Myanmar (Burma)</option>
      <option value="NA">Namibia</option>
      <option value="NR">Nauru</option>
      <option value="NP">Nepal</option>
      <option value="NL">Netherlands</option>
      <option value="NZ">New Zealand</option>
      <option value="NI">Nicaragua</option>
      <option value="NE">Niger</option>
      <option value="KP">North Korea</option>
      <option value="NO">Norway</option>
      <option value="OM">Oman</option>
      <option value="PK">Pakistan</option>
      <option value="PW">Palau</option>
      <option value="PS">Palestinian Territories</option>
      <option value="PA">Panama</option>
      <option value="PG">Papua New Guinea</option>
      <option value="PY">Paraguay</option>
      <option value="PE">Peru</option>
      <option value="PH">Philippines</option>
      <option value="PL">Poland</option>
      <option value="PT">Portugal</option>
      <option value="QA">Qatar</option>
      <option value="RO">Romania</option>
      <option value="RU">Russia</option>
      <option value="RW">Rwanda</option>
      <option value="WS">Samoa</option>
      <option value="SM">San Marino</option>
      <option value="ST">São Tomé and Príncipe</option>
      <option value="SA">Saudi Arabia</option>
      <option value="SN">Senegal</option>
      <option value="RS">Serbia</option>
      <option value="SC">Seychelles</option>
      <option value="SL">Sierra Leone</option>
      <option value="SG">Singapore</option>
      <option value="SK">Slovakia</option>
      <option value="SI">Slovenia</option>
      <option value="SB">Solomon Islands</option>
      <option value="SO">Somalia</option>
      <option value="ZA">South Africa</option>
      <option value="KR">South Korea</option>
      <option value="ES">Spain</option>
      <option value="LK">Sri Lanka</option>
      <option value="SD">Sudan</option>
      <option value="SR">Suriname</option>
      <option value="SZ">Swaziland</option>
      <option value="SE">Sweden</option>
      <option value="CH">Switzerland</option>
      <option value="SY">Syria</option>
      <option value="TW">Taiwan</option>
      <option value="TJ">Tajikistan</option>
      <option value="TZ">Tanzania</option>
      <option value="TH">Thailand</option>
      <option value="TG">Togo</option>
      <option value="TO">Tonga</option>
      <option value="TT">Trinidad and Tobago</option>
      <option value="TN">Tunisia</option>
      <option value="TR">Turkey</option>
      <option value="TM">Turkmenistan</option>
      <option value="TV">Tuvalu</option>
      <option value="UG">Uganda</option>
      <option value="UA">Ukraine</option>
      <option value="AE">United Arab Emirates</option>
      <option value="UY">Uruguay</option>
      <option value="UZ">Uzbekistan</option>
      <option value="VU">Vanuatu</option>
      <option value="VE">Venezuela</option>
      <option value="VN">Vietnam</option>
      <option value="YE">Yemen</option>
      <option value="ZM">Zambia</option>
      <option value="ZW">Zimbabwe</option>


                
               </select>

              {errors.country && (
                <small
                  id="country-error"
                  className="error-text"
                >
                  {errors.country}
                </small>
              )}

            </div>
          </div>




{/* Role Selection */}
          <div className="form-group">
            <label>
              How will you use MyMarketplace?
            </label>

            <div className="role-selection">

              {/* Client */}
              <label
                className="role-card"
              >
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={
                    selectedRole === 'client'
                  }
                  onChange={() =>
                    handleRoleChange('client')
                  }
                />

                <i
                  className="fas fa-briefcase"
                  aria-hidden="true"
                ></i>

                <span>
                  I want to Hire
                </span>

                <small>
                  For clients buying a service.
                </small>
              </label>

              {/* Freelancer */}
              <label
                className="role-card"
              >
                <input
                  type="radio"
                  name="role"
                  value="freelancer"
                  checked={
                    selectedRole ===
                    'freelancer'
                  }
                  onChange={() =>
                    handleRoleChange(
                      'freelancer'
                    )
                  }
                />

                <i
                  className="fas fa-pen-nib"
                  aria-hidden="true"
                ></i>

                <span>
                  I want to Sell Services
                </span>

                <small>
                  For freelancers selling service.
                </small>
              </label>

              {/* Affiliate */}
              <label
                className="role-card"
              >
                <input
                  type="radio"
                  name="role"
                  value="affiliate"
                  checked={
                    selectedRole ===
                    'affiliate'
                  }
                  onChange={() =>
                    handleRoleChange(
                      'affiliate'
                    )
                  }
                />

                <i
                  className="fas fa-chart-line"
                  aria-hidden="true"
                ></i>

                <span>
                  I am an Affiliate
                </span>

                <small>
                  Earn commission by promoting services.
                </small>
              </label>

            </div>
          </div>



{/* Referral Code */}
          <div
            id="referral-group"
            className={`form-group hidden-field ${
              selectedRole === 'affiliate'
                ? 'show'
                : ''
            }`}
          >
            <label htmlFor="referralCode">
              Referral/Invite Code (Optional)
            </label>

            <input
              type="text"
              id="referralCode"
              name="referralCode"
              placeholder="Enter code if you have one"
              value={formData.referralCode}
              onChange={handleInputChange}
              maxLength={50}
            />
          </div>

          {/* Terms */}
          <div className="form-group terms-check">
            <label>

              <input
                type="checkbox"
                id="agreedToTerms"
                name="agreedToTerms"
                checked={formData.agreedToTerms}
                onChange={handleInputChange}
                required
                aria-invalid={
                  !!errors.agreedToTerms
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
                </Link>.
              </span>

            </label>

            {errors.agreedToTerms && (
              <small
                className="error-text"
                style={{ display: 'block' }}
              >
                {errors.agreedToTerms}
              </small>
            )}
          </div>

          {/* Submit Button */}
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
                : 'Create Account'}
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

            <Link href="/login">
              Sign In
            </Link>
          </p>

        </form>
      </div>




{/* --- E. Success Overlay --- */}
      {ui.showSuccess && (
        <div
          id="success-overlay"
          className="overlay show"
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
        >
          <div className="overlay-content">

            <i
              className="fas fa-envelope-open-text success-icon"
              aria-hidden="true"
            ></i>

            <h2 id="success-title">
              Check Your Inbox!
            </h2>

            <p>
              Registration successful. Please visit your
              email inbox to validate your account before
              logging in.
            </p>

            <Link
              href="/login"
              className="btn-primary full-width-btn"
            >
              Go to Login
            </Link>

            <div
              className="resend-container"
              style={{ marginTop: '20px' }}
            >

              <p
                style={{
                  fontSize: '0.9rem',
                  color: '#666',
                }}
              >
                Didn&apos;t get the email?
              </p>

              <button
                type="button"
                onClick={handleResendEmail}
                className="btn-link"
                disabled={
                  ui.resendCooldown > 0
                }
                style={{
                  justifyContent: 'center',
                  opacity:
                    ui.resendCooldown > 0
                      ? 0.6
                      : 1,
                }}
              >

                <i
                  className="fas fa-redo"
                  aria-hidden="true"
                ></i>

                {' '}Resend Verification Link

              </button>

              {ui.resendCooldown > 0 && (
                <p
                  id="resend-timer"
                  className="timer-visible"
                  style={{
                    fontSize: '0.8rem',
                    color: '#999',
                    marginTop: '5px',
                  }}
                >
                  You can resend again in{' '}

                  <span id="timer-seconds">
                    {ui.resendCooldown}
                  </span>

                  s
                </p>
              )}

            </div>

          </div>
        </div>
      )}

    </main>
  );
}