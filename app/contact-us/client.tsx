'use client';

import React, { useState } from 'react';
import '@/styles/pages/contact-us.css';

const WHATSAPP_NUMBER = '971544480976';

export default function ContactUsClient() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleWhatsAppRedirect = () => {
    const { firstName, lastName, email, subject, message } = formData;

    if (!firstName || !email || !message) {
      setError('Please fill in your name, email, and message before opening WhatsApp.');
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const formattedMessage = [
      'Hi Thick Nine,',
      '',
      `My name is ${fullName}.`,
      `Email: ${email}`,
      '',
      `Subject: ${subject || 'General Inquiry'}`,
      '',
      'Message:',
      message,
      '',
      'I would like to continue this conversation on WhatsApp.',
    ].join('\n');

    const encodedMessage = encodeURIComponent(formattedMessage);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: '',
        });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message || 'Failed to submit form. Please try again.');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content-wrapper">
      <main className="contact-page">
        <section className="contact-section">
          <div className="container">
            <div className="contact-grid">
              
              {/* SECTION TITLE: Contact Form Container */}
              <div className="form-wrapper glass-card form-indigo">
                <div className="form-header">
                  <h2>Send us a message</h2>
                  <p>Fill out the form below and we’ll get back to you shortly.</p>
                </div>

                {error && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>}

                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  {/* First Name + Last Name */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name</label>
                      <div className="input-with-icon">
                        <i className="fas fa-user" aria-hidden="true"></i>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="lastName">Last Name</label>
                      <div className="input-with-icon">
                        <i className="fas fa-user" aria-hidden="true"></i>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-with-icon">
                      <i className="fas fa-envelope" aria-hidden="true"></i>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="form-group">
                    <label htmlFor="subject">Subject</label>
                    <div className="input-with-icon">
                      <i className="fas fa-tag" aria-hidden="true"></i>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="form-group">
                    <label htmlFor="message">Your Message</label>
                    <div className="textarea-wrapper">
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        placeholder="Tell us more about your project or question..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>
                  </div>

                  {/* SECTION TITLE: Contact Actions (50/50 Split) */}
                  <div className="contact-actions">
                    <button
                      type="submit"
                      className={`btn btn-primary submit-btn ${success ? 'submit-success' : ''}`}
                      disabled={loading}
                    >
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : success ? 'fa-check' : 'fa-paper-plane'}`} aria-hidden="true"></i>
                      <span>{loading ? 'Sending...' : success ? 'Message Sent!' : 'Send Message'}</span>
                    </button>

                    <button
                      type="button"
                      className="whatsapp-btn"
                      onClick={handleWhatsAppRedirect}
                      aria-label="Continue this conversation on WhatsApp"
                    >
                      <i className="fab fa-whatsapp" aria-hidden="true"></i>
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <p className="whatsapp-helper">
                    <i className="fab fa-whatsapp" aria-hidden="true"></i>
                    Prefer a quick response? Continue on WhatsApp.
                  </p>
                </form>
              </div>

              {/* SECTION TITLE: Side Panel & Trust Box */}
              <div className="side-panel">
                {/* Side Image Card */}
                <div className="side-image-wrapper glass-card">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80"
                    alt="Diverse professional team ready to provide customer support"
                    loading="lazy"
                  />
                  <div className="side-caption">
                    <h3>Real people. Real support.</h3>
                    <p>Our team is passionate about helping you succeed. No bots, just genuine conversations.</p>
                  </div>
                </div>

                {/* Trust Box */}
                <div className="trust-box glass-card">
                  <div className="trust-item">
                    <i className="fas fa-clock" aria-hidden="true"></i>
                    <div>
                      <strong>Fast Response</strong>
                      <span>Usually within 24 hours</span>
                    </div>
                  </div>

                  <div className="trust-item">
                    <i className="fas fa-shield-alt" aria-hidden="true"></i>
                    <div>
                      <strong>Secure &amp; Private</strong>
                      <span>Your data stays confidential</span>
                    </div>
                  </div>

                  <div className="trust-item">
                    <i className="fas fa-heart" aria-hidden="true"></i>
                    <div>
                      <strong>We Care</strong>
                      <span>Every message is read by a human</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}