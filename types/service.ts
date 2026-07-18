// types/service.ts

/**
 * Represents the populated Seller object coming from the MongoDB backend query
 */
export interface BackendSeller {
  _id: string;
  fullName: string;
  avatar: string;
  level: string;
  professionalTitle: string;
  onlineStatus: 'online' | 'away' | 'offline';
  isVerified: boolean;
  location: {
    country: string;
    city: string;
  };
  metrics: {
    responseRate: number;
    onTimeDelivery: number;
    orderCompletion: number;
  };
  memberSince: string;
}

/**
 * Represents the raw Service document schema as received from the backend API
 */
export interface BackendServiceResponse {
  _id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  images: string[];
  deliveryTime: number;
  views: number;
  orders: number;
  featured: boolean;
  sponsored: boolean;
  status: 'active' | 'paused' | 'draft';
  sellerId: BackendSeller; // Populated seller record object
  createdAt: string;
  updatedAt: string;
}

/**
 * The clean, unified frontend Service interface consumed by ServiceCard and ServiceGrid
 */
export interface Service {
  id: string;
  title: string;
  category: string;
  price: number;
  images: string[];
  deliveryTime: number;
  featured: boolean;
  sponsored: boolean;
  
  // Flattened seller fields for easy component binding
  seller: string;
  avatar: string;
  location: string;
  rating: number; 
  level: string;
  isOnline: boolean;
  
  // Optional detailed fields for full detail layouts
  description?: string;
}