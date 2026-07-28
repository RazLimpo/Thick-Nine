// components/PostService/PostService.tsx

// ==========================================
// BLOCK 1: IMPORTS, HOOKS & COMPONENT SETUP
// ==========================================
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceFormData, AddOnItem, FAQItem, DesignBrief } from '../../types/service.types';
import { API_BASE_URL, DEFAULT_DESIGN_BRIEF } from '../../lib/constants';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePackageData } from '../../hooks/usePackageData';
import { useToast } from '../../hooks/useToast';
import { validateServiceForm } from '../../lib/validation';
import {
  PackageSelector,
  MediaUploader,
  PackageDetails,
  EarningsCalculator,
  BriefBuilder,
  AddOnsSection,
  FAQSection,
  PreviewPanel
} from './index';

export function PostService() {
  const router = useRouter();
  const { showToast } = useToast();
  const [plan, setPlan] = useState<'free' | 'silver' | 'gold'>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Hooks
  const { media, addFiles, removeFile } = useFileUpload(plan);
  const { activeTier, setActiveTier, packages, currentPackage, updatePackageField } = usePackageData();

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [brief, setBrief] = useState<DesignBrief>(DEFAULT_DESIGN_BRIEF);

  const [addOns, setAddOns] = useState<AddOnItem[]>([
    { id: 'extra-fast', title: 'Extra Fast Delivery', price: 15, isChecked: false }
  ]);

  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // ==========================================
  // BLOCK 2: SECTION HANDLERS & SUBMIT LOGIC
  // ==========================================

  // Brief Handlers
  const handleBriefChange = (field: keyof DesignBrief, value: string) => {
    setBrief(prev => ({ ...prev, [field]: value }));
  };

  // Add-on Handlers
  const handleToggleAddOn = (id: string) => {
    setAddOns(prev =>
      prev.map(item => (item.id === id ? { ...item, isChecked: !item.isChecked } : item))
    );
  };

  const handleAddAddOn = (newItem: AddOnItem) => {
    setAddOns(prev => [...prev, newItem]);
    showToast('Extra add-on added', 'success');
  };

  const handleRemoveAddOn = (id: string) => {
    setAddOns(prev => prev.filter(item => item.id !== id));
    showToast('Add-on removed', 'removed');
  };

  // FAQ Handlers
  const handleAddFAQ = (newFaq: FAQItem) => {
    setFaqs(prev => [...prev, newFaq]);
    showToast('FAQ added', 'success');
  };

  const handleRemoveFAQ = (id: string) => {
    setFaqs(prev => prev.filter(item => item.id !== id));
    showToast('FAQ removed', 'removed');
  };

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Unified validation using lib/validation.ts
    const validation = validateServiceForm({
      title,
      category,
      description,
      price: currentPackage.price
    });

    if (!validation.isValid) {
      showToast(validation.error || 'Validation failed.', 'removed');
      return;
    }

    const priceValue = parseFloat(currentPackage.price);
    setIsSubmitting(true);

    // Extract raw image URLs from upload state
    const imageUrls = media.images.map(img => img.url).filter(Boolean);

    // Formulate payload matching your backend expectations
    const payload = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: priceValue,
      images: imageUrls,
      keywords,
      plan,
      packages,
      brief,
      addOns: addOns.filter(item => item.isChecked),
      faqs,
      status: 'available'
    };

    try {
      // Get authentication token from storage if available
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('token') || localStorage.getItem('authToken') 
        : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/services`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Failed to create service listing');
      }

      showToast('Service listing created successfully!', 'success');

      // Redirect after a short pause
      setTimeout(() => {
        router.push('/services');
      }, 1200);

    } catch (err: any) {
      showToast(err.message || 'Error saving service listing.', 'removed');
    } finally {
      setIsSubmitting(false);
    }
  };
    
    
  // ==========================================
  // BLOCK 3: JSX FORM LAYOUT & SIDEBAR PREVIEW
  // ==========================================
  return (
    <div className="post-service-container">
      <form onSubmit={handleSubmit} className="post-service-form">
        
        {/* Tier Plan Selector */}
        <div className="form-card">
          <label className="form-label">Select Membership Plan</label>
          <div className="plan-button-group">
            {(['free', 'silver', 'gold'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`btn ${plan === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlan(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Details */}
        <div className="form-card">
          <h3 className="section-title">Service Overview</h3>
          <div className="form-group-stack">
            <div>
              <label className="form-label">Service Title</label>
              <input
                type="text"
                value={title}
                placeholder="I will build a high-performing web application..."
                onChange={e => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-grid-2col">
              <div>
                <label className="form-label">Category</label>
                <input
                  type="text"
                  value={category}
                  placeholder="e.g. Web Development"
                  onChange={e => setCategory(e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Search Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  placeholder="react, nextjs, typescript"
                  onChange={e => setKeywords(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Description</label>
              <textarea
                rows={4}
                value={description}
                placeholder="Describe your service offering in detail..."
                onChange={e => setDescription(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Media Uploads */}
        <div className="form-card">
          <h3 className="section-title">Media Gallery</h3>
          <MediaUploader
            category="images"
            title="Images"
            accept="image/*"
            items={media.images}
            plan={plan}
            onAddFiles={files => addFiles(files, 'images')}
            onRemoveFile={id => removeFile('images', id)}
          />
          <MediaUploader
            category="videos"
            title="Videos"
            accept="video/*"
            items={media.videos}
            plan={plan}
            onAddFiles={files => addFiles(files, 'videos')}
            onRemoveFile={id => removeFile('videos', id)}
          />
          <MediaUploader
            category="audio"
            title="Audio Samples"
            accept="audio/*"
            items={media.audio}
            plan={plan}
            onAddFiles={files => addFiles(files, 'audio')}
            onRemoveFile={id => removeFile('audio', id)}
          />
        </div>

        {/* Packages Configuration */}
        <div className="form-card">
          <h3 className="section-title">Packages & Pricing</h3>
          <PackageSelector activeTier={activeTier} onSelectTier={setActiveTier} />
          <PackageDetails
            tier={activeTier}
            packageData={currentPackage}
            onFieldChange={updatePackageField}
          />
          <EarningsCalculator rawPrice={currentPackage.price} />
        </div>

        {/* Requirements / Brief Builder */}
        <div className="form-card">
          <h3 className="section-title">Buyer Requirements Brief</h3>
          <BriefBuilder brief={brief} onChange={handleBriefChange} />
        </div>

        {/* Extra Add-Ons */}
        <div className="form-card">
          <h3 className="section-title">Service Extras & Add-Ons</h3>
          <AddOnsSection
            addOns={addOns}
            onToggleAddOn={handleToggleAddOn}
            onAddAddOn={handleAddAddOn}
            onRemoveAddOn={handleRemoveAddOn}
          />
        </div>

        {/* Frequently Asked Questions */}
        <div className="form-card">
          <h3 className="section-title">Frequently Asked Questions</h3>
          <FAQSection faqs={faqs} onAddFAQ={handleAddFAQ} onRemoveFAQ={handleRemoveFAQ} />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-large submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Publishing Service...' : 'Publish Service Listing'}
        </button>
      </form>

      {/* Dynamic Live Preview Sidebar */}
      <div className="preview-sidebar-wrapper">
        <PreviewPanel
          formData={{
            title,
            category,
            description,
            keywords,
            attributes: [],
            brief,
            packages,
            addOns,
            faqs,
            plan,
            status: 'available'
          }}
          activeTier={activeTier}
          media={media.images}
        />
      </div>
    </div>
  );
}