const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  // 1. WHO is saving it?
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // 2. WHAT are they saving? (The Category)
  itemType: { 
    type: String, 
    required: true, 
    enum: ['Service', 'Job', 'User'] // This covers all your pages
  },

  // 3. WHICH specific one? (The ID)
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'itemType' // This tells Mongoose to look in the collection named in itemType
  },

  savedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// This ensures a user cannot bookmark the same exact job twice
BookmarkSchema.index({ user: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', BookmarkSchema);