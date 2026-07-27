// components/PostService/PostService.tsx
'use client';

import React, { useState } from 'react';
import { ServiceFormData, AddOnItem, FAQItem, DesignBrief } from '../../types/service.types';
import { API_BASE_URL, DEFAULT_DESIGN_BRIEF } from '../../lib/constants';
import { useFileUpload } from '../../hooks/useFileUpload';
import { usePackageData } from '../../hooks/usePackageData';
import { useToast } from '../../hooks/useToast';
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

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter a service title.', 'removed');
      return;
    }

    if (!currentPackage.price) {
      showToast('Please specify pricing for the selected package.', 'removed');
      return;
    }

    setIsSubmitting(true);

    const formDataPayload: ServiceFormData = {
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
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to create service listing');
      }

      showToast('Service created successfully!', 'success');
    } catch (err) {
      showToast('Error saving service listing.', 'removed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Tier Plan Selector */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select Membership Plan</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['free', 'silver', 'gold'] as const).map(p => (
              <button
                key={p}
                type="button"
                className={`btn ${plan === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPlan(p)}
                style={{ flex: 1, textTransform: 'capitalize' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Basic Details */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Service Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Service Title</label>
              <input
                type="text"
                value={title}
                placeholder="I will build a high-performing web application..."
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Category</label>
                <input
                  type="text"
                  value={category}
                  placeholder="e.g. Web Development"
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Search Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  placeholder="react, nextjs, typescript"
                  onChange={e => setKeywords(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Description</label>
              <textarea
                rows={4}
                value={description}
                placeholder="Describe your service offering in detail..."
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          </div>
        </div>

        {/* Media Uploads */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Media Gallery</h3>
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
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Packages & Pricing</h3>
          <PackageSelector activeTier={activeTier} onSelectTier={setActiveTier} />
          <PackageDetails
            tier={activeTier}
            packageData={currentPackage}
            onFieldChange={updatePackageField}
          />
          <EarningsCalculator rawPrice={currentPackage.price} />
        </div>

        {/* Requirements / Brief Builder */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Buyer Requirements Brief</h3>
          <BriefBuilder brief={brief} onChange={handleBriefChange} />
        </div>

        {/* Extra Add-Ons */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Service Extras & Add-Ons</h3>
          <AddOnsSection
            addOns={addOns}
            onToggleAddOn={handleToggleAddOn}
            onAddAddOn={handleAddAddOn}
            onRemoveAddOn={handleRemoveAddOn}
          />
        </div>

        {/* Frequently Asked Questions */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '16px' }}>Frequently Asked Questions</h3>
          <FAQSection faqs={faqs} onAddFAQ={handleAddFAQ} onRemoveFAQ={handleRemoveFAQ} />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-large"
          disabled={isSubmitting}
          style={{ width: '100%', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Publishing Service...' : 'Publish Service Listing'}
        </button>
      </form>

      {/* Dynamic Live Preview Sidebar */}
      <div>
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