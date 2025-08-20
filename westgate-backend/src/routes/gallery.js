const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const Gallery = require('../models/Gallery');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each admin to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const createImageValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Title must be between 2 and 100 characters'),
  body('alt')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Alt text must be between 2 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .isIn([
      'academics', 'sports', 'arts-culture', 'science-technology', 
      'events', 'facilities', 'student-life', 'staff', 
      'achievements', 'community', 'other'
    ])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('eventDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Event date must be a valid date'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured status must be a boolean')
];

const updateImageValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid image ID'),
  ...createImageValidation.slice(0, -1) // All except featured status
];

// POST /api/gallery - Upload new image (admin only)
router.post('/', verifyToken, uploadLimiter, upload.single('image'), createImageValidation, async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
        code: 'NO_FILE'
      });
    }

    // Upload to Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'westgate-gallery',
          transformation: [
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const cloudinaryResult = await uploadPromise;

    // Create gallery entry
    const galleryImage = new Gallery({
      title: req.body.title,
      description: req.body.description,
      alt: req.body.alt,
      cloudinaryId: cloudinaryResult.public_id,
      url: cloudinaryResult.url,
      secureUrl: cloudinaryResult.secure_url,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      size: cloudinaryResult.bytes,
      category: req.body.category,
      tags: req.body.tags || [],
      eventDate: req.body.eventDate,
      location: req.body.location,
      isFeatured: req.body.isFeatured || false,
      uploadedBy: req.admin._id,
      uploadSource: 'admin_panel'
    });

    await galleryImage.save();

    console.log(`🖼️ New image uploaded: ${galleryImage.title} by ${req.admin.username}`);

    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        image: galleryImage
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up Cloudinary upload if database save failed
    if (error.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(error.cloudinaryId);
      } catch (cleanupError) {
        console.error('Cloudinary cleanup error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      code: 'IMAGE_UPLOAD_ERROR'
    });
  }
});

// GET /api/gallery - Get all images (public with optional admin filters)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      featured,
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive
    } = req.query;

    // Build filter object
    const filter = {};
    
    // Public users only see active images
    if (!req.admin) {
      filter.isActive = true;
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (featured !== undefined) {
      filter.isFeatured = featured === 'true';
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = { $in: tagArray };
    }

    // Handle search
    let query;
    if (search) {
      query = Gallery.searchImages(search, filter);
    } else {
      // Build sort object
      const sort = {};
      if (sortBy === 'displayOrder') {
        sort.displayOrder = sortOrder === 'asc' ? 1 : -1;
        sort.createdAt = -1; // Secondary sort
      } else {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      query = Gallery.find(filter).sort(sort);
    }

    // Add population and pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [images, total] = await Promise.all([
      query.populate('uploadedBy', 'username')
           .skip(skip)
           .limit(parseInt(limit)),
      Gallery.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      message: 'Images retrieved successfully',
      data: {
        images,
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
    console.error('Images retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve images',
      code: 'IMAGES_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/gallery/stats - Get gallery statistics (admin only)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [
      totalImages,
      activeImages,
      featuredImages,
      recentImages,
      categoryStats,
      monthlyStats,
      topCategories
    ] = await Promise.all([
      Gallery.countDocuments(),
      Gallery.countDocuments({ isActive: true }),
      Gallery.countDocuments({ isFeatured: true, isActive: true }),
      Gallery.find({ isActive: true }).sort({ createdAt: -1 }).limit(5),
      Gallery.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Gallery.aggregate([
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
      ]),
      Gallery.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, views: { $sum: '$views' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      message: 'Gallery statistics retrieved successfully',
      data: {
        overview: {
          total: totalImages,
          active: activeImages,
          featured: featuredImages
        },
        recentImages,
        categoryStats,
        monthlyStats,
        topCategories
      }
    });

  } catch (error) {
    console.error('Gallery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery statistics',
      code: 'STATS_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/gallery/categories - Get available categories (public)
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'academics', 'sports', 'arts-culture', 'science-technology',
      'events', 'facilities', 'student-life', 'staff',
      'achievements', 'community', 'other'
    ];

    // Get count for each category
    const categoryStats = await Gallery.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoriesWithCounts = categories.map(category => {
      const stat = categoryStats.find(s => s._id === category);
      return {
        name: category,
        count: stat ? stat.count : 0,
        label: category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    });

    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: categoriesWithCounts
      }
    });

  } catch (error) {
    console.error('Categories retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      code: 'CATEGORIES_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/gallery/:id - Get specific image (public)
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid image ID')
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

    const filter = { _id: req.params.id };
    
    // Public users only see active images
    if (!req.admin) {
      filter.isActive = true;
    }

    const image = await Gallery.findOne(filter)
      .populate('uploadedBy', 'username');

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Increment views
    await image.incrementViews();

    res.json({
      success: true,
      message: 'Image retrieved successfully',
      data: {
        image
      }
    });

  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve image',
      code: 'IMAGE_RETRIEVAL_ERROR'
    });
  }
});

// PUT /api/gallery/:id - Update image (admin only)
router.put('/:id', verifyToken, updateImageValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const image = await Gallery.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Update fields
    const allowedFields = [
      'title', 'description', 'alt', 'category', 'tags',
      'eventDate', 'location', 'isFeatured', 'isActive', 'displayOrder'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        image[field] = req.body[field];
      }
    });

    await image.save();

    console.log(`📝 Image ${image.title} updated by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Image updated successfully',
      data: {
        image: await Gallery.findById(req.params.id)
          .populate('uploadedBy', 'username')
      }
    });

  } catch (error) {
    console.error('Image update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update image',
      code: 'IMAGE_UPDATE_ERROR'
    });
  }
});

// DELETE /api/gallery/:id - Delete image (admin only)
router.delete('/:id', verifyToken, [
  param('id').isMongoId().withMessage('Invalid image ID')
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

    const image = await Gallery.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(image.cloudinaryId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await Gallery.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Image ${image.title} deleted by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      code: 'IMAGE_DELETION_ERROR'
    });
  }
});

// POST /api/gallery/:id/download - Track image download (public)
router.post('/:id/download', [
  param('id').isMongoId().withMessage('Invalid image ID')
], async (req, res) => {
  try {
    const image = await Gallery.findOne({ 
      _id: req.params.id, 
      isActive: true 
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND'
      });
    }

    await image.incrementDownloads();

    res.json({
      success: true,
      message: 'Download tracked successfully',
      data: {
        downloadUrl: image.secureUrl
      }
    });

  } catch (error) {
    console.error('Download tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track download',
      code: 'DOWNLOAD_TRACKING_ERROR'
    });
  }
});

module.exports = router;
