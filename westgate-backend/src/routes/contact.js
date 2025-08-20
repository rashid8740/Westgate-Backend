const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { validateContact } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const { sendContactNotification, sendContactConfirmation } = require('../utils/email');
const { verifyToken, requireRole } = require('../middleware/auth');

// Rate limiting for contact form submissions
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: {
    error: 'Too many contact form submissions. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post('/', contactLimiter, validateContact, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      message,
      inquiryType,
      childAge,
      preferredProgram,
      preferredContactTime,
      source
    } = req.body;

    // Create new contact submission
    const contact = new Contact({
      name,
      email,
      phone,
      message,
      inquiryType,
      childAge,
      preferredProgram,
      preferredContactTime,
      source: source || 'website'
    });

    await contact.save();

    // Send notification to admin
    try {
      await sendContactNotification(contact);
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the request if email fails
    }

    // Send confirmation to user
    try {
      await sendContactConfirmation(contact);
    } catch (emailError) {
      console.error('Failed to send user confirmation:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry. We will get back to you within 24 hours.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt,
        inquiryType: contact.inquiryType
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/contact/types
// @desc    Get inquiry types for form dropdown
// @access  Public
router.get('/types', (req, res) => {
  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'tour', label: 'School Tour Request' },
    { value: 'admissions', label: 'Admissions Information' },
    { value: 'academic', label: 'Academic Programs' },
    { value: 'facilities', label: 'Facilities & Services' }
  ];

  res.json({
    success: true,
    data: inquiryTypes
  });
});

// @route   GET /api/contact/programs
// @desc    Get available programs for form dropdown
// @access  Public
router.get('/programs', (req, res) => {
  const programs = [
    { value: 'early-years', label: 'Early Years (Nursery)' },
    { value: 'primary', label: 'Primary School' },
    { value: 'secondary', label: 'Secondary School' },
    { value: 'igcse', label: 'Cambridge IGCSE' },
    { value: 'a-level', label: 'Cambridge A-Level' }
  ];

  res.json({
    success: true,
    data: programs
  });
});

// @route   POST /api/contact/tour
// @desc    Book school tour (specific endpoint for tour requests)
// @access  Public
router.post('/tour', contactLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      preferredDate,
      preferredTime,
      numberOfVisitors,
      childAge,
      additionalRequests
    } = req.body;

    // Validation
    if (!name || !email || !phone || !preferredDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and preferred date are required for tour booking.'
      });
    }

    // Create contact with tour-specific data
    const contact = new Contact({
      name,
      email,
      phone,
      message: `Tour booking request for ${preferredDate} at ${preferredTime || 'flexible time'}. ${numberOfVisitors ? `Number of visitors: ${numberOfVisitors}. ` : ''}${childAge ? `Child age: ${childAge}. ` : ''}${additionalRequests ? `Additional requests: ${additionalRequests}` : ''}`,
      inquiryType: 'tour',
      childAge,
      preferredContactTime: preferredTime || 'anytime',
      source: 'website'
    });

    await contact.save();

    // Send notifications
    try {
      await sendContactNotification(contact, 'tour');
      await sendContactConfirmation(contact, 'tour');
    } catch (emailError) {
      console.error('Failed to send tour booking emails:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Tour request submitted successfully. We will confirm your appointment within 24 hours.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt,
        preferredDate,
        preferredTime
      }
    });

  } catch (error) {
    console.error('Tour booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book tour. Please try again later.'
    });
  }
});

// Admin endpoints

// @route   GET /api/contact/admin
// @desc    Get all contact submissions (admin only)
// @access  Private (Admin)
router.get('/admin', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      inquiryType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (inquiryType && inquiryType !== 'all') {
      filter.inquiryType = inquiryType;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Contact.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      message: 'Contact submissions retrieved successfully',
      data: {
        contacts,
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
    console.error('Contact retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact submissions',
      code: 'CONTACT_RETRIEVAL_ERROR'
    });
  }
});

// @route   GET /api/contact/admin/stats
// @desc    Get contact submission statistics (admin only)
// @access  Private (Admin)
router.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          contacted: { $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] } },
          followUp: { $sum: { $cond: [{ $eq: ['$status', 'follow-up'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }
      }
    ]);

    const inquiryTypeStats = await Contact.aggregate([
      {
        $group: {
          _id: '$inquiryType',
          count: { $sum: 1 }
        }
      }
    ]);

    const overview = stats[0] || {
      total: 0,
      new: 0,
      contacted: 0,
      followUp: 0,
      resolved: 0
    };

    res.json({
      success: true,
      message: 'Contact statistics retrieved successfully',
      data: {
        overview,
        inquiryTypes: inquiryTypeStats
      }
    });

  } catch (error) {
    console.error('Contact stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contact statistics',
      code: 'CONTACT_STATS_ERROR'
    });
  }
});

// @route   PUT /api/contact/admin/:id
// @desc    Update contact submission status/notes (admin only)
// @access  Private (Admin)
router.put('/admin/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    
    if (status === 'contacted') {
      updateData.responseDate = new Date();
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found',
        code: 'CONTACT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Contact submission updated successfully',
      data: { contact }
    });

  } catch (error) {
    console.error('Contact update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact submission',
      code: 'CONTACT_UPDATE_ERROR'
    });
  }
});

module.exports = router;
