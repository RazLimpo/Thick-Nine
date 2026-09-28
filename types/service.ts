// types/service.ts

export interface BackendSeller {
  _id?: string;
  id?: string;
  fullName: string;
  displayName?: string;
  username?: string;
  avatar: string;
  gender?: "male" | "female";
  level: string;
  professionalTitle?: string;
  onlineStatus?: "online" | "away" | "offline" | string;
  isVerified?: boolean;
  planType?: string;
  location?: {
    country?: string;
    city?: string;
  };
  metrics?: {
    responseRate?: number;
    onTimeDelivery?: number;
    orderCompletion?: number;
  };
  memberSince?: string;
}

export interface ServicePackage {
  title?: string;
  desc?: string;
  price?: number | string;
  delivery?: string | number;
  revisions?: string | number;
  features?: string;
}

export interface ServicePackages {
  basic?: ServicePackage;
  standard?: ServicePackage;
  premium?: ServicePackage;
}

export interface ServiceAddon {
  label?: string;
  title?: string; // some payloads use title instead of label
  desc?: string;
  price: number | string;
  enabled?: boolean;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface BackendServiceResponse {
  _id?: string;
  id?: string;
  title: string;
  price: number;
  description?: string;
  category?: string;
  images?: string[];
  deliveryTime?: number;
  views?: number;
  orders?: number;
  featured?: boolean;
  sponsored?: boolean;
  status?: "active" | "paused" | "draft" | string;
  sellerId?: BackendSeller;
  createdAt?: string;
  updatedAt?: string;
}

export interface Service {
  _id?: string;
  id?: string;
  title: string;
  category?: string;
  subCategory?: string;
  price: number | string;
  images?: string[];
  videos?: string[];
  audio?: string[];
  deliveryTime?: number | string;
  rating?: number;
  reviewsCount?: number;
  level?: string;
  isOnline?: boolean;
  isFavorited?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  sellerName?: string;
  sellerAvatar?: string;
  sellerGender?: "male" | "female";
  sellerId?: BackendSeller;
  description?: string;
  tags?: string[];
  attributes?: string[];
  packages?: ServicePackages;
  addons?: ServiceAddon[];
  faqs?: ServiceFaq[];
  requirements?: string[];
  selectedPlan?: string;
  status?: string;
}