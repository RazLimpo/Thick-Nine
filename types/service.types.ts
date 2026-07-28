// types/service.types.ts

// ==========================================
// BLOCK 1: PACKAGE & PLAN TIER DEFINITIONS
// ==========================================

export type PackageTier = 'basic' | 'standard' | 'premium';

export type PlanType = 'free' | 'silver' | 'gold';

export interface PackageData {
  title: string;
  desc: string;
  price: string;
  delivery: string;
  revisions: string;
  features: string;
}

export interface PackagesMap {
  basic: PackageData;
  standard: PackageData;
  premium: PackageData;
}


// ==========================================
// BLOCK 2: ADD-ONS, FAQS & REQUIREMENTS BRIEF
// ==========================================

export interface AddOnItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  isChecked: boolean;
  isCustom?: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface DesignBrief {
  intro: string;
  req1: string;
  req2: string;
  req3: string;
  req4: string;
}


// ==========================================
// BLOCK 3: MEDIA UPLOAD & PLAN LIMITS
// ==========================================

export interface PlanLimitConfig {
  images: number;
  videos: number;
  audio: number;
  label: string;
}

export type PlanLimits = Record<PlanType, PlanLimitConfig>;

export interface UploadedMedia {
  file: File;
  previewUrl: string;
  id: string;
}

export type MediaCategory = 'images' | 'videos' | 'audio';

export interface FileUploadState {
  images: UploadedMedia[];
  videos: UploadedMedia[];
  audio: UploadedMedia[];
}
  
  
  // ==========================================
// BLOCK 4: SERVICE FORM PAYLOAD
// ==========================================

export interface ServiceFormData {
  title: string;
  category: string;
  description: string;
  keywords: string;
  attributes: string[];
  brief: DesignBrief;
  packages: PackagesMap;
  addOns: AddOnItem[];
  faqs: FAQItem[];
  plan: PlanType;
  status: 'available' | 'unavailable';
}