// components/PostService/BriefBuilder.tsx
import React from 'react';
import { DesignBrief } from '../../types/service.types';

interface BriefBuilderProps {
  brief: DesignBrief;
  onChange: (field: keyof DesignBrief, value: string) => void;
}

export const BriefBuilder: React.FC<BriefBuilderProps> = ({ brief, onChange }) => {
  return (
    <div className="brief-builder-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          Welcome Intro / Instructions
        </label>
        <textarea
          rows={2}
          value={brief.intro}
          placeholder="Tell buyers what you need to get started..."
          onChange={e => onChange('intro', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Requirement 1</label>
          <input
            type="text"
            value={brief.req1}
            placeholder="e.g., Brand Guidelines / Assets"
            onChange={e => onChange('req1', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Requirement 2</label>
          <input
            type="text"
            value={brief.req2}
            placeholder="e.g., Target Audience & Competitors"
            onChange={e => onChange('req2', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Requirement 3 (Optional)</label>
          <input
            type="text"
            value={brief.req3}
            placeholder="e.g., Specific color preferences"
            onChange={e => onChange('req3', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Requirement 4 (Optional)</label>
          <input
            type="text"
            value={brief.req4}
            placeholder="e.g., Credentials / Links"
            onChange={e => onChange('req4', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>
    </div>
  );
};