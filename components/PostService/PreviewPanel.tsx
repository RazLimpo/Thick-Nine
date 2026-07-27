// components/PostService/PreviewPanel.tsx
import React from 'react';
import { PackageTier, ServiceFormData, UploadedMedia } from '../../types/service.types';

interface PreviewPanelProps {
  formData: ServiceFormData;
  activeTier: PackageTier;
  media: UploadedMedia[];
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ formData, activeTier, media }) => {
  const currentPkg = formData.packages[activeTier];
  const selectedAddOns = formData.addOns.filter(a => a.isChecked);
  const basePrice = parseFloat(currentPkg.price) || 0;
  const addOnsTotal = selectedAddOns.reduce((sum, item) => sum + item.price, 0);
  const grandTotal = basePrice + addOnsTotal;

  return (
    <div
      className="preview-card"
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: '80px'
      }}
    >
      <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '12px' }}>
        Listing Preview
      </h3>

      <div
        style={{
          width: '100%',
          height: '160px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}
      >
        {media.length > 0 ? (
          <img src={media[0].previewUrl} alt="Service Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No Cover Image Uploaded</span>
        )}
      </div>

      <h4 style={{ fontSize: '1.05rem', margin: '0 0 6px 0' }}>
        {formData.title || 'Your Service Title Here'}
      </h4>

      <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px 0' }}>
        Category: <strong>{formData.category || 'Unassigned'}</strong>
      </p>

      <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, textTransform: 'capitalize' }}>
          <span>{activeTier} Tier</span>
          <span>${basePrice.toFixed(2)}</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#475569', margin: '4px 0 0 0' }}>
          {currentPkg.desc || 'Package description preview...'}
        </p>
      </div>

      {selectedAddOns.length > 0 && (
        <div style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Selected Extras:</strong>
          {selectedAddOns.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>{item.title}</span>
              <span>+${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          borderTop: '1px dashed #cbd5e1',
          paddingTop: '10px',
          marginTop: '10px'
        }}
      >
        <span>Estimated Total:</span>
        <strong style={{ fontSize: '1.2rem', color: '#d96464' }}>${grandTotal.toFixed(2)}</strong>
      </div>
    </div>
  );
};