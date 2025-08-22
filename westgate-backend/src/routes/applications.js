const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const Application = require('../models/Application');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for application creation
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 applications per hour
  message: {
    success: false,
    message: 'Too many applications submitted, please try again later.',
    code: 'APPLICATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const createApplicationValidation = [
  body('studentFirstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Student first name must be between 2 and 50 characters'),
  body('studentLastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Student last name must be between 2 and 50 characters'),
  body('dateOfBirth')
    .isISO8601()
    .toDate()
    .withMessage('Date of birth must be a valid date'),
  body('gender')
    .isIn(['male', 'female'])
    .withMessage('Gender must be male or female'),
  body('nationality')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nationality must be between 2 and 50 characters'),
  body('program')
    .isIn(['playgroup', 'nursery', 'pre-primary', 'primary'])
    .withMessage('Program must be playgroup, nursery, pre-primary, or primary'),
  body('currentGrade')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Current grade is required'),
  body('parentFirstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Parent first name must be between 2 and 50 characters'),
  body('parentLastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Parent last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
];

const updateStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid application ID'),
  body('status')
    .isIn(['pending', 'review', 'approved', 'rejected'])
    .withMessage('Status must be pending, review, approved, or rejected'),
  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review notes cannot exceed 1000 characters')
];

// POST /api/applications - Create new application (public)
router.post('/', createLimiter, createApplicationValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check for duplicate email within last 30 days
    const existingApp = await Application.findOne({
      email: req.body.email,
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      }
    });

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: 'An application with this email already exists within the last 30 days',
        code: 'DUPLICATE_APPLICATION'
      });
    }

    // Create application
    const application = new Application({
      ...req.body,
      source: 'website'
    });

    await application.save();

    console.log(`📝 New application submitted: ${application.applicationNumber} - ${application.studentFullName}`);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application: {
          applicationNumber: application.applicationNumber,
          studentFullName: application.studentFullName,
          program: application.program,
          status: application.status,
          submittedAt: application.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Application creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      code: 'APPLICATION_CREATION_ERROR'
    });
  }
});

// GET /api/applications - Get all applications (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      program,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (program && program !== 'all') {
      filter.program = program;
    }
    
    if (search) {
      filter.$or = [
        { studentFirstName: { $regex: search, $options: 'i' } },
        { studentLastName: { $regex: search, $options: 'i' } },
        { parentFirstName: { $regex: search, $options: 'i' } },
        { parentLastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { applicationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('reviewedBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Application.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      message: 'Applications retrieved successfully',
      data: {
        applications,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext,
          hasPrev
        }
      }
    });

  } catch (error) {
    console.error('Applications retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
      code: 'APPLICATIONS_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/applications/stats - Get application statistics (admin only)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [
      totalApplications,
      pendingApplications,
      reviewApplications,
      approvedApplications,
      rejectedApplications,
      recentApplications,
      programStats,
      monthlyStats
    ] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'review' }),
      Application.countDocuments({ status: 'approved' }),
      Application.countDocuments({ status: 'rejected' }),
      Application.find().sort({ createdAt: -1 }).limit(5),
      Application.aggregate([
        { $group: { _id: '$program', count: { $sum: 1 } } }
      ]),
      Application.aggregate([
        {
          $group: {
            _id: { 
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ])
    ]);

    res.json({
      success: true,
      message: 'Application statistics retrieved successfully',
      data: {
        overview: {
          total: totalApplications,
          pending: pendingApplications,
          review: reviewApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        },
        recentApplications,
        programStats,
        monthlyStats
      }
    });

  } catch (error) {
    console.error('Application stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application statistics',
      code: 'STATS_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/applications/:id - Get specific application (admin only)
router.get('/:id', verifyToken, [
  param('id').isMongoId().withMessage('Invalid application ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const application = await Application.findById(req.params.id)
      .populate('reviewedBy', 'username');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Application retrieved successfully',
      data: {
        application
      }
    });

  } catch (error) {
    console.error('Application retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application',
      code: 'APPLICATION_RETRIEVAL_ERROR'
    });
  }
});

// PUT /api/applications/:id/status - Update application status (admin only)
router.put('/:id/status', verifyToken, updateStatusValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, reviewNotes } = req.body;

    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    // Update application status
    await application.updateStatus(status, reviewNotes, req.admin._id);

    console.log(`📊 Application ${application.applicationNumber} status updated to ${status} by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: {
        application: await Application.findById(req.params.id)
          .populate('reviewedBy', 'username')
      }
    });

  } catch (error) {
    console.error('Application status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

// DELETE /api/applications/:id - Delete application (super admin only)
router.delete('/:id', verifyToken, requireRole('super_admin'), [
  param('id').isMongoId().withMessage('Invalid application ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    await Application.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Application ${application.applicationNumber} deleted by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Application deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      code: 'APPLICATION_DELETION_ERROR'
    });
  }
});

module.exports = router;