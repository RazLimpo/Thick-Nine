const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 1. Import the Model (The Rulebook)
const Service = require('./models/Service'); 

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 3. Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB Connection Error:', err));

// 4. Routes
app.get('/', (req, res) => {
  res.send('Thick 9 Backend is Live and Running!');
});

// Get All Services (The "Get" Route)
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Test Add Service (The "Post" Route)
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

// 5. Start Server (Always keep this at the very bottom)
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});