const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^(\+254|0)[17]\d{8}$/, 'Please enter a valid Kenyan phone number']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  inquiryType: {
    type: String,
    required: [true, 'Inquiry type is required'],
    enum: {
      values: ['general', 'tour', 'admissions', 'academic', 'facilities'],
      message: 'Invalid inquiry type'
    }
  },
  childAge: {
    type: String,
    trim: true
  },
  preferredProgram: {
    type: String,
    trim: true
  },
  preferredContactTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'follow-up', 'resolved'],
    default: 'new'
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'social-media', 'advertisement', 'other'],
    default: 'website'
  },
  notes: {
    type: String,
    trim: true
  },
  responseDate: {
    type: Date
  },
  assignedTo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ inquiryType: 1 });

// Virtual for full contact info
contactSchema.virtual('fullContactInfo').get(function() {
  return `${this.name} (${this.email}, ${this.phone})`;
});

// Method to mark as contacted
contactSchema.methods.markAsContacted = function(assignedTo, notes) {
  this.status = 'contacted';
  this.responseDate = new Date();
  this.assignedTo = assignedTo;
  if (notes) this.notes = notes;
  return this.save();
};

// Static method to get contacts by type
contactSchema.statics.getByInquiryType = function(type) {
  return this.find({ inquiryType: type }).sort({ createdAt: -1 });
};

// Static method to get recent contacts
contactSchema.statics.getRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

module.exports = mongoose.model('Contact', contactSchema);
