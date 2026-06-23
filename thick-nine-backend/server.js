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
// Prevents cross-site script validation hijacking while allowing local sandboxes to run smoothly.
const allowedOriginsRegExp = [
  /^http:\/\/localhost(:\d+)?$/,                             // Local Dev Environment Ports
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,                  // Automated Vercel Deploy Previews
  /^https:\/\/[a-zA-Z0-9-]+\.webcontainer\.io$/,             // StackBlitz Dev Containers
  /^https:\/\/[a-zA-Z0-9-]+\.stackblitz\.io$/,               // StackBlitz Sandboxes
  /^https:\/\/osindoworks\.com$/                             // Your Production Apex Domain Name (Replace with your actual live URL)
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







// ====================== DATABASE CONNECTION POOL STAGING ======================
// Validates environmental setup configurations without leaking sensitive credential tokens to host logs.
console.log("Validating Database Configuration Environment:");
console.log(process.env.MONGODB_URI ? "  ↳ MONGODB_URI: ✅ Environment String Active" : "  ↳ MONGODB_URI: ❌ Missing Critical Parameter");

const connectionOptions = {
  // Uses your server configuration namespace fallback to stay decoupled from frontend directories
  dbName: process.env.DB_NAME || 'freelancingDB', 
  
  // The Safety Gate: Stops long, hung worker routines by cutting dead sync attempts off after 5 seconds
  serverSelectionTimeoutMS: 5000, 
  
  // The Stability Keep-Alive: Maintains persistent cloud communication pipes open during peak loads
  socketTimeoutMS: 45000,         
};

// Fire connection pipeline directly into your cloud instance database cluster
mongoose.connect(process.env.MONGODB_URI, connectionOptions)
  .then(() => {
    console.log(`\x1b[32m✅ Database Pipeline Synced: Sourced collection pool targeting "${connectionOptions.dbName}"\x1b[0m`);
  })
  .catch((err) => {
    console.error('\x1b[31m❌ MongoDB Cluster Critical Connection Failure:\x1b[0m', err.message);
    
    // Critical Crash Handshake: Force abort processes instantly so live host orchestrators (like Render) 
    // know to immediately restart the container instance or halt a corrupted pipeline build.
    process.exit(1); 
  });





// ====================== REST ROUTE SUB-ROUTERS ======================
// Mounts your user authentication pipeline (Login, Register, Session Validation)
app.use('/api/auth', authRoutes); 

// Core Server Health Verification Ping Root Route
app.get('/', (req, res) => {
  res.send(`OsinoWorks Engine Server API is Live, Secured, and Running smoothly.`);
});

// ====================== SERVICE MARKETPLACE LOGIC ENDPOINTS ======================

// 1. Dynamic Service Read Aggregator (Fetch all listed marketplace offerings)
app.get('/api/services', async (req, res) => {
  try {
    // Slices into your cluster to return available services, 
    // seamlessly populating the associated seller's profile details.
    const services = await Service.find()
      .populate('sellerId', 'fullName avatar')
      .sort({ createdAt: -1 }); // Production enhancement: Puts newest gigs first
    
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

  // Validation Guard: Ensure required core values exist before attempting execution
  if (!title || !price || !description || !category) {
    return res.status(400).json({ 
      success: false, 
      message: "Validation Error: Title, price, description, and category fields are required." 
    });
  }

  // Construct a clean instance mapping the gig properties to the seller's verified JWT token ID
  const service = new Service({
    sellerId: req.user.id, // Injected automatically from your verified 'auth' middleware validation layer
    title,
    price,
    description,
    category,
    images
  });

  try {
    const newService = await service.save();
    res.status(201).json({
      success: true,
      message: "Marketplace service created successfully!",
      data: newService
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






