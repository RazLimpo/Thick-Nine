// hooks/useFileUpload.ts
import { useState, useCallback } from 'react';
import { PlanType, FileUploadState, UploadedMedia } from '../types/service.types';
import { PLAN_LIMITS } from '../lib/constants';
import { validateMediaFile } from '../lib/validation';
import { useToast } from './useToast';

export function useFileUpload(currentPlan: PlanType = 'free') {
  const { showToast } = useToast();
  const [media, setMedia] = useState<FileUploadState>({
    images: [],
    videos: [],
    audio: []
  });

  const addFiles = useCallback((fileList: FileList | File[], category: keyof FileUploadState) => {
    const filesArray = Array.from(fileList);
    const limit = PLAN_LIMITS[currentPlan][category];
    const currentCount = media[category].length;

    if (currentCount + filesArray.length > limit) {
      showToast(`The ${PLAN_LIMITS[currentPlan].label} allows up to ${limit} ${category}.`, 'removed');
      return;
    }

    const newMediaItems: UploadedMedia[] = [];

    for (const file of filesArray) {
      const validation = validateMediaFile(file, category);
      if (!validation.isValid) {
        showToast(validation.error || 'Invalid file', 'removed');
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newMediaItems.push({
        file,
        previewUrl,
        id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }

    if (newMediaItems.length > 0) {
      setMedia(prev => ({
        ...prev,
        [category]: [...prev[category], ...newMediaItems]
      }));
      showToast(`Added ${newMediaItems.length} file(s) to ${category}.`, 'success');
    }
  }, [currentPlan, media, showToast]);

  const removeFile = useCallback((category: keyof FileUploadState, id: string) => {
    setMedia(prev => {
      const target = prev[category].find(item => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return {
        ...prev,
        [category]: prev[category].filter(item => item.id !== id)
      };
    });
    showToast('File removed', 'removed');
  }, [showToast]);

  return {
    media,
    addFiles,
    removeFile,
    setMedia
  };
}