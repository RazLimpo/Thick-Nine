// lib/validation.ts
import { PLAN_LIMITS } from './constants';

export type PlanKey = 'free' | 'silver' | 'gold';
export { PLAN_LIMITS };

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];

/** Absolute ceiling used by multer / Cloudinary path (bytes). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Per-category size limits shown in the post-service UI and enforced client-side.
 * Backend should enforce the same values.
 */
export const MEDIA_SIZE_LIMITS_BYTES = {
  images: 5 * 1024 * 1024, // 5MB
  videos: 50 * 1024 * 1024, // 50MB
  audio: 10 * 1024 * 1024, // 10MB
} as const;

/** Maximum playable duration for staged media (seconds). */
export const MEDIA_DURATION_LIMITS_SEC = {
  videos: 60,
  audio: 30,
} as const;

export const ALLOWED_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'webp'] as const,
  videos: ['mp4', 'webm', 'mov'] as const,
  audio: ['mp3', 'wav', 'ogg'] as const,
};

export function validateMediaFile(
  file: File,
  fileType: 'images' | 'videos' | 'audio'
): ValidationResult {
  // Absolute ceiling (multer / storage)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: 'File size exceeds the 50MB limit.' };
  }

  // Per-type UI limits
  const typeLimit = MEDIA_SIZE_LIMITS_BYTES[fileType];
  if (file.size > typeLimit) {
    const maxMb = typeLimit / (1024 * 1024);
    return {
      isValid: false,
      error: `File size exceeds the ${maxMb}MB ${fileType} limit.`,
    };
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

/**
 * Validates file extension as a secondary check (MIME can be spoofed).
 */
export function validateMediaExtension(
  fileName: string,
  fileType: 'images' | 'videos' | 'audio'
): ValidationResult {
  const ext = fileName.includes('.')
    ? fileName.split('.').pop()!.toLowerCase()
    : '';
  const allowed = ALLOWED_EXTENSIONS[fileType] as readonly string[];
  if (!ext || !allowed.includes(ext)) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed: ${allowed.join(', ').toUpperCase()}.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates media duration against shared limits (seconds).
 */
export function validateMediaDuration(
  durationSec: number,
  fileType: 'videos' | 'audio'
): ValidationResult {
  const max = MEDIA_DURATION_LIMITS_SEC[fileType];
  if (!isFinite(durationSec) || durationSec <= 0) {
    return { isValid: false, error: 'Could not read media duration.' };
  }
  if (durationSec > max) {
    return {
      isValid: false,
      error: `Duration is ${Math.ceil(durationSec)}s — maximum allowed is ${max}s.`,
    };
  }
  return { isValid: true };
}

/**
 * Validates whether adding incoming files exceeds the limit for the selected plan.
 */
export function validateMediaQuantity(
  currentCount: number,
  incomingCount: number,
  fileType: 'images' | 'videos' | 'audio',
  plan: PlanKey
): ValidationResult {
  const max = PLAN_LIMITS[plan][fileType];
  if (currentCount + incomingCount > max) {
    return {
      isValid: false,
      error: `Total ${fileType} cannot exceed ${max} on the ${PLAN_LIMITS[plan].label}.`,
    };
  }
  return { isValid: true };
}

export interface ServiceFormFields {
  title: string;
  category: string;
  description: string;
  price: number | string;
  plan?: PlanKey;
  images?: string[];
}

/**
 * Validates the full form payload before dispatching to the API route.
 */
export function validateServiceForm(fields: ServiceFormFields): ValidationResult {
  if (!fields.title || fields.title.trim().length < 10) {
    return { isValid: false, error: 'Service title must be at least 10 characters long.' };
  }

  if (!fields.category || !fields.category.trim()) {
    return { isValid: false, error: 'Please select or enter a category.' };
  }

  if (!fields.description || fields.description.trim().length < 30) {
    return {
      isValid: false,
      error: 'Please provide a detailed description (at least 30 characters).',
    };
  }

  const numericPrice =
    typeof fields.price === 'string' ? parseFloat(fields.price) : fields.price;
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return { isValid: false, error: 'Please enter a valid price greater than $0.' };
  }

  return { isValid: true };
}
