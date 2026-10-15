File: "thick-nine-backend/middleware/upload.js"

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

// Keep resource types consistent with the existing upload configuration.
function getResourceType(fieldname) {
  if (fieldname === "images") return "image";
  if (fieldname === "videos" || fieldname === "audio") {
    return "video";
  }

  return null;
}

function logCloudinaryEvent(level, message, details = {}) {
  const logger = console[level] || console.log;
  logger(message, {
    fieldName: details.fieldName || "unknown",
    publicId: details.publicId || "unknown",
    resourceType: details.resourceType || "unknown",
    cloudinaryResult: details.cloudinaryResult || "unknown",
  });
}

// Remove only files uploaded during the current request.
// Never guess a public ID when Cloudinary's ID is unavailable.
async function cleanupUploadedMedia(req) {
  if (req._cloudinaryCleanupPromise) {
    return req._cloudinaryCleanupPromise;
  }

  const uploadedFiles = [];
  const seenFiles = new Set();

  const addFile = (file, fieldname) => {
    if (!file || typeof file !== "object" || seenFiles.has(file)) {
      return;
    }

    seenFiles.add(file);
    uploadedFiles.push({ file, fieldname });
  };

  const filesByField = req.files;

  if (Array.isArray(filesByField)) {
    filesByField.forEach((file) => addFile(file, file.fieldname));
  } else if (filesByField && typeof filesByField === "object") {
    Object.entries(filesByField).forEach(([fieldname, files]) => {
      if (Array.isArray(files)) {
        files.forEach((file) => addFile(file, file.fieldname || fieldname));
      } else {
        addFile(files, files.fieldname || fieldname);
      }
    });
  }

  ["file", "uploadedFile", "cloudinaryFile"].forEach((property) => {
    const file = req[property];

    if (Array.isArray(file)) {
      file.forEach((item) => addFile(item, item.fieldname));
    } else {
      addFile(file, file?.fieldname);
    }
  });

  req._cloudinaryCleanupPromise = (async () => {
    const results = await Promise.allSettled(
      uploadedFiles.map(async ({ file, fieldname }) => {
        const publicId =
          file.filename ||
          file.public_id ||
          file.publicId ||
          file.cloudinary?.public_id ||
          file.cloudinary?.publicId;
        const resourceType =
          file.resource_type ||
          file.resourceType ||
          file.cloudinary?.resource_type ||
          getResourceType(fieldname);

        // Fail safely instead of deleting an uncertain Cloudinary asset.
        if (!publicId || !resourceType) {
          logCloudinaryEvent("warn", "Cloudinary cleanup skipped", {
            fieldName: fieldname,
            publicId,
            resourceType,
            cloudinaryResult: "skipped",
          });
          return;
        }

        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true,
        });

        logCloudinaryEvent("info", "Cloudinary cleanup completed", {
          fieldName: fieldname,
          publicId,
          resourceType,
          cloudinaryResult: result.result,
        });

        if (result.result !== "ok" && result.result !== "not found") {
          throw new Error(
            `Cloudinary cleanup returned: ${result.result}`
          );
        }
      })
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        logCloudinaryEvent("error", "Cloudinary upload cleanup failed", {
          cloudinaryResult: "error",
        });
      }
    });
  })();

  return req._cloudinaryCleanupPromise;
}

// Configure Cloudinary storage.
const storage = new CloudinaryStorage({
  cloudinary,
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
      resource_type = "video";
    }

    return {
      folder,
      resource_type,
      public_id: `${Date.now()}-${file.originalname.replace(
        /\.[^/.]+$/,
        ""
      )}`,
    };
  },
});

// Keep the current upload limits.
const multerUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 5 },
  { name: "audio", maxCount: 5 },
]);

// Wrap Multer so partially completed uploads are cleaned up on upload errors.
function uploadMedia(req, res, next) {
  multerUpload(req, res, async (err) => {
    if (err) {
      await cleanupUploadedMedia(req);
      return next(err);
    }

    // Clean up new uploads if a later route handler returns an HTTP error.
    res.once("finish", () => {
      if (res.statusCode >= 400) {
        cleanupUploadedMedia(req).catch(() => {
          logCloudinaryEvent("error", "Cloudinary cleanup failed", {
            cloudinaryResult: "error",
          });
        });
      }
    });

    return next();
  });
}

// Export helpers so service routes can explicitly clean up on failures.
uploadMedia.cleanupUploadedMedia = cleanupUploadedMedia;

module.exports = uploadMedia;