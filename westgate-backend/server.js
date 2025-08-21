const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth');
const applicationRoutes = require('./src/routes/applications');
const messageRoutes = require('./src/routes/messages');
const galleryRoutes = require('./src/routes/gallery');
const contactRoutes = require('./src/routes/contact');
const newsletterRoutes = require('./src/routes/newsletter');

// Import middleware
const { sanitizeRequest } = require('./src/middleware/validation');
const { testEmailConfig } = require('./src/utils/email');
const { optionalAuth } = require('./src/middleware/auth');

// Import models for initialization
const Admin = require('./src/models/Admin');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://westgateschool.ac.ke',
      'https://www.westgateschool.ac.ke',
      // Vercel domains - add your actual Vercel app URL here
      'https://westgate-frontend.vercel.app',
      'https://westgate-frontend-git-main-rashid8740s-projects.vercel.app',
      'https://westgate-frontend-rashid8740s-projects.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request sanitization
app.use(sanitizeRequest);

// Optional authentication middleware (adds req.admin if token provided)
app.use(optionalAuth);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', globalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Westgate School API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint (useful for platform uptime checks)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Westgate School Backend (API only). Use /api/* endpoints. Try /api/health.',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Do NOT serve frontend from backend on serverless (Vercel)
// The frontend is deployed separately. Only API routes are handled here.

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/westgate-school';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    
    // Create default admin account
    try {
      await Admin.createDefaultAdmin();
    } catch (error) {
      console.error('⚠️  Error creating default admin:', error.message);
    }
    
    // Test email configuration
    const emailConfigValid = await testEmailConfig();
    if (emailConfigValid) {
      console.log('✅ Email configuration is valid');
    } else {
      console.log('⚠️  Email configuration may have issues');
    }
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n📝 Received shutdown signal, closing HTTP server...');
  
  mongoose.connection.close(() => {
    console.log('📝 MongoDB connection closed.');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n📋 Available endpoints:`);
        console.log(`   🔐 POST /api/auth/login - Admin login`);
        console.log(`   🔐 POST /api/auth/verify-token - Verify token`);
        console.log(`   📝 GET  /api/applications - Get applications`);
        console.log(`   📝 POST /api/applications - Submit application`);
        console.log(`   💬 GET  /api/messages - Get messages`);
        console.log(`   💬 POST /api/messages - Submit message`);
        console.log(`   🖼️  GET  /api/gallery - Get gallery images`);
        console.log(`   🖼️  POST /api/gallery - Upload image (admin)`);
        console.log(`   📧 POST /api/contact - Submit contact form`);
        console.log(`   📬 POST /api/newsletter/subscribe - Subscribe`);
        console.log(`   🏥 GET  /api/health - Health check`);
        console.log(`\n🔑 Default admin credentials:`);
        console.log(`   Username: admin`);
        console.log(`   Password: westgate2024`);
      }
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;
