//server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const auth = require('./middleware/auth');
require('dotenv').config(); // Hydrates backend parameters safely from the environment

// Optional Infrastructure Middleware (Failsafe standard wrappers)
let helmet, morgan;
try { helmet = require('helmet'); } catch (_) {}
try { morgan = require('morgan'); } catch (_) {}

// ====================== DATABASE MODELS & SUB-ROUTERS ======================
const Service = require('./models/Service'); 
const User = require('./models/User'); 
const authRoutes = require('./routes/authRoutes');
const affiliateLinksRouter = require('./routes/affiliateLinks');
const affiliateStoreRouter = require('./routes/affiliateStore');
const uploadMedia = require('./middleware/upload'); 

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== CENTRALIZED PROJECTION STRINGS ======================
// Guarantees all populated seller objects return avatar/profilePicture, displayName, and username for Next.js routes
const SELLER_POPULATE_FIELDS = "fullName displayName username avatar profilePicture level professionalTitle onlineStatus isVerified location metrics memberSince";

// ====================== SECURITY & LOGGING MIDDLEWARE ======================
if (helmet) app.use(helmet());
if (morgan) app.use(morgan('dev'));

// ====================== HARDENED PRODUCTION CORS MATRIX ======================
const allowedOriginsRegExp = [
  /^http:\/\/localhost(:\d+)?$/,                               // Local Dev Environment Ports
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,                    // Automated Vercel Deploy Previews
  /^https:\/\/[a-zA-Z0-9-]+\.webcontainer\.io$/,               // StackBlitz Dev Containers
  /^https:\/\/[a-zA-Z0-9-]+--\d+--[a-zA-Z0-9-]+\.local-credentialless\.webcontainer\.io$/, // Dynamic credentialless previews
  /^https:\/\/[a-zA-Z0-9-]+\.stackblitz\.io$/,                 // StackBlitz Sandboxes
  /^https:\/\/[a-zA-Z0-9-]+\.[a-z-]+\.staticblitz\.com$/,     // Matches StackBlitz Static Previews
  /^https:\/\/osindoworks\.com$/                               // Production Domain
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOriginsRegExp.some(regex => regex.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS Violation: Access denied from unauthorized platform domains.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// ====================== ADAPTIVE DATABASE CONNECTION POOL ======================
console.log("Validating Database Configuration Environment:");
console.log(process.env.MONGODB_URI ? "  ↳ MONGODB_URI: ✅ Environment String Active" : "  ↳ MONGODB_URI: ❌ Missing Critical Parameter");

const connectionOptions = {
  dbName: process.env.DB_NAME || 'freelancingDB', 
  serverSelectionTimeoutMS: 5000, 
  socketTimeoutMS: 45000,         
};

// Unified sandbox detection (Triggers locally/StackBlitz, bypasses on Render)
const skipDatabase = 
  process.env.SKIP_DB === 'true' || 
  process.env.STACKBLITZ === 'true' || 
  (process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI) ||
  !process.env.MONGODB_URI;

if (skipDatabase) {
  console.log('\x1b[33m⚠️  StackBlitz sandbox mode active: Cloud TCP connection bypassed. Serving memory layer mock hooks.\x1b[0m');
} else {
  mongoose.connect(process.env.MONGODB_URI, connectionOptions)
    .then(() => {
      console.log(`\x1b[32m✅ Database Pipeline Synced: Sourced collection pool targeting "${connectionOptions.dbName}"\x1b[0m`);
    })
    .catch((err) => {
      console.error('\x1b[31m❌ MongoDB Cluster Critical Connection Failure:\x1b[0m', err.message);
      process.exit(1); 
    });
}

// ====================== REST ROUTE SUB-ROUTERS ======================
app.use('/api/auth', authRoutes); 
app.use('/api/affiliate/links', affiliateLinksRouter);
app.use('/api/affiliate/store', affiliateStoreRouter);

app.get('/', (req, res) => {
  res.send(`OsinoWorks Engine Server API is Live, Secured, and Running smoothly.`);
});

// ====================== SERVICE MARKETPLACE LOGIC ENDPOINTS ======================

// 0. Dynamic Location Aggregator for Filters
app.get('/api/services/locations', async (req, res) => {
  if (skipDatabase) {
    return res.json({
      locations: [
        { label: "Lagos, Nigeria", value: "Lagos, Nigeria" },
        { label: "Toronto, Canada", value: "Toronto, Canada" }
      ]
    });
  }

  try {
    const activeSellerIds = await Service.distinct("sellerId", { status: "active" });

    const users = await User.find(
      { _id: { $in: activeSellerIds } },
      "location"
    ).lean();

    const uniqueLocations = new Set();

    users.forEach((user) => {
      if (!user?.location) return;

      const city = user.location.city?.trim() || "";
      const country = user.location.country?.trim() || "";

      let locationStr = "";
      if (city && country) {
        locationStr = `${city}, ${country}`;
      } else if (city || country) {
        locationStr = city || country;
      }

      if (locationStr) {
        uniqueLocations.add(locationStr);
      }
    });

    const locations = Array.from(uniqueLocations)
      .sort((a, b) => a.localeCompare(b))
      .map((loc) => ({ label: loc, value: loc }));

    res.json({ locations });
  } catch (err) {
    console.error("Error fetching filter locations:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch filter locations", 
      error: err.message 
    });
  }
});

// 1. Dynamic Service Read Aggregator
app.get('/api/services', async (req, res) => {
  if (skipDatabase) {
    return res.json([
      {
        _id: "mock-srv-001",
        title: "Full-Stack MERN Application Development",
        price: 250,
        description: "Custom full-stack web applications built with Next.js, Express, and modern styling architectures.",
        category: "Programming & Tech",
        status: "active",
        images: [],
        createdAt: new Date(),
        sellerId: {
          _id: "mock-usr-001",
          fullName: "Alex Rivera",
          displayName: "Alex Rivera",
          username: "arivera",
          avatar: "",
          profilePicture: "",
          level: "Level 2 Seller",
          professionalTitle: "Full Stack Engineer",
          onlineStatus: "online",
          isVerified: true,
          location: { city: "Lagos", country: "Nigeria" },
          metrics: { responseRate: 98, onTimeDelivery: 100, orderCompletion: 95 },
          memberSince: "2024-01-15"
        }
      },
      {
        _id: "mock-srv-002",
        title: "High-Converting SEO & Content Marketing Campaign",
        price: 120,
        description: "On-page optimization strategies and fully organic outreach frameworks.",
        category: "SEO",
        status: "active",
        images: [],
        createdAt: new Date(Date.now() - 86400000),
        sellerId: {
          _id: "mock-usr-002",
          fullName: "Sarah Chen",
          displayName: "Sarah Chen",
          username: "schen_seo",
          avatar: "",
          profilePicture: "",
          level: "Top Rated Seller",
          professionalTitle: "SEO Specialist",
          onlineStatus: "offline",
          isVerified: true,
          location: { city: "Toronto", country: "Canada" },
          metrics: { responseRate: 100, onTimeDelivery: 99, orderCompletion: 100 },
          memberSince: "2023-11-02"
        }
      }
    ]);
  }

  try {
    const services = await Service.find({ status: "active" })
      .populate("sellerId", SELLER_POPULATE_FIELDS)
      .sort({ createdAt: -1 });
    
    res.json(services);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve marketplace offerings.", 
      error: err.message 
    });
  }
});

// 2. Protected Service Creator Endpoint
app.post('/api/services', auth, async (req, res) => {
  console.log("--> DRAFT ENDPOINT HIT! Request body:", req.body);
  
  const { title, price, description, category, images } = req.body;

  if (!title || !price || !description || !category) {
    return res.status(400).json({ 
      success: false, 
      message: "Validation Error: Title, price, description, and category fields are required." 
    });
  }

  if (skipDatabase) {
    return res.status(201).json({
      success: true,
      message: "Marketplace service created successfully! (Mock Sandbox Environment)",
      data: {
        _id: `mock-srv-${Math.random().toString(36).substr(2, 9)}`,
        title,
        price: Number(price),
        description,
        category,
        images: images || [],
        createdAt: new Date(),
        sellerId: {
          _id: req.user?.id || "mock-usr-current",
          fullName: "Sandbox Developer",
          displayName: "Sandbox Developer",
          username: "sandbox_dev",
          avatar: "",
          profilePicture: "",
          level: "Level 1 Seller",
          professionalTitle: "Workspace Owner",
          onlineStatus: "online",
          isVerified: true,
          location: { city: "Local", country: "Sandbox" },
          metrics: { responseRate: 100, onTimeDelivery: 100, orderCompletion: 100 },
          memberSince: "2026-07-01"
        }
      }
    });
  }

  const service = new Service({
    sellerId: req.user.id,
    title,
    price,
    description,
    category,
    images
  });

  try {
    const newService = await service.save();
    const populatedService = await Service.findById(newService._id)
      .populate("sellerId", SELLER_POPULATE_FIELDS);

    res.status(201).json({
      success: true,
      message: "Marketplace service created successfully!",
      data: populatedService
    });
      
  } catch (err) {
    res.status(400).json({ 
      success: false, 
      message: "Failed to create service document.", 
      error: err.message 
    });
  }
});

// Draft Endpoint for Service Posting
app.post('/api/services/draft', uploadMedia, async (req, res) => {
  if (skipDatabase) {
    return res.status(201).json({
      success: true,
      draftId: `mock-draft-${Math.random().toString(36).substring(2, 9)}`,
      message: "Draft saved successfully (Sandbox Mode)",
    });
  }

  try {
    const {
      title,
      category,
      description,
      keywords,
      selectedPlan,
      packages,
      attributes,
      addons,
      faqs,
      requirements,
      price,
    } = req.body;

    // Read subCategory (frontend may send camelCase) or subcategory
    const subCategory = req.body.subCategory || req.body.subcategory || "";

    // Extract Cloudinary secure URLs populated by Multer
    const imageUrls = req.files?.images ? req.files.images.map((f) => f.path) : [];
    const videoUrls = req.files?.videos ? req.files.videos.map((f) => f.path) : [];
    const audioUrls = req.files?.audio ? req.files.audio.map((f) => f.path) : [];

    const sellerId = req.user?.id || "60c72b2f9b1d8b2b88888888";

    const draft = new Service({
      sellerId,
      title: title || "Untitled Draft",
      category: category || "General",
      // Save subCategory into the schema's subcategory field so it persists
      subCategory: subCategory || "",
      description: description || "",
      tags: keywords ? keywords.split(",").map((k) => k.trim()) : [],
      selectedPlan: selectedPlan || "free",
      packages: packages ? (typeof packages === 'string' ? JSON.parse(packages) : packages) : {},
      attributes: attributes ? (typeof attributes === 'string' ? JSON.parse(attributes) : attributes) : [],
      addons: addons ? (typeof addons === 'string' ? JSON.parse(addons) : addons) : [],
      faqs: faqs ? (typeof faqs === 'string' ? JSON.parse(faqs) : faqs) : [],
      requirements: requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [],
      price: price ? Number(price) : 5,
      images: imageUrls,
      videos: videoUrls,
      audio: audioUrls,
      status: "draft",
    });

    const savedDraft = await draft.save();

    res.status(201).json({
      success: true,
      draftId: savedDraft._id.toString(),
      message: "Draft saved successfully to database",
    });
  } catch (err) {
    console.error("Error saving draft to MongoDB:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save draft to database",
      error: err.message,
    });
  }
});

// PUT: Update existing draft by draftId
app.put('/api/services/draft/update', uploadMedia, async (req, res) => {
  if (skipDatabase) {
    return res.status(200).json({
      success: true,
      draftId: req.body.draftId || `mock-draft-${Math.random().toString(36).substring(2, 9)}`,
      message: 'Draft update simulated (Sandbox Mode)'
    });
  }

  try {
    const { draftId } = req.body;
    if (!draftId) {
      return res.status(400).json({ success: false, message: 'draftId is required for updating a draft' });
    }

    const draft = await Service.findById(draftId);
    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    // Parse incoming fields
    const {
      title,
      category,
      description,
      keywords,
      selectedPlan,
      packages,
      attributes,
      addons,
      faqs,
      requirements,
      price,
    } = req.body;

    const subCategory = req.body.subCategory || req.body.subcategory || undefined;

    // Update scalar fields when provided (allow empty-string values explicitly sent)
    if (typeof title !== 'undefined') draft.title = title;
    if (typeof category !== 'undefined') draft.category = category;
    if (typeof subCategory !== 'undefined') draft.subCategory = subCategory || "";
    if (typeof description !== 'undefined') draft.description = description;
    if (typeof keywords !== 'undefined') draft.tags = keywords ? String(keywords).split(',').map(k => k.trim()) : [];
    if (typeof selectedPlan !== 'undefined') draft.selectedPlan = selectedPlan;
    if (typeof price !== 'undefined') draft.price = price ? Number(price) : draft.price;

    // JSON fields (packages, attributes, addons, faqs, requirements)
    if (typeof packages !== 'undefined') draft.packages = typeof packages === 'string' ? JSON.parse(packages) : packages;
    if (typeof attributes !== 'undefined') draft.attributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
    if (typeof addons !== 'undefined') draft.addons = typeof addons === 'string' ? JSON.parse(addons) : addons;
    if (typeof faqs !== 'undefined') draft.faqs = typeof faqs === 'string' ? JSON.parse(faqs) : faqs;
    if (typeof requirements !== 'undefined') draft.requirements = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;

    // Media: if new files uploaded, replace the arrays; otherwise preserve existing
    if (req.files?.images && req.files.images.length > 0) {
      draft.images = req.files.images.map(f => f.path);
    }
    if (req.files?.videos && req.files.videos.length > 0) {
      draft.videos = req.files.videos.map(f => f.path);
    }
    if (req.files?.audio && req.files.audio.length > 0) {
      draft.audio = req.files.audio.map(f => f.path);
    }

    // Keep status as 'draft' (unless client explicitly changed it)
    if (typeof req.body.status !== 'undefined') draft.status = req.body.status;

    await draft.save();

    res.json({ success: true, draftId: draft._id.toString(), message: 'Draft updated successfully' });
  } catch (err) {
    console.error('Error updating draft:', err);
    res.status(500).json({ success: false, message: 'Failed to update draft', error: err.message });
  }
});

// GET Draft Endpoint for Hydrating Form
app.get('/api/services/draft/:id', async (req, res) => {
  const { id } = req.params;

  if (skipDatabase) {
    return res.json({
      _id: id,
      title: "SEO Audit and Keyword Research",
      category: "design",
      description: "Draft service description retrieved from sandbox memory.",
      keywords: "seo, audit, marketing",
      selectedPlan: "free",
      packages: {
        basic: { title: "Basic SEO", desc: "Audit report", price: "50", delivery: "3", revisions: "1", features: "Full report" }
      }
    });
  }

  try {
    const draft = await Service.findById(id);

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    res.json(draft);
  } catch (error) {
    console.error("Error retrieving draft:", error);
    res.status(500).json({ success: false, message: 'Server error retrieving draft', error: error.message });
  }
});

// ====================== GLOBAL ERROR & UNHANDLED ROUTE HANDLERS ======================

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested endpoint route does not exist."
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Global Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ====================== CLOUD SYSTEM BOOT ENGINE & GRACEFUL SHUTDOWN ======================
const server = app.listen(PORT, () => {
  console.log(`\x1b[36m🚀 Thick 9 System Engine Core successfully initialized on Port ${PORT}\x1b[0m`);
});

// Graceful process termination handler
const handleGracefulShutdown = (signal) => {
  console.log(`\n\x1b[33mReceived ${signal}. Shutting down server gracefully...\x1b[0m`);
  server.close(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\x1b[32m✅ MongoDB Connection Pool gracefully closed.\x1b[0m');
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));