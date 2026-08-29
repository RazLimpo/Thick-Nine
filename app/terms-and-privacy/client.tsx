"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "@/styles/pages/terms-and-privacy.css";

type LegalTab = "terms" | "privacy";

function TermsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<LegalTab>(
    tabParam === "privacy" ? "privacy" : "terms"
  );

  useEffect(() => {
    if (tabParam === "privacy") setActiveTab("privacy");
    else if (tabParam === "terms") setActiveTab("terms");
  }, [tabParam]);

  return (
    <>
      {/* Document Switcher Tabs */}
      <div className="legal-tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          Terms of Service
        </button>
        <button 
          className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
      </div>

      {activeTab === 'terms' ? (
        /* TERMS OF SERVICE VIEW */
        <article className="legal-view-wrapper">
          <div className="legal-header">
            <h1>Thick 9 International Terms of Service</h1>
            <p className="last-updated">Last Update: 27 June, 2026</p>
            <p className="sub-text">Welcome to <Link href="https://thick9.com">www.thick9.com</Link></p>
          </div>

          <div className="legal-content">
            <section id="terms-of-service">
              <h2>Terms of Service</h2>
              <p>By accessing or using Thick 9, you agree to be bound by these Terms...</p>
            </section>
            
            <section>
              <h2>A Pact Between a User and Thick 9 Int.</h2>
              <p>This website has been established only to assist user(s) to engage themselves in business transactions that have the capability of being rendered and delivered via online in our hustle free and well secured cyber environment. This website is for no other purpose than this. All activities of a user of the website must have bearing on digital related service(s) that are spelt out within the confinement of these terms and conditions.</p>
              <p>The following Terms of Service govern your access to and use of the Thick 9 website, including any content, functionality and service offered on or through <Link href="https://thick9.com">www.thick9.com</Link> by Thick 9 Int., as applicable. Thick 9 Int., referred hereto as “Thick 9”, “we” or “us” and “you” or “user” means you as a user of the site.</p>
              <div className="highlight-box">
                <p><strong>Please read these Terms of Use carefully before using this website.</strong> By accessing, browsing, or using this website, you acknowledge that you have read (or read to), understood, and agreed to be bound by these Terms of Use. You are obliged to read our Privacy Policy too. If you do not accept these Terms of Use or any of its related content, do not use the website.</p>
              </div>
            </section>

            <section>
              <h2>Use of the Website</h2>
              <p>Once you start using the website, then it means you have adequate grounds to justify that:</p>
              <ol>
                <li>You are using the website in accordance with all the articles and clauses as spelt herein as Terms of Use.</li>
                <li>You are at least 18 years of age.</li>
                <li>You possess the legal authority to create a binding legal contract.</li>
                <li>All information provided by you on this website is true, accurate, current and complete with nothing misleading.</li>
                <li>You will only use this website to make legitimate transaction(s) within the scopes of these Terms and Conditions.</li>
                <li>Your account’s information will be safeguarded by you and also, you would supervise any activity related to your account. You are solely responsible for any use of your account.</li>
              </ol>
              <p><em>NB: We retain the right at our sole discretion to deny access to anyone to this website at any time and for any reason, including violation of these Terms of Use.</em></p>
            </section>

            <section>
              <h2>Essential Parameters</h2>
              <p>Unless otherwise stated, we and/or our licensors (Thick 9 Int., PremiumPress Ltd and PayPal Inc. respectively) own the intellectual property rights in the website and the material on the website with the exception of user generated content. Subject to the license, all of these intellectual property rights are reserved.</p>
              <p><strong>You must not:</strong></p>
              <ul>
                <li>Republish material from this website (including republication on another website);</li>
                <li>Sell, rent or sub-license a copyright material from the website;</li>
                <li>Show any material from the website in public in a degrading manner;</li>
                <li>Reproduce, duplicate, copy or otherwise exploit material on our website for a commercial purpose outside the scope of the website;</li>
                <li>Edit or otherwise modify any material on the website;</li>
                <li>Use our website in any way that causes, or may cause, damage to the website or impairment of accessibility;</li>
                <li>Conduct any systematic or automated data collection activities (scraping, data mining, extraction) without our express written consent.</li>
              </ul>
              <p><em>NB: If a user’s account shows signs of fraud, abuse or suspicious activity, Thick 9 may ban the account without prior notice.</em></p>
            </section>

            <section>
              <h2>Main Terms</h2>
              <ul>
                <li>1. Thick 9 is opened to everyone. Registration is free.</li>
                <li>2. A user may be required to go through a verification process (email, ID, phone number, camera, etc).</li>
                <li>3. A verified registered user can buy or sell any digital related services within our frameworks.</li>
                <li>4. A user’s profile must be kept in its true sense free from misleading or false information.</li>
                <li>5. Price of an enlisted service is determined by the seller under the monitoring of Thick 9 to prevent exploitation.</li>
                <li>6. Buyer-to-Seller payment is an <strong>escrow system managed in USD with a 14-day security hold</strong> for financial security. See &quot;ESCROW, PAYMENTS & WITHDRAWALS&quot; below.</li>
                <li>7. Users must not offer or accept payments using any other method than through <Link href="https://thick9.com">www.thick9.com</Link>.</li>
                <li>8. Thick 9 retains the right to use published services, logo designs and testimonials for marketing purposes.</li>
                <li>9. Communication between users and Thick 9 must be friendly, constructive, and professional.</li>
                <li>10. As a user, never reveal your password or bank account information to another user.</li>
                <li>11. A banned account will have available funds frozen and released only after six (6) months upon owner verification.</li>
              </ul>
            </section>

            <section>
              <h2>General Restrictions</h2>
              <p>Violation of these restrictions may call for direct warning, suspension or removal:</p>
              <ul>
                <li>Rude, abusive, improper language, or violent messages are not allowed.</li>
                <li>Interaction must be free from discrimination based on gender, race, age, religious affiliation, or sexual orientation.</li>
                <li>Luring users to reveal personal details, phishing, and brand assassination are prohibited.</li>
                <li>Spamming activities will warrant account restrictions.</li>
                <li>User is restricted from any activity (writing/pictures/films) which has no literary value other than stimulating sexual desire. <strong>Pornographic contents are prohibited.</strong></li>
              </ul>
            </section>

            <section id="escrow-policy">
              <h2>Escrow, Payments & Withdrawals</h2>
              <div className="highlight-box">
                <p><strong>Important: USD Only + 14-Day Hold</strong> All payments are held in USD in our escrow account. Freelancers are paid 85% of the job value, 14 days after the buyer marks the job &quot;Complete&quot;.</p>
              </div>

              <h3>1. How Buyer Payments Work</h3>
              <ol>
                <li>Buyers pay 100% of the project fee to Thick 9 via PayPal Checkout.</li>
                <li>Funds are held as USD escrow and are NOT released to the freelancer until delivery is approved + 14 days have passed. This protects against PayPal chargebacks.</li>
                <li>Thick 9 charges a 15% platform fee. The freelancer receives 85%.</li>
              </ol>

              <h3>2. Freelancer Withdrawals & Exchange Rate Risk</h3>
              <ul>
                <li><strong>Currency:</strong> All freelancer earnings are in USD. $100 earned = $100 held by us.</li>
                <li><strong>Withdrawal Method:</strong> Payouts are made in USD via Payoneer. From Payoneer, you can withdraw to your local bank, M-Pesa, or mobile money.</li>
                <li><strong>FX Risk is Yours:</strong> The amount of KES, NGN, GHS, or UGX you receive depends on the Payoneer + Bank rate on the day you withdraw. Thick 9 does not control, guarantee, or absorb any local currency rate changes.</li>
                <li><strong>Withdrawal Fees:</strong> Payoneer charges ~2% + $1.50 per withdrawal. Bank/M-Pesa may charge additional fees. These are deducted by Payoneer, not Thick 9.</li>
              </ul>

              <h3>3. Refunds & Chargebacks</h3>
              <p>If a buyer disputes the charge with PayPal after we have paid the freelancer, PayPal can reverse the funds + a $20 fee. If this happens after payout, the freelancer agrees to refund the full amount to Thick 9. This is why the 14-day hold is mandatory. Refunds to buyers are only possible during the 14-day escrow period.</p>
            </section>
                        
            <section id="cancellation-policy">
              <h2>Cancellation & Refund Policy</h2>

              <h3>1. Buyer Cancellations</h3>
              <p><strong>Before work starts:</strong> Full refund to original PayPal, minus 5% service fee, if requested within 1 hour of payment.</p>
              <p><strong>After work starts:</strong> No refund. Funds are held in escrow and will be released to the freelancer for work completed per the order brief.</p>

              <h3>2. Freelancer Cancellations / No Delivery</h3>
              <p>If a freelancer fails to deliver by the agreed date, the buyer receives a 100% refund from escrow, including service fees. The freelancer is not paid.</p>

              <h3>3. Disputes</h3>
              <p>All disputes during the 14-day escrow hold period are mediated by Thick 9. Our decision is final.</p>
            </section>
                        
            <section>
              <h2>Dispute Resolution Policy</h2>
              <p>At Thick 9, our goal is to resolve issues fairly without forcing PayPal chargebacks, which can get accounts banned.</p>

              <h3>1. Our 3-Step Mediation Process</h3>
              <ol>
                <li><strong>Step 1: Talk First - 72 Hours:</strong> Both parties must attempt to resolve the issue in chat within 72 hours of delivery.</li>
                <li><strong>Step 2: Raise Dispute:</strong> If no agreement, either party clicks &quot;Raise Dispute&quot;. Our team will review chat logs, gig description, files delivered, and deadlines. We make a binding decision within 7 days.</li>
                <li><strong>Step 3: Escrow Decision:</strong> Outcome A: Freelancer wins = Funds released after 14-day hold. Outcome B: Buyer wins = Partial or full refund from escrow. Outcome C: Split = We can split funds 50/50.</li>
              </ol>

              <h3>2. Binding Decision & PayPal Ban</h3>
              <p>Our decision is final and binding. By using Thick 9, you agree NOT to open a PayPal dispute while a case is open with us. Opening a PayPal dispute during mediation will result in immediate account suspension and forfeiture of funds.</p>

              <h3>3. Dispute Rules</h3>
              <ul>
                <li><strong>Scope = King:</strong> Only work listed in the gig description/order is covered. Extra work = new order.</li>
                <li><strong>Proof Required:</strong> Freelancers must upload delivery files on-platform. Buyers must provide specific written feedback.</li>
                <li><strong>Revisions:</strong> 2 revisions are included unless the gig states otherwise.</li>
                <li><strong>No Payout Reversals:</strong> Once funds are released to Payoneer, Thick 9 cannot reverse it.</li>
              </ul>
            </section>

            <section>
              <h2>Privacy Rights</h2>
              <p>We may transfer or sub-contract our rights without notifying you. We may disclose data to affiliated organizations and service providers in accordance with GDPR. We may also disclose information if required by law or law enforcement.</p>
              <p>For more information, <button type="button" onClick={() => setActiveTab('privacy')} className="inline-link-btn">read our Privacy Policy here</button>.</p>
            </section>

            <section>
              <h2>Limited Warranties & Liability</h2>
              <p>We do not warrant completeness or accuracy, nor do we commit to the website remaining functional 100% of the time. Factors like technical issues, cyber attacks, or natural disasters could result in unavailability. <strong>A user using the site does so at his/her own risk.</strong></p>
              <p>We will not be liable for financial losses, loss of data, or any special indirect/consequential damage.</p>
            </section>

            <section>
              <h2>Indemnity & Severability</h2>
              <p>You hereby indemnify Thick 9 against any losses or expenses arising out of any breach by you of these provisions.</p>
              <p>If a provision is determined to be unlawful, the other provisions will continue in effect.</p>
            </section>

            <section>
              <h2>Entire Agreement</h2>
              <p>These terms of use, together with our privacy policy, constitute the entire agreement between you and Thick 9 in relation to your use of our website.</p>
            </section>
          </div>
        </article>
      ) : (
        /* PRIVACY POLICY VIEW */
        <article className="legal-view-wrapper">
          <div className="legal-header">
            <h1>Thick 9 Privacy Policy</h1>
            <p className="last-updated">Last Update: 1 May, 2025</p>
            <p style={{ color: '#777' }}>Our website address is: <strong>https://thick9.com</strong></p>
          </div>

          <div className="legal-content">
            <section>
              <p>This privacy policy discloses the privacy practices for <strong>Thick 9 Int.</strong> web platform. This policy applies solely to information collected by this website. By accessing or using <Link href="https://thick9.com">www.thick9.com</Link>, you acknowledge this policy as legally binding.</p>
              <div className="highlight-box">
                <p><strong>This policy notifies you of:</strong></p>
                <ul>
                  <li>What personally identifiable information is collected and how it is used.</li>
                  <li>What choices are available to you regarding the use of your data.</li>
                  <li>The security procedures in place to protect your information.</li>
                  <li>How you can correct any inaccuracies in the information.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2>1. Information Collection, Use, and Sharing</h2>
              <p>We are the sole owners of the information collected on this site. We only have access to/collect information that you voluntarily give us via email, registration forms, or other direct contact from you. We will not sell or rent this information to anyone.</p>
              <p><strong>We use your information to:</strong></p>
              <ul>
                <li>Fulfill your requests (e.g., processing transactions or registering your account).</li>
                <li>Communicate with you regarding your account, orders, or platform updates.</li>
                <li>Improve our platform functionality and user experience.</li>
              </ul>
              <p>Unless you ask us not to, we may contact you via email in the future to tell you about specials, new products or services, or changes to this privacy policy.</p>
            </section>

            <section>
              <h2>2. Registration and Profiles</h2>
              <p>In order to use this website, a user must first complete the registration form. During registration, a user is required to give certain information (such as name, email address, and country). This information is used to contact you about the services on our site in which you have expressed interest.</p>
              <p><strong>Public Profiles:</strong> Any information you share on your public profile (bio, skills, portfolio) will be visible to other users. We advise you not to share sensitive personal details (like home addresses) in these public sections.</p>
            </section>

            <section>
              <h2>3. Cookies and Tracking</h2>
              <p>We use &quot;cookies&quot; on this site. A cookie is a piece of data stored on a site visitor&apos;s hard drive to help us improve your access to our site and identify repeat visitors. Cookies enable us to track and target the interests of our users to enhance their experience on our site. Usage of a cookie is in no way linked to any personally identifiable information on our site.</p>
            </section>

            <section>
              <h2>4. Your Access to and Control Over Information</h2>
              <p>You may opt out of any future contacts from us at any time. You can do the following at any time by contacting us via the email address provided on our website:</p>
              <ul>
                <li>See what data we have about you, if any.</li>
                <li>Change/correct any data we have about you.</li>
                <li>Have us delete any data we have about you (subject to legal/financial retention requirements).</li>
                <li>Express any concern you have about our use of your data.</li>
              </ul>
            </section>

            <section>
              <h2>5. Security</h2>
              <p>We take precautions to protect your information. When you submit sensitive information via the website, your information is protected both online and offline.</p>
              <p>Wherever we collect sensitive information (such as credit card data), that information is encrypted and transmitted to us in a secure way. You can verify this by looking for a lock icon in the address bar and looking for &quot;https&quot; at the beginning of the address of the Web page.</p>
              <p>While we use encryption to protect sensitive information transmitted online, we also protect your information offline. Only employees who need the information to perform a specific job (for example, billing or customer service) are granted access to personally identifiable information.</p>
            </section>

            <section>
              <h2>6. Data Protection Rights (GDPR/CCPA)</h2>
              <p>Under certain regulations, you have the right to request access to, deletion of, or portability of your personal data. You also have the right to object to the processing of your data. If you wish to exercise these rights, please contact <strong>panel@thick9.com</strong>.</p>
              <p>If you feel that we are not abiding by this privacy policy, you should contact us immediately via the email above.</p>
            </section>

            <section>
              <h2>7. Policy Updates</h2>
              <p>Our Privacy Policy may change from time to time and all updates will be posted on this page. Notification of the updates will be sent to all our users. Changes to this Privacy Policy are effective as of the last stated date updated which can be seen at the top of this page.</p>
            </section>
          </div>
        </article>
      )}
    </>
  );
}

export default function TermsClientLayout() {
  return (
    <main className="legal-container">
      <Link href="/" className="back-home">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </Link>

      <Suspense fallback={<div>Loading legal documents...</div>}>
        <TermsContent />
      </Suspense>
    </main>
  );
}