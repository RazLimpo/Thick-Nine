//components/PostService/MediaUploader.tsx

// ==========================================
// BLOCK 1: IMPORTS & PROPS INTERFACE
// ==========================================
import React from 'react';
import { UploadedMedia, PlanType, MediaCategory } from '../../types/service.types';
import { PLAN_LIMITS } from '../../lib/constants';

export interface MediaUploaderProps {
  category: MediaCategory;
  title: string;
  accept: string;
  items: UploadedMedia[];
  plan: PlanType;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
}


// ==========================================
// BLOCK 2: COMPONENT & MEDIA GRID RENDER LOGIC
// ==========================================
export const MediaUploader: React.FC<MediaUploaderProps> = ({
  category,
  title,
  accept,
  items,
  plan,
  onAddFiles,
  onRemoveFile
}) => {
  const limit = PLAN_LIMITS[plan][category];
  const isLimitReached = items.length >= limit;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="media-uploader-block" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontWeight: 600 }}>
          {title} <span className="small">({items.length}/{limit})</span>
        </label>
        <span className="small" style={{ fontSize: '0.8rem' }}>
          {PLAN_LIMITS[plan].label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              position: 'relative',
              width: '100px',
              height: '100px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}
          >
            {category === 'images' && (
              <img
                src={item.previewUrl}
                alt="Upload preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {category === 'videos' && (
              <video
                src={item.previewUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {category === 'audio' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                <i className="fa-solid fa-music" style={{ fontSize: '24px' }}></i>
              </div>
            )}
            <button
              type="button"
              className="btn-danger"
              onClick={() => onRemoveFile(item.id)}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                padding: '2px 6px',
                borderRadius: '50%',
                fontSize: '0.75rem',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        ))}

        {!isLimitReached && (
          <label
            style={{
              width: '100px',
              height: '100px',
              border: '2px dashed #ccc',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '20px', marginBottom: '4px' }}></i>
            <span style={{ fontSize: '0.75rem' }}>Upload</span>
            <input
              type="file"
              accept={accept}
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
    </div>
  );
};