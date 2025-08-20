const Joi = require('joi');

// Contact form validation schema
const contactSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),

  phone: Joi.string()
    .pattern(/^(\+254|0)[17]\d{8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid Kenyan phone number (e.g., +254722000000 or 0722000000)',
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required'
    }),

  message: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message cannot exceed 1000 characters',
      'any.required': 'Message is required'
    }),

  inquiryType: Joi.string()
    .valid('general', 'tour', 'admissions', 'academic', 'facilities')
    .required()
    .messages({
      'any.only': 'Please select a valid inquiry type',
      'any.required': 'Inquiry type is required'
    }),

  childAge: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Child age cannot exceed 50 characters'
    }),

  preferredProgram: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Preferred program cannot exceed 100 characters'
    }),

  preferredContactTime: Joi.string()
    .valid('morning', 'afternoon', 'evening', 'anytime')
    .optional()
    .default('anytime')
    .messages({
      'any.only': 'Please select a valid contact time preference'
    }),

  source: Joi.string()
    .valid('website', 'referral', 'social-media', 'advertisement', 'other')
    .optional()
    .default('website')
    .messages({
      'any.only': 'Please select a valid source'
    })
});

// Newsletter subscription validation schema
const newsletterSchema = Joi.object({
  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),

  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  preferences: Joi.array()
    .items(
      Joi.string().valid(
        'academic-updates',
        'events',
        'admissions',
        'sports',
        'achievements',
        'general'
      )
    )
    .optional()
    .default([])
    .messages({
      'array.includes': 'Please select valid preferences'
    }),

  source: Joi.string()
    .valid('website', 'event', 'referral', 'social-media', 'other')
    .optional()
    .default('website')
    .messages({
      'any.only': 'Please select a valid source'
    })
});

// Tour booking validation schema
const tourSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),

  phone: Joi.string()
    .pattern(/^(\+254|0)[17]\d{8}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid Kenyan phone number',
      'string.empty': 'Phone number is required',
      'any.required': 'Phone number is required'
    }),

  preferredDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Preferred date must be in the future',
      'any.required': 'Preferred date is required'
    }),

  preferredTime: Joi.string()
    .valid('morning', 'afternoon', 'evening', 'anytime')
    .optional()
    .default('anytime'),

  numberOfVisitors: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional()
    .messages({
      'number.min': 'Number of visitors must be at least 1',
      'number.max': 'Number of visitors cannot exceed 20'
    }),

  childAge: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow(''),

  additionalRequests: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Additional requests cannot exceed 500 characters'
    })
});

// Middleware function to validate contact form
const validateContact = (req, res, next) => {
  const { error, value } = contactSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware function to validate newsletter subscription
const validateNewsletter = (req, res, next) => {
  const { error, value } = newsletterSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware function to validate tour booking
const validateTour = (req, res, next) => {
  const { error, value } = tourSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  req.body = value;
  next();
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation helper for Kenyan numbers
const isValidKenyanPhone = (phone) => {
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone);
};

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Middleware to sanitize all string inputs
const sanitizeRequest = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
};

module.exports = {
  validateContact,
  validateNewsletter,
  validateTour,
  sanitizeRequest,
  isValidEmail,
  isValidKenyanPhone,
  sanitizeInput
};
