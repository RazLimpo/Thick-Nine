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
    return { isValid: false, error: 'Please provide a detailed description (at least 30 characters).' };
  }

  const numericPrice = typeof fields.price === 'string' ? parseFloat(fields.price) : fields.price;
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return { isValid: false, error: 'Please enter a valid price greater than $0.' };
  }

  return { isValid: true };
}