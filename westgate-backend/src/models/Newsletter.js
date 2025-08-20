const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  preferences: [{
    type: String,
    enum: ['academic-updates', 'events', 'admissions', 'sports', 'achievements', 'general']
  }],
  status: {
    type: String,
    enum: ['active', 'unsubscribed', 'bounced'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['website', 'event', 'referral', 'social-media', 'other'],
    default: 'website'
  },
  subscriptionDate: {
    type: Date,
    default: Date.now
  },
  unsubscribeDate: {
    type: Date
  },
  unsubscribeReason: {
    type: String,
    trim: true
  },
  lastEmailSent: {
    type: Date
  },
  emailsSent: {
    type: Number,
    default: 0
  },
  emailsOpened: {
    type: Number,
    default: 0
  },
  emailsClicked: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
newsletterSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ status: 1, subscriptionDate: -1 });
newsletterSchema.index({ preferences: 1 });
newsletterSchema.index({ tags: 1 });

// Virtual for engagement rate
newsletterSchema.virtual('engagementRate').get(function() {
  if (this.emailsSent === 0) return 0;
  return ((this.emailsOpened + this.emailsClicked) / (this.emailsSent * 2)) * 100;
});

// Method to unsubscribe
newsletterSchema.methods.unsubscribe = function(reason) {
  this.status = 'unsubscribed';
  this.unsubscribeDate = new Date();
  if (reason) this.unsubscribeReason = reason;
  return this.save();
};

// Method to resubscribe
newsletterSchema.methods.resubscribe = function() {
  this.status = 'active';
  this.unsubscribeDate = undefined;
  this.unsubscribeReason = undefined;
  return this.save();
};

// Method to track email sent
newsletterSchema.methods.trackEmailSent = function() {
  this.emailsSent += 1;
  this.lastEmailSent = new Date();
  return this.save();
};

// Method to track email opened
newsletterSchema.methods.trackEmailOpened = function() {
  this.emailsOpened += 1;
  return this.save();
};

// Method to track email clicked
newsletterSchema.methods.trackEmailClicked = function() {
  this.emailsClicked += 1;
  return this.save();
};

// Static method to get active subscribers
newsletterSchema.statics.getActiveSubscribers = function(preferences = []) {
  const query = { status: 'active' };
  if (preferences.length > 0) {
    query.preferences = { $in: preferences };
  }
  return this.find(query).sort({ subscriptionDate: -1 });
};

// Static method to get subscribers by tag
newsletterSchema.statics.getByTag = function(tag) {
  return this.find({ status: 'active', tags: tag }).sort({ subscriptionDate: -1 });
};

// Static method to get subscription stats
newsletterSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Newsletter', newsletterSchema);
