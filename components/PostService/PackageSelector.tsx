// components/PostService/PackageSelector.tsx

// ==========================================
// BLOCK 1: IMPORTS & PROPS INTERFACE
// ==========================================
import React from 'react';
import { PackageTier } from '../../types/service.types';

export interface PackageSelectorProps {
  activeTier: PackageTier;
  onSelectTier: (tier: PackageTier) => void;
}


// ==========================================
// BLOCK 2: COMPONENT & TAB RENDER LOGIC
// ==========================================
export const PackageSelector: React.FC<PackageSelectorProps> = ({
  activeTier,
  onSelectTier
}) => {
  const tiers: { key: PackageTier; label: string }[] = [
    { key: 'basic', label: 'Basic' },
    { key: 'standard', label: 'Standard' },
    { key: 'premium', label: 'Premium' }
  ];

  return (
    <div className="package-selector-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
      {tiers.map(tier => (
        <button
          key={tier.key}
          type="button"
          className={`btn ${activeTier === tier.key ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelectTier(tier.key)}
          style={{ flex: 1, textTransform: 'capitalize' }}
        >
          {tier.label} Package
        </button>
      ))}
    </div>
  );
};