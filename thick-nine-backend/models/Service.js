const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  category: String
});

module.exports = mongoose.model('Service', ServiceSchema);




