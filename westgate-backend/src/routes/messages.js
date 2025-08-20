const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const Message = require('../models/Message');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for message creation
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 messages per 15 minutes
  message: {
    success: false,
    message: 'Too many messages sent, please try again later.',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation rules
const createMessageValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Subject must be between 5 and 100 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('messageType')
    .optional()
    .isIn(['inquiry', 'complaint', 'suggestion', 'general'])
    .withMessage('Message type must be inquiry, complaint, suggestion, or general')
];

const updateMessageValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('status')
    .optional()
    .isIn(['unread', 'read', 'replied', 'resolved'])
    .withMessage('Status must be unread, read, replied, or resolved'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('response')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Response cannot exceed 2000 characters'),
  body('followUpRequired')
    .optional()
    .isBoolean()
    .withMessage('Follow-up required must be a boolean'),
  body('followUpDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Follow-up date must be a valid date'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

// POST /api/messages - Create new message (public)
router.post('/', createLimiter, createMessageValidation, async (req, res) => {
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

    // Create message with request metadata
    const message = new Message({
      ...req.body,
      source: 'website',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await message.save();

    console.log(`📧 New message received: ${message.fullName} - ${message.subject}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: {
          id: message._id,
          fullName: message.fullName,
          subject: message.subject,
          messageType: message.messageType,
          sentAt: message.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Message creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      code: 'MESSAGE_CREATION_ERROR'
    });
  }
});

// GET /api/messages - Get all messages (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      messageType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (messageType && messageType !== 'all') {
      filter.messageType = messageType;
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [messages, total] = await Promise.all([
      Message.find(filter)
        .populate('respondedBy', 'username')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Message.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages,
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
    console.error('Messages retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages',
      code: 'MESSAGES_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/messages/stats - Get message statistics (admin only)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const [
      totalMessages,
      unreadMessages,
      readMessages,
      repliedMessages,
      resolvedMessages,
      highPriorityMessages,
      recentMessages,
      typeStats,
      monthlyStats
    ] = await Promise.all([
      Message.countDocuments(),
      Message.countDocuments({ status: 'unread' }),
      Message.countDocuments({ status: 'read' }),
      Message.countDocuments({ status: 'replied' }),
      Message.countDocuments({ status: 'resolved' }),
      Message.countDocuments({ priority: { $in: ['high', 'urgent'] } }),
      Message.find().sort({ createdAt: -1 }).limit(5),
      Message.aggregate([
        { $group: { _id: '$messageType', count: { $sum: 1 } } }
      ]),
      Message.aggregate([
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
      message: 'Message statistics retrieved successfully',
      data: {
        overview: {
          total: totalMessages,
          unread: unreadMessages,
          read: readMessages,
          replied: repliedMessages,
          resolved: resolvedMessages,
          highPriority: highPriorityMessages
        },
        recentMessages,
        typeStats,
        monthlyStats
      }
    });

  } catch (error) {
    console.error('Message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve message statistics',
      code: 'STATS_RETRIEVAL_ERROR'
    });
  }
});

// GET /api/messages/:id - Get specific message (admin only)
router.get('/:id', verifyToken, [
  param('id').isMongoId().withMessage('Invalid message ID')
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

    const message = await Message.findById(req.params.id)
      .populate('respondedBy', 'username');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Mark as read if it's unread
    if (message.status === 'unread') {
      await message.markAsRead();
    }

    res.json({
      success: true,
      message: 'Message retrieved successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Message retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve message',
      code: 'MESSAGE_RETRIEVAL_ERROR'
    });
  }
});

// PUT /api/messages/:id - Update message (admin only)
router.put('/:id', verifyToken, updateMessageValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Handle response
    if (req.body.response && !message.response) {
      await message.respond(req.body.response, req.admin._id);
    } else {
      // Update other fields
      Object.keys(req.body).forEach(key => {
        if (key !== 'response') {
          message[key] = req.body[key];
        }
      });
      await message.save();
    }

    console.log(`📝 Message ${message._id} updated by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message: await Message.findById(req.params.id)
          .populate('respondedBy', 'username')
      }
    });

  } catch (error) {
    console.error('Message update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update message',
      code: 'MESSAGE_UPDATE_ERROR'
    });
  }
});

// PUT /api/messages/:id/respond - Respond to message (admin only)
router.put('/:id/respond', verifyToken, [
  param('id').isMongoId().withMessage('Invalid message ID'),
  body('response')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Response must be between 10 and 2000 characters')
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

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    await message.respond(req.body.response, req.admin._id);

    console.log(`💬 Response sent to message ${message._id} by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Response sent successfully',
      data: {
        message: await Message.findById(req.params.id)
          .populate('respondedBy', 'username')
      }
    });

  } catch (error) {
    console.error('Message response error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      code: 'MESSAGE_RESPONSE_ERROR'
    });
  }
});

// DELETE /api/messages/:id - Delete message (super admin only)
router.delete('/:id', verifyToken, requireRole('super_admin'), [
  param('id').isMongoId().withMessage('Invalid message ID')
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

    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    await Message.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Message ${message._id} deleted by ${req.admin.username}`);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Message deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      code: 'MESSAGE_DELETION_ERROR'
    });
  }
});

module.exports = router;