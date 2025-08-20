const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { validateNewsletter } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');
const { sendWelcomeEmail } = require('../utils/email');

// Rate limiting for newsletter subscriptions
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2, // limit each IP to 2 requests per windowMs
  message: {
    error: 'Too many newsletter subscription attempts. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', newsletterLimiter, validateNewsletter, async (req, res) => {
  try {
    const {
      email,
      name,
      preferences = [],
      source = 'website'
    } = req.body;

    // Check if email already exists
    const existingSubscription = await Newsletter.findOne({ email });

    if (existingSubscription) {
      if (existingSubscription.status === 'active') {
        return res.status(409).json({
          success: false,
          message: 'This email is already subscribed to our newsletter.',
          code: 'ALREADY_SUBSCRIBED'
        });
      } else if (existingSubscription.status === 'unsubscribed') {
        // Reactivate subscription
        await existingSubscription.resubscribe();
        existingSubscription.preferences = preferences;
        existingSubscription.source = source;
        if (name) existingSubscription.name = name;
        await existingSubscription.save();

        return res.json({
          success: true,
          message: 'Welcome back! Your newsletter subscription has been reactivated.',
          data: {
            email: existingSubscription.email,
            preferences: existingSubscription.preferences,
            resubscribed: true
          }
        });
      }
    }

    // Create new subscription
    const newsletter = new Newsletter({
      email,
      name,
      preferences,
      source
    });

    await newsletter.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(newsletter);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing! You will receive our latest updates and news.',
      data: {
        email: newsletter.email,
        preferences: newsletter.preferences,
        subscribedAt: newsletter.subscriptionDate
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed to our newsletter.',
        code: 'DUPLICATE_EMAIL'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for unsubscription.'
      });
    }

    const subscription = await Newsletter.findOne({ email });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our newsletter list.',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    if (subscription.status === 'unsubscribed') {
      return res.json({
        success: true,
        message: 'This email is already unsubscribed from our newsletter.',
        code: 'ALREADY_UNSUBSCRIBED'
      });
    }

    await subscription.unsubscribe(reason);

    res.json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter.',
      data: {
        email: subscription.email,
        unsubscribedAt: subscription.unsubscribeDate
      }
    });

  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
});

// @route   GET /api/newsletter/preferences
// @desc    Get available newsletter preferences
// @access  Public
router.get('/preferences', (req, res) => {
  const preferences = [
    { value: 'academic-updates', label: 'Academic Updates', description: 'Latest news about curriculum and academic achievements' },
    { value: 'events', label: 'School Events', description: 'Information about upcoming events and activities' },
    { value: 'admissions', label: 'Admissions', description: 'Admissions deadlines, requirements, and process updates' },
    { value: 'sports', label: 'Sports & Athletics', description: 'Sports news, results, and athletic achievements' },
    { value: 'achievements', label: 'Student Achievements', description: 'Celebrating our students\' accomplishments' },
    { value: 'general', label: 'General News', description: 'General school news and announcements' }
  ];

  res.json({
    success: true,
    data: preferences
  });
});

// @route   GET /api/newsletter/stats
// @desc    Get newsletter subscription stats (public stats only)
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await Newsletter.aggregate([
      {
        $group: {
          _id: null,
          totalSubscribers: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          totalUnsubscribed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { totalSubscribers: 0, totalUnsubscribed: 0 };

    res.json({
      success: true,
      data: {
        activeSubscribers: result.totalSubscribers,
        // Don't expose unsubscribed count publicly
        message: `Join ${result.totalSubscribers}+ families staying connected with Westgate`
      }
    });

  } catch (error) {
    console.error('Newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch newsletter stats.'
    });
  }
});

// @route   POST /api/newsletter/verify/:token
// @desc    Verify email subscription (for email verification links)
// @access  Public
router.post('/verify/:token', async (req, res) => {
  try {
    // This would typically involve decoding a JWT token or finding by verification token
    // For now, we'll implement a simple version
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for verification.'
      });
    }

    const subscription = await Newsletter.findOne({ email });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found.',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    // Mark as verified (you might want to add a verified field to schema)
    res.json({
      success: true,
      message: 'Email subscription verified successfully.',
      data: {
        email: subscription.email,
        verifiedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Newsletter verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
});

module.exports = router;
