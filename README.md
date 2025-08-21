# 🎓 Westgate Group of Schools - Complete Website

A world-class, mobile-first educational website for Westgate Group of Schools that embodies excellence, trust, and academic distinction.

## 🌟 Project Overview

This is a comprehensive website solution featuring:
- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, and Framer Motion
- **Backend**: Node.js + Express + MongoDB with comprehensive API endpoints
- **Mobile-First Design**: Optimized for all devices with premium educational aesthetics
- **Lead Capture**: Advanced contact forms, newsletter subscriptions, and tour bookings
- **Performance Optimized**: Fast loading, SEO-friendly, and accessibility compliant

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB
- npm or yarn

### 1. Clone and Setup
```bash
cd Westgate
chmod +x start-dev.sh
./start-dev.sh
```

The script will automatically:
- Install all dependencies
- Create environment files
- Start MongoDB (if needed)
- Launch both frontend and backend servers

### 2. Manual Setup (Alternative)

#### Backend Setup
```bash
cd westgate-backend
npm install

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/westgate-school
JWT_SECRET=your-super-secret-jwt-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@westgateschool.ac.ke
PORT=5000
NODE_ENV=development" > .env

npm run dev
```

#### Frontend Setup
```bash
cd westgate-frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000" > .env.local

npm run dev
```

## 🎨 Brand Colors

```css
:root {
  --primary-red: #DC2626;
  --deep-burgundy: #7F1D1D;
  --warm-gold: #F59E0B;
  --charcoal-black: #1F2937;
  --pure-white: #FFFFFF;
  --light-gray: #F8FAFC;
  --success-green: #10B981;
}
```

## 📱 Features Implemented

### ✅ Core Features
- [x] **Mobile-First Responsive Design** - Perfect on all devices
- [x] **Complete 7-Page Structure** - Homepage, About, Academics, Admissions, Student Life, News, Contact
- [x] **Interactive Hero Section** - Carousel with CTAs and statistics
- [x] **Lead Capture Forms** - Contact forms with validation and email notifications
- [x] **Newsletter System** - Subscription management with preferences
- [x] **Professional Branding** - Consistent design system throughout

### ✅ Homepage Sections
- [x] **Hero Carousel** - Dynamic slides with school highlights
- [x] **Welcome Message** - Principal's message with school statistics
- [x] **Programs Preview** - Early Years, Primary, Secondary programs
- [x] **Testimonials** - Parent testimonials carousel
- [x] **News Section** - Latest updates and events
- [x] **Contact CTA** - Multiple contact methods and tour booking

### ✅ Technical Features
- [x] **Backend API** - Complete REST API with validation
- [x] **Database Models** - Contact, Newsletter, Gallery schemas
- [x] **Email System** - Automated confirmations and notifications
- [x] **Form Validation** - Client and server-side validation
- [x] **Rate Limiting** - Protection against spam and abuse
- [x] **SEO Optimization** - Meta tags, structured data ready

## 🏗️ Project Structure

```
westgate-school-website/
├── westgate-backend/           # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── models/            # Database schemas
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Validation, auth, etc.
│   │   └── utils/             # Email, helpers
│   ├── server.js              # Main server file
│   └── package.json
├── westgate-frontend/          # Next.js 14+ App Router
│   ├── src/
│   │   ├── app/               # Next.js app pages
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/            # Base UI components
│   │   │   ├── layout/        # Header, Footer
│   │   │   ├── sections/      # Page sections
│   │   │   └── forms/         # Form components
│   │   └── lib/               # Utilities
│   └── package.json
├── shared/                     # Shared types and utilities
├── start-dev.sh               # Development startup script
└── README.md
```

## 🔧 API Endpoints

### Contact Management
- `POST /api/contact` - Submit contact form
- `POST /api/contact/tour` - Book school tour
- `GET /api/contact/types` - Get inquiry types
- `GET /api/contact/programs` - Get available programs

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `GET /api/newsletter/preferences` - Get preference options
- `GET /api/newsletter/stats` - Get subscription stats

### Utilities
- `GET /api/health` - Health check endpoint

## 📧 Email Configuration

The system sends automated emails for:
- Contact form confirmations
- Newsletter welcome messages
- Admin notifications for new inquiries

Update the `.env` file with your email provider settings:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@westgateschool.ac.ke
```

## 🎯 Performance Targets

- **Lighthouse Score**: 95+
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Mobile Speed**: Optimized for 3G networks
- **SEO Score**: 100/100

## 📱 Mobile-First Approach

Breakpoints:
- **Mobile**: 320px-767px (Priority)
- **Tablet**: 768px-1023px
- **Desktop**: 1024px-1439px
- **Large Desktop**: 1440px+

## 🔐 Security Features

- **Input Sanitization** - XSS protection
- **Rate Limiting** - Prevents abuse
- **CORS Configuration** - Secure cross-origin requests
- **Helmet.js** - Security headers
- **Input Validation** - Joi schema validation

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd westgate-frontend
npm run build
# Deploy to Vercel
```

### Backend (Railway/Render)
```bash
cd westgate-backend
# Set environment variables on hosting platform
# Deploy using platform-specific method
```

### Database
- Use MongoDB Atlas for production
- Update `MONGODB_URI` in production environment

## 🎨 Design System

### Typography
- **Display**: Inter/Montserrat (Headlines)
- **Body**: Open Sans/Source Sans Pro
- **Accent**: Playfair Display (Quotes/testimonials)

### Components
- **Button**: Multiple variants with animations
- **Card**: Glass morphism effects
- **Forms**: Comprehensive validation
- **Navigation**: Mobile-optimized

## 📞 Contact Information

For questions about this implementation:
- **School**: Westgate Group of Schools
- **Email**: info@westgateschool.ac.ke
- **Phone**: +254 722 000 000

## 📄 License

This project is proprietary to Westgate Group of Schools.

---

**Westgate Group of Schools** - Excellence in Education Since 1995
