const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Student Information
  studentFirstName: {
    type: String,
    required: [true, 'Student first name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  studentLastName: {
    type: String,
    required: [true, 'Student last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(date) {
        // Compare only the date part, not time
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        return new Date(date) <= today;
      },
      message: 'Date of birth must be in the past'
    }
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female']
  },
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    trim: true,
    maxlength: [50, 'Nationality cannot exceed 50 characters']
  },
  program: {
    type: String,
    required: [true, 'Program is required'],
    enum: ['early-years', 'primary', 'secondary']
  },
  currentGrade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true,
    maxlength: [20, 'Grade cannot exceed 20 characters']
  },

  // Parent/Guardian Information
  parentFirstName: {
    type: String,
    required: [true, 'Parent first name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  parentLastName: {
    type: String,
    required: [true, 'Parent last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  relationship: {
    type: String,
    default: 'parent',
    enum: ['parent', 'guardian', 'relative', 'aunt', 'uncle', 'grandparent', 'other'],
    trim: true
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
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Please enter a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },

  // Previous School Information
  previousSchool: {
    type: String,
    trim: true,
    maxlength: [100, 'Previous school name cannot exceed 100 characters']
  },
  previousGrade: {
    type: String,
    trim: true,
    maxlength: [20, 'Previous grade cannot exceed 20 characters']
  },
  reasonForTransfer: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason for transfer cannot exceed 500 characters']
  },

  // Additional Information
  medicalConditions: {
    type: String,
    trim: true,
    maxlength: [500, 'Medical conditions cannot exceed 500 characters'],
    default: 'None'
  },
  specialNeeds: {
    type: String,
    trim: true,
    maxlength: [500, 'Special needs cannot exceed 500 characters'],
    default: 'None'
  },
  extracurriculars: {
    type: String,
    trim: true,
    maxlength: [500, 'Extracurriculars cannot exceed 500 characters']
  },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'review', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review notes cannot exceed 1000 characters']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: {
    type: Date
  },

  // Documents (file paths or URLs)
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Application tracking
  applicationNumber: {
    type: String,
    unique: true
  },
  source: {
    type: String,
    enum: ['website', 'phone', 'walk-in', 'referral'],
    default: 'website'
  }
}, {
  timestamps: true
});

// Indexes for performance
applicationSchema.index({ email: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ program: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ applicationNumber: 1 });

// Generate application number before saving
applicationSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });
      
      this.applicationNumber = `WG${year}${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for full student name
applicationSchema.virtual('studentFullName').get(function() {
  return `${this.studentFirstName} ${this.studentLastName}`;
});

// Virtual for full parent name
applicationSchema.virtual('parentFullName').get(function() {
  return `${this.parentFirstName} ${this.parentLastName}`;
});

// Virtual for application age (days since submission)
applicationSchema.virtual('applicationAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static method to get applications by status
applicationSchema.statics.getByStatus = function(status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

// Static method to get recent applications
applicationSchema.statics.getRecent = function(limit = 10) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reviewedBy', 'username');
};

// Method to update status
applicationSchema.methods.updateStatus = function(status, reviewNotes, reviewedBy) {
  this.status = status;
  this.reviewNotes = reviewNotes;
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  return this.save();
};

// Ensure virtual fields are serialized
applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;