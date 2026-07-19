const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const auth = require('./middleware/auth');
require('dotenv').config(); // Hydrates backend parameters safely from the environment

// ====================== DATABASE MODELS & SUB-ROUTERS ======================
const Service = require('./models/Service'); 
const authRoutes = require('./routes/authRoutes'); 

const app = express();
const PORT = process.env.PORT || 5000;

// ====================== HARDENED PRODUCTION CORS MATRIX ======================
const allowedOriginsRegExp = [
  /^http:\/\/localhost(:\d+)?$/,                               // Local Dev Environment Ports
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,                     // Automated Vercel Deploy Previews
  /^https:\/\/[a-zA-Z0-9-]+\.webcontainer\.io$/,                // StackBlitz Dev Containers
  /^https:\/\/[a-zA-Z0-9-]+--\d+--[a-zA-Z0-9-]+\.local-credentialless\.webcontainer\.io$/, // ✅ FIX: Dynamic credentialless previews
  /^https:\/\/[a-zA-Z0-9-]+\.stackblitz\.io$/,                   // StackBlitz Sandboxes
  /^https:\/\/[a-zA-Z0-9-]+\.[a-z-]+\.staticblitz\.com$/,     // Matches StackBlitz Static Previews
  /^https:\/\/osindoworks\.com$/                                // Production Domain
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow background machine tasks with no origin headers (like local script testing or system crons)
    if (!origin) return callback(null, true);

    // 2. Validate the incoming origin header against our strict regex checklist
    const isAllowed = allowedOriginsRegExp.some(regex => regex.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      // Security Event: Abort request processing to keep authorization tokens isolated
      callback(new Error('CORS Violation: Access denied from unauthorized platform domains.'));
    }
  },
  credentials: true, // Enables cookies and dynamic bearer token headers to pass through securely
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Standard JSON body parser middleware limit adjustments to allow full-stack payload processing
app.use(express.json({ limit: '10mb' }));

// ====================== ADAPTIVE DATABASE CONNECTION POOL ======================
console.log("Validating Database Configuration Environment:");
console.log(process.env.MONGODB_URI ? "  ↳ MONGODB_URI: ✅ Environment String Active" : "  ↳ MONGODB_URI: ❌ Missing Critical Parameter");

const connectionOptions = {
  dbName: process.env.DB_NAME || 'freelancingDB', 
  serverSelectionTimeoutMS: 5000,  // Safety Gate: Stops long hung loops
  socketTimeoutMS: 45000,          // Keep-Alive connection persistence
};

// Check for intentional database isolation flag (StackBlitz sandbox workaround)
const skipDatabase = process.env.SKIP_DB === 'true' || !process.env.MONGODB_URI;

if (skipDatabase) {
  console.log('\x1b[33m⚠️  StackBlitz sandbox mode active: Cloud TCP connection bypassed. Serving memory layer mock hooks.\x1b[0m');
} else {
  // Live Production execution path (Render environment)
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

// Core Server Health Verification Ping Root Route
app.get('/', (req, res) => {
  res.send(`OsinoWorks Engine Server API is Live, Secured, and Running smoothly.`);
});

// ====================== SERVICE MARKETPLACE LOGIC ENDPOINTS ======================

// 1. Dynamic Service Read Aggregator (Fetch all listed marketplace offerings)
app.get('/api/services', async (req, res) => {
  // 🚀 LOCAL STACKBLITZ MOCK FALLBACK LAYER
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
          avatar: "",
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
          avatar: "",
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

  // Live Database Execution Path (Render)
  try {
    const services = await Service.find({ status: "active" })
      .populate(
        "sellerId",
        "fullName avatar level professionalTitle onlineStatus isVerified location metrics memberSince"
      )
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

// 2. Protected Service Creator Endpoint (Post a new marketplace offering)
app.post('/api/services', auth, async (req, res) => {
  const { title, price, description, category, images } = req.body;

  if (!title || !price || !description || !category) {
    return res.status(400).json({ 
      success: false, 
      message: "Validation Error: Title, price, description, and category fields are required." 
    });
  }

  // 🚀 LOCAL STACKBLITZ MOCK CREATION INTERCEPTOR
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
          avatar: "",
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

  // Live Database Execution Path (Render)
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
      .populate(
        "sellerId",
        "fullName avatar level professionalTitle onlineStatus isVerified location metrics memberSince"
      );

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

// ====================== CLOUD SYSTEM BOOT ENGINE ======================
app.listen(PORT, () => {
  console.log(`\x1b[36m🚀 Thick 9 System Engine Core successfully initialized on Port ${PORT}\x1b[0m`);
});