// lib/validation.ts

export interface ValidationResult {
    isValid: boolean;
    error?: string;
  }
  
  export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
  
  export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit
  
  export function validateMediaFile(file: File, fileType: 'images' | 'videos' | 'audio'): ValidationResult {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { isValid: false, error: 'File size exceeds the 50MB limit.' };
    }
  
    if (fileType === 'images' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Invalid image format. Allowed: JPG, PNG, WEBP.' };
    }
  
    if (fileType === 'videos' && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Invalid video format. Allowed: MP4, WEBM, MOV.' };
    }
  
    if (fileType === 'audio' && !ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Invalid audio format. Allowed: MP3, WAV, OGG.' };
    }
  
    return { isValid: true };
  }