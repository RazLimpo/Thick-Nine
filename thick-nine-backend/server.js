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
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const affiliateLinksRouter = require('./routes/affiliateLinks');
const affiliateStoreRouter = require('./routes/affiliateStore');
const affiliateNetworkRouter = require('./routes/affiliateNetwork');
const affiliatePayoutsRouter = require('./routes/affiliatePayouts');
const affiliateGrowthRouter = require('./routes/affiliateGrowth');
const serviceRoutes = require('./routes/serviceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
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
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', require('./routes/contactRoutes'));
app.use('/api/affiliate/links', affiliateLinksRouter);
app.use('/api/affiliate/store', affiliateStoreRouter);
app.use('/api/affiliate', affiliateNetworkRouter); // Handles /api/affiliate/network/*
app.use('/api/affiliate', affiliatePayoutsRouter); // Handles /api/affiliate/withdraw & /payouts
app.use('/api/affiliate', affiliateGrowthRouter);  // Handles /api/affiliate/analytics & /progression
app.use('/api/services', serviceRoutes);
app.use('/api', paymentRoutes);

app.get('/', (req, res) => {
  res.send(`OsinoWorks Engine Server API is Live, Secured, and Running smoothly.`);
});


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