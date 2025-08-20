const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Contact Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
  },

  // Message Details
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['inquiry', 'complaint', 'suggestion', 'general'],
    default: 'general'
  },

  // Message Status
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'resolved'],
    default: 'unread'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Admin Response
  response: {
    type: String,
    trim: true,
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  respondedAt: {
    type: Date
  },

  // Tracking
  source: {
    type: String,
    enum: ['website', 'phone', 'email', 'walk-in'],
    default: 'website'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },

  // Follow-up
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }]
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ email: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ priority: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ messageType: 1 });

// Virtual for full name
messageSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for message age (days since submission)
messageSchema.virtual('messageAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for response time (if responded)
messageSchema.virtual('responseTime').get(function() {
  if (!this.respondedAt) return null;
  const diffTime = Math.abs(this.respondedAt - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60)); // in hours
});

// Static method to get messages by status
messageSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get unread messages
messageSchema.statics.getUnread = function() {
  return this.find({ status: 'unread' }).sort({ createdAt: -1 });
};

// Static method to get high priority messages
messageSchema.statics.getHighPriority = function() {
  return this.find({ 
    priority: { $in: ['high', 'urgent'] },
    status: { $in: ['unread', 'read'] }
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get recent messages
messageSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('respondedBy', 'username');
};

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  if (this.status === 'unread') {
    this.status = 'read';
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to respond to message
messageSchema.methods.respond = function(response, respondedBy) {
  this.response = response;
  this.respondedBy = respondedBy;
  this.respondedAt = new Date();
  this.status = 'replied';
  return this.save();
};

// Method to resolve message
messageSchema.methods.resolve = function() {
  this.status = 'resolved';
  return this.save();
};

// Method to set priority
messageSchema.methods.setPriority = function(priority) {
  this.priority = priority;
  return this.save();
};

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;