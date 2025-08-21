# Westgate School Website - Complete Setup Guide

This is a production-ready full-stack school management system with a beautiful frontend and robust backend API.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- Cloudinary account (for image uploads)

### 1. Backend Setup

```bash
cd westgate-backend
npm install
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/westgate-school
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Initialize database and start server:
```bash
npm run db:init
npm start
```

### 2. Frontend Setup

```bash
cd westgate-frontend
npm install
```

The frontend will automatically use `.env.local` which is already configured to connect to your backend.

Start the frontend:
```bash
npm run dev
```

## 🎯 What's Been Implemented

### ✅ **Professional Admin Login**
- **Clean, modern design** with professional styling
- **Real JWT authentication** connected to backend
- **Auto-redirect** when already authenticated
- **Error handling** with user-friendly messages
- **Loading states** with smooth animations
- **Auto-fill demo credentials** for testing

### ✅ **Fixed Application Form**
- **Connected to real backend API** 
- **Auto-generated application numbers** (e.g., WG20250001)
- **Complete form validation** on both frontend and backend
- **Professional styling** with proper field spacing
- **All required fields** properly implemented
- **Success messages** with application tracking numbers

### ✅ **Production-Ready Backend**
- **Express.js API** with comprehensive endpoints
- **MongoDB integration** with optimized schemas
- **JWT authentication** with role-based access
- **Rate limiting** and security middleware
- **File upload** with Cloudinary integration
- **Input validation** and error handling
- **Database initialization** scripts

### ✅ **Environment Configuration**
- **Development and production** environment files
- **Secure token handling** with proper storage
- **API base URLs** configurable per environment
- **Environment-specific settings** for deployment

## 🔐 Admin Access

**Default Admin Credentials:**
- **Username:** `admin`
- **Password:** `westgate2024`
- **Access:** `http://localhost:3000/admin/login`

> ⚠️ **Important:** Change these credentials in production!

## 🌟 Key Features Implemented

### Frontend
- **Mobile-first responsive design**
- **Modern, professional styling**
- **Smooth animations** with Framer Motion  
- **Real API integration** with error handling
- **Token-based authentication**
- **Form validation** and user feedback

### Backend  
- **RESTful API** with comprehensive endpoints
- **JWT authentication** with refresh capability
- **File upload** with Cloudinary storage
- **Database modeling** with Mongoose
- **Security middleware** (CORS, Helmet, Rate Limiting)
- **Input validation** with express-validator
- **Error handling** with descriptive messages
- **Logging** for debugging and monitoring

### Admin System
- **Applications Management** - View, filter, update status
- **Message Management** - Handle contact form inquiries  
- **Gallery Management** - Upload and organize images
- **User Authentication** - Secure login with role-based access
- **Analytics Dashboard** - Statistics and reporting

## 📱 What Works Now

1. **Login to Admin:** Visit `/admin/login` and use demo credentials
2. **Submit Applications:** The admissions form works with real backend storage
3. **View Admin Dashboard:** See real data from your database
4. **Upload Images:** Gallery system ready for Cloudinary integration
5. **Handle Messages:** Contact forms store in database

## 🚀 API Endpoints Available

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/logout` - Admin logout

### Applications  
- `GET /api/applications` - Get all applications (admin)
- `POST /api/applications` - Submit new application (public)
- `GET /api/applications/:id` - Get specific application
- `PUT /api/applications/:id/status` - Update application status

### Messages
- `GET /api/messages` - Get all messages (admin)
- `POST /api/messages` - Submit contact message (public)
- `PUT /api/messages/:id/respond` - Respond to message

### Gallery
- `GET /api/gallery` - Get gallery images (public)
- `POST /api/gallery` - Upload image (admin)
- `PUT /api/gallery/:id` - Update image details
- `DELETE /api/gallery/:id` - Delete image

### Health Check
- `GET /api/health` - API status check

## 🔧 Database Management

```bash
# Initialize database with sample data
npm run db:init

# Clean all data  
npm run db:clean

# Reset database (clean + init)
npm run db:reset
```

## 📊 What You Can Test Right Now

1. **Admin Login:** 
   - Go to `http://localhost:3000/admin/login`
   - Use `admin` / `westgate2024`
   - See real JWT token authentication

2. **Application Form:**
   - Go to `http://localhost:3000/admissions`
   - Fill and submit the form
   - Get real application number (WG20250001, etc.)
   - Data stores in MongoDB

3. **Admin Dashboard:**
   - After login, see real application data
   - View statistics and manage content

4. **API Testing:**
   ```bash
   # Test login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "westgate2024"}'
   
   # Test health check
   curl http://localhost:5000/api/health
   ```

## 🚀 Production Deployment

### Backend Deployment
1. Set up MongoDB Atlas or secure MongoDB instance
2. Configure Cloudinary for image storage  
3. Set production environment variables
4. Deploy to your preferred hosting (Railway, Heroku, Digital Ocean)

### Frontend Deployment
1. Update API URLs in environment
2. Build the production bundle
3. Deploy to Vercel, Netlify, or your hosting provider

### Environment Variables for Production
Copy `.env.production.example` files and configure:
- Strong JWT secrets
- Production database URLs
- Real email credentials
- Cloudinary production keys
- Production domain URLs

## ✨ What's Next

Your Westgate School website now has:
- ✅ **Real backend API** with full CRUD operations
- ✅ **Professional admin login** with JWT authentication  
- ✅ **Working application form** that stores to database
- ✅ **Production-ready architecture** with security
- ✅ **Mobile-first responsive design**
- ✅ **Environment configuration** for all deployments

The system is **production-ready** and can handle real student applications, admin management, and content updates immediately!

---

**🎓 Westgate School Management System - Ready for Production!**