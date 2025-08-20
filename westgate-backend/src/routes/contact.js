const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { validateContact } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const { sendContactNotification, sendContactConfirmation } = require('../utils/email');

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

module.exports = router;
