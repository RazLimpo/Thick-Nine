const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB Connection Error:', err));

app.get('/', (req, res) => {
  res.send('Thick 9 Backend is Live and Running!');
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});