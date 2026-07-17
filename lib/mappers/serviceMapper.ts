import { Service } from "@/types/service";

export function mapService(service: any): Service {
  return {
    _id: service._id,

    title: service.title,

    seller:
      service.sellerId?.fullName ||
      service.seller ||
      "Unknown Seller",

    location: service.location || "Remote",

    price: service.price
      ? `$${service.price}`
      : "$0",

    rating: service.rating || "5.0",

    delivery: service.delivery || "3 Days",

    level: service.level || "Top Rated",

    category: service.category || "General",

    avatar:
      service.sellerId?.avatar ||
      service.avatar ||
      "/images/default-avatar.png",

    images:
      service.images?.length
        ? service.images
        : ["/images/placeholder.jpg"],

    description: service.description,

    isOnline: true,

    isSponsored: false,

    isFeatured: false,
  };
}