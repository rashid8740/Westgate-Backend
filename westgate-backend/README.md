# Westgate School Backend API

A comprehensive RESTful API built with Express.js and MongoDB for managing Westgate School's website functionality including applications, messages, gallery, and admin management.

## Features

- 🔐 **Authentication & Authorization** - JWT-based admin authentication
- 📝 **Application Management** - Student application processing with full CRUD operations
- 💬 **Message Management** - Contact form messages with status tracking
- 🖼️ **Gallery Management** - Image upload and management with Cloudinary integration
- 📧 **Contact Forms** - Multiple contact form endpoints
- 📬 **Newsletter** - Subscription management
- 🛡️ **Security** - Rate limiting, input validation, CORS protection
- 📊 **Analytics** - Comprehensive statistics and reporting

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT)
- **File Upload:** Cloudinary
- **Validation:** Express-validator
- **Security:** Helmet, CORS, Rate limiting
- **Email:** Nodemailer

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for image uploads)

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd westgate-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/westgate-school
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   ```

4. **Initialize Database**
   ```bash
   npm run db:init
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000/api`

## Database Scripts

```bash
# Initialize database with sample data
npm run db:init

# Clean all data
npm run db:clean

# Reset database (clean + init)
npm run db:reset

# Show available commands
npm run db:help
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/profile` - Get admin profile
- `PUT /api/auth/change-password` - Change admin password

### Applications
- `GET /api/applications` - Get applications (admin only)
- `POST /api/applications` - Submit new application (public)
- `GET /api/applications/stats` - Get application statistics (admin only)
- `GET /api/applications/:id` - Get specific application (admin only)
- `PUT /api/applications/:id/status` - Update application status (admin only)
- `DELETE /api/applications/:id` - Delete application (super admin only)

### Messages
- `GET /api/messages` - Get messages (admin only)
- `POST /api/messages` - Submit new message (public)
- `GET /api/messages/stats` - Get message statistics (admin only)
- `GET /api/messages/:id` - Get specific message (admin only)
- `PUT /api/messages/:id` - Update message (admin only)
- `PUT /api/messages/:id/respond` - Respond to message (admin only)
- `DELETE /api/messages/:id` - Delete message (super admin only)

### Gallery
- `GET /api/gallery` - Get gallery images (public with optional admin filters)
- `POST /api/gallery` - Upload new image (admin only)
- `GET /api/gallery/stats` - Get gallery statistics (admin only)
- `GET /api/gallery/categories` - Get available categories (public)
- `GET /api/gallery/:id` - Get specific image (public)
- `PUT /api/gallery/:id` - Update image (admin only)
- `DELETE /api/gallery/:id` - Delete image (admin only)
- `POST /api/gallery/:id/download` - Track image download (public)

### Health Check
- `GET /api/health` - API health status

## Admin Credentials

Default admin account (created automatically):
- **Username:** `admin`
- **Password:** `westgate2024`
- **Email:** `admin@westgate.ac.ke`

> ⚠️ **Important:** Change these credentials in production!

## Data Models

### Admin
- Username, email, password (hashed)
- Role-based access (admin, super_admin)
- Account locking after failed attempts
- Login tracking

### Application
- Student information (name, DOB, grade, etc.)
- Parent/guardian information
- Previous school details
- Medical conditions and special needs
- Application status tracking
- Auto-generated application numbers

### Message
- Contact information
- Message content and type
- Status tracking (unread, read, replied, resolved)
- Priority levels
- Admin responses

### Gallery
- Image metadata and Cloudinary integration
- Categorization and tagging
- View and download tracking
- Featured image management
- SEO-friendly slugs

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Rate Limiting** - Prevents abuse with configurable limits
- **Input Validation** - Comprehensive request validation
- **CORS Protection** - Configurable cross-origin policies
- **Helmet Security** - Security headers and protections
- **Request Sanitization** - XSS and injection prevention
- **Account Locking** - Brute force protection

## File Upload

Images are uploaded to Cloudinary with:
- Automatic optimization (quality, format)
- Folder organization (`westgate-gallery/`)
- Size limits (10MB max)
- Format validation (images only)
- Cleanup on database failures

## Error Handling

- Comprehensive error responses
- Development vs production error details
- Mongoose validation error formatting
- JWT error handling
- CORS error handling
- Global error handler

## Development

### Project Structure
```
westgate-backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── validation.js    # Request validation
│   ├── models/
│   │   ├── Admin.js         # Admin model
│   │   ├── Application.js   # Application model
│   │   ├── Message.js       # Message model
│   │   └── Gallery.js       # Gallery model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── applications.js  # Application routes
│   │   ├── messages.js      # Message routes
│   │   └── gallery.js       # Gallery routes
│   └── utils/
│       └── email.js         # Email utilities
├── scripts/
│   └── init-db.js           # Database initialization
├── server.js                # Main server file
├── .env.example            # Environment template
└── package.json
```

### Adding New Features

1. **Create Model** (if needed) in `src/models/`
2. **Create Routes** in `src/routes/`
3. **Add Middleware** (if needed) in `src/middleware/`
4. **Register Routes** in `server.js`
5. **Update Database Script** if new collections

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No (default: 24h) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes (for images) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes (for images) |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes (for images) |

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure MongoDB Atlas or secure MongoDB instance
- [ ] Set up Cloudinary account
- [ ] Configure CORS origins
- [ ] Set up SSL/HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Change default admin credentials

### Docker Support (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Monitoring

The API includes:
- Health check endpoint (`/api/health`)
- Console logging for important operations
- Error tracking and reporting
- Request/response logging in development

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Check Cloudinary configuration for image uploads

## License

This project is proprietary software for Westgate School.

---

**Note:** This is a real-world application. Ensure proper security measures are in place before deploying to production.