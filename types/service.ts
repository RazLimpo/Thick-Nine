export interface Service {
    _id: string;
  
    title: string;
    seller: string;
    location: string;
  
    price: string;
    rating: string;
    delivery: string;
    level: string;
  
    category: string;
  
    avatar: string;
    images: string[];
  
    description?: string;
  
    isOnline?: boolean;
    isSponsored?: boolean;
    isFeatured?: boolean;
  }