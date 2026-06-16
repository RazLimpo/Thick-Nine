
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { BRAND } = require('../lib/constants');
require('dotenv').config();


// 1. Import the Models & Routes
const Service = require('./models/Service'); 
const authRoutes = require('./routes/authRoutes'); // <--- NEW: Import Auth Routes

const app = express();


// 2. Middleware (THE DYNAMIC FIX)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);

    const allowedDomains = [
      'localhost',
      'vercel.app',
      'webcontainer.io',
      'stackblitz.io'
    ];

    // Check if the incoming origin contains any of our allowed domains
    const isAllowed = allowedDomains.some(domain => origin.includes(domain));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // <--- KEEP THIS

const PORT = process.env.PORT || 5000; // <--- KEEP THIS


// 3. Database Connection
console.log("Checking URI:", process.env.MONGODB_URI ? "✅ Found it!" : "❌ Empty!");

const connectionOptions = {
  dbName: BRAND.dbName,           // THE SMART FIX: Targets your "freelancingDB"
  serverSelectionTimeoutMS: 5000, // THE SAFETY FIX: Stops 5-minute wait times
  socketTimeoutMS: 45000,         // THE STABILITY FIX: Keeps connection alive
};

console.log("DEBUG: Your database connection string is:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, connectionOptions)
  .then(() => {
    console.log(`✅ Connected to MongoDB: ${BRAND.dbName}`);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // CRITICAL: Stop the server so you can see the error in the terminal
    process.exit(1); 
  });



// 4. Routes

// AUTH ROUTES (The new "Brain" connection)
app.use('/api/auth', authRoutes); // <--- NEW: Tells server to use authRoutes for any /api/auth path

app.get('/', (req, res) => {
  // Uses your "One Source of Truth" for the welcome message
  res.send(`${BRAND.pretty} Backend is Live and Running!`);
});


// SERVICE ROUTES
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/services', async (req, res) => {
  const service = new Service({
    title: "Website Design",
    price: 50,
    description: "I will build you a professional Next.js website."
  });

  try {
    const newService = await service.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});