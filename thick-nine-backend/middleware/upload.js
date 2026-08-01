// thick-nine-backend/middleware/upload.js
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "services/misc";
    let resource_type = "auto"; 

    if (file.fieldname === "images") {
      folder = "services/images";
      resource_type = "image";
    } else if (file.fieldname === "videos") {
      folder = "services/videos";
      resource_type = "video";
    } else if (file.fieldname === "audio") {
      folder = "services/audio";
      // 💡 CRITICAL: Cloudinary handles audio files under the "video" resource type
      resource_type = "video"; 
    }

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`,
    };
  },
});

// Define field expectations (matching Next.js FormData)
const uploadMedia = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max limit
}).fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 5 },
  { name: "audio", maxCount: 5 },
]);

module.exports = uploadMedia;