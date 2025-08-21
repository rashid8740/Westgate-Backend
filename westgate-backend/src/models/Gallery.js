const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  // Image Information
  title: {
    type: String,
    required: [true, 'Image title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  alt: {
    type: String,
    required: [true, 'Alt text is required'],
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },

  // Cloudinary Information
  cloudinaryId: {
    type: String,
    required: [true, 'Cloudinary ID is required'],
    unique: true
  },
  url: {
    type: String,
    required: [true, 'Image URL is required']
  },
  secureUrl: {
    type: String,
    required: [true, 'Secure URL is required']
  },
  
  // Different sized URLs for responsive images
  urls: {
    thumbnail: { type: String },
    medium: { type: String },
    large: { type: String },
    original: { type: String }
  },
  
  // Image Details
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  format: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true // in bytes
  },

  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'academics',
      'sports', 
      'arts-culture',
      'science-technology',
      'events',
      'facilities',
      'student-life',
      'staff',
      'achievements',
      'community',
      'other'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],

  // Event/Activity Information
  eventDate: {
    type: Date
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },

  // Status and Visibility
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  },

  // Upload Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  uploadSource: {
    type: String,
    enum: ['admin_panel', 'bulk_upload', 'api'],
    default: 'admin_panel'
  },

  // Analytics
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for performance
gallerySchema.index({ category: 1, isActive: 1 });
gallerySchema.index({ isFeatured: 1, isActive: 1 });
gallerySchema.index({ tags: 1 });
gallerySchema.index({ createdAt: -1 });
gallerySchema.index({ displayOrder: 1 });
gallerySchema.index({ uploadedBy: 1 });
gallerySchema.index({ cloudinaryId: 1 });
gallerySchema.index({ eventDate: -1 });

// Text index for search
gallerySchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual for human-readable file size
gallerySchema.virtual('readableSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for aspect ratio
gallerySchema.virtual('aspectRatio').get(function() {
  if (!this.width || !this.height) return null;
  return (this.width / this.height).toFixed(2);
});

// Virtual for image age
gallerySchema.virtual('imageAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
});

// Static method to get images by category
gallerySchema.statics.getByCategory = function(category, isActive = true) {
  const filter = { category };
  if (isActive !== null) filter.isActive = isActive;
  
  return this.find(filter)
    .sort({ displayOrder: 1, createdAt: -1 })
    .populate('uploadedBy', 'username');
};

// Static method to get featured images
gallerySchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username');
};

// Static method to get recent images
gallerySchema.statics.getRecent = function(limit = 20) {
  return this.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username');
};

// Static method to search images
gallerySchema.statics.searchImages = function(query, filters = {}) {
  const searchFilter = {
    $text: { $search: query },
    ...filters
  };
  
  return this.find(searchFilter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('uploadedBy', 'username');
};

// Method to increment views
gallerySchema.methods.incrementViews = function() {
  this.views = (this.views || 0) + 1;
  return this.save();
};

// Method to increment downloads
gallerySchema.methods.incrementDownloads = function() {
  this.downloads = (this.downloads || 0) + 1;
  return this.save();
};

// Method to toggle featured status
gallerySchema.methods.toggleFeatured = function() {
  this.isFeatured = !this.isFeatured;
  return this.save();
};

// Ensure virtual fields are serialized
gallerySchema.set('toJSON', { virtuals: true });
gallerySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Gallery', gallerySchema);
