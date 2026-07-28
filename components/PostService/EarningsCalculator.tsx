//components/PostService/EarningsCalculator.tsx

// ==========================================
// BLOCK 1: IMPORTS & PROPS INTERFACE
// ==========================================
import React from 'react';
import { calculateEarnings } from '../../lib/earnings';
import { MARKETPLACE_FEE_PERCENTAGE } from '../../lib/constants';

export interface EarningsCalculatorProps {
  rawPrice: string | number;
}


// ==========================================
// BLOCK 2: COMPONENT & EARNINGS RENDER LOGIC
// ==========================================
export const EarningsCalculator: React.FC<EarningsCalculatorProps> = ({ rawPrice }) => {
  const { grossPrice, feeAmount, netEarnings } = calculateEarnings(rawPrice);
  const feePercentText = `${(MARKETPLACE_FEE_PERCENTAGE * 100).toFixed(0)}%`;

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: '#eef6ff',
        borderRadius: '6px',
        border: '1px solid #b6d4fe',
        fontSize: '0.9rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span>Package Price:</span>
        <strong>${grossPrice.toFixed(2)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#666' }}>
        <span>Marketplace Fee ({feePercentText}):</span>
        <span>-${feeAmount.toFixed(2)}</span>
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700 }}>
        <span>Estimated Take-Home:</span>
        <span>${netEarnings.toFixed(2)}</span>
      </div>
    </div>
  );
};