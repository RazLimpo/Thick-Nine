// components/PostService/PackageDetails.tsx
import React from 'react';
import { PackageTier, PackageData } from '../../types/service.types';

interface PackageDetailsProps {
  tier: PackageTier;
  packageData: PackageData;
  onFieldChange: (tier: PackageTier, field: keyof PackageData, value: string) => void;
}

export const PackageDetails: React.FC<PackageDetailsProps> = ({
  tier,
  packageData,
  onFieldChange
}) => {
  return (
    <div className="package-details-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          {tier.toUpperCase()} Package Title
        </label>
        <input
          type="text"
          value={packageData.title}
          placeholder="e.g., Basic Responsive Design"
          onChange={e => onFieldChange(tier, 'title', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Description</label>
        <textarea
          rows={3}
          value={packageData.desc}
          placeholder="Summarize what is included in this tier..."
          onChange={e => onFieldChange(tier, 'desc', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Price ($)</label>
          <input
            type="number"
            min="5"
            value={packageData.price}
            placeholder="25"
            onChange={e => onFieldChange(tier, 'price', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Delivery Time</label>
          <select
            value={packageData.delivery}
            onChange={e => onFieldChange(tier, 'delivery', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="1 Day">1 Day</option>
            <option value="2 Days">2 Days</option>
            <option value="3 Days">3 Days</option>
            <option value="5 Days">5 Days</option>
            <option value="7 Days">7 Days</option>
            <option value="14 Days">14 Days</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Revisions</label>
          <select
            value={packageData.revisions}
            onChange={e => onFieldChange(tier, 'revisions', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="1 Revision">1 Revision</option>
            <option value="2 Revisions">2 Revisions</option>
            <option value="3 Revisions">3 Revisions</option>
            <option value="Unlimited Revisions">Unlimited</option>
          </select>
        </div>
      </div>
    </div>
  );
};