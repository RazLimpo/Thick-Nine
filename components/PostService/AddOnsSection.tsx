//components/PostService/AddOnsSection.tsx


// ==========================================
// BLOCK 1: IMPORTS & PROPS INTERFACE
// ==========================================
import React, { useState } from 'react';
import { AddOnItem } from '../../types/service.types';

export interface AddOnsSectionProps {
  addOns: AddOnItem[];
  onToggleAddOn: (id: string) => void;
  onAddAddOn: (newItem: AddOnItem) => void;
  onRemoveAddOn: (id: string) => void;
}


// ==========================================
// BLOCK 2: COMPONENT & ADD-ON RENDER LOGIC
// ==========================================
export const AddOnsSection: React.FC<AddOnsSectionProps> = ({
  addOns,
  onToggleAddOn,
  onAddAddOn,
  onRemoveAddOn
}) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !price) return;

    onAddAddOn({
      id: `addon-${Date.now()}`,
      title: title.trim(),
      price: parseFloat(price) || 0,
      isChecked: true,
      isCustom: true
    });

    setTitle('');
    setPrice('');
  };

  return (
    <div className="add-ons-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {addOns.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => onToggleAddOn(item.id)}
              />
              <span style={{ textDecoration: item.isChecked ? 'none' : 'line-through', color: item.isChecked ? '#000' : '#888' }}>
                {item.title} (+${item.price.toFixed(2)})
              </span>
            </label>

            {item.isCustom && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => onRemoveAddOn(item.id)}
                style={{ padding: '2px 8px', fontSize: '0.8rem' }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
        <input
          type="text"
          value={title}
          placeholder="Custom Add-on title"
          onChange={e => setTitle(e.target.value)}
          style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="number"
          min="1"
          value={price}
          placeholder="Price ($)"
          onChange={e => setPrice(e.target.value)}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          Add Extra
        </button>
      </form>
    </div>
  );
};