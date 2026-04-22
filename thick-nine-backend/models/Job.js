const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  // 1. OWNERSHIP
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // 2. CORE CONTENT
  title: { type: String, required: true, trim: true, maxlength: 80 },
  category: { type: String, required: true },
  description: { type: String, required: true, maxlength: 1000 },
  deliverables: { type: String, required: true },
  requiredSkills: [String],

  // 3. BUDGET & TYPE (Synced with your jobs.js sliders/pills)
  budgetType: { 
    type: String, 
    enum: ['Fixed Price', 'Hourly Rate'], 
    required: true 
  },
  budget: { type: Number, required: true }, 
  duration: { type: String }, 

  // 4. MANAGEMENT & PROPOSALS
  status: { 
    type: String, 
    enum: ['open', 'in-progress', 'completed', 'cancelled'], 
    default: 'open' 
  },
  proposals: [{
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    coverLetter: String,
    bidAmount: Number,
    createdAt: { type: Date, default: Date.now }
  }],

  // 5. ATTACHMENTS & TEMPLATES (From post-job.js logic)
  attachments: [String], 
  isDraft: { type: Boolean, default: false },
  isTemplate: { type: Boolean, default: false }, // Supports your "Save as Template" button

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// VIRTUAL: Automatically counts applications for the jobs.html view
JobSchema.virtual('proposalCount').get(function() {
  return this.proposals ? this.proposals.length : 0;
});

module.exports = mongoose.model('Job', JobSchema);