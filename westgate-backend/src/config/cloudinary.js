const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'westgate-school',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload options
const uploadOptions = {
  folder: 'westgate-gallery',
  transformation: [
    { quality: 'auto', fetch_format: 'auto' },
    { width: 1920, height: 1080, crop: 'limit' }
  ],
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  resource_type: 'image'
};

// Different upload presets for different sizes
const uploadPresets = {
  thumbnail: {
    ...uploadOptions,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
  medium: {
    ...uploadOptions,
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  },
  large: {
    ...uploadOptions,
    transformation: [
      { width: 1920, height: 1080, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  }
};

// Helper function to upload image with multiple sizes
const uploadImageWithSizes = async (buffer, options = {}) => {
  const baseOptions = {
    ...uploadOptions,
    ...options
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      baseOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
};

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to generate different sized URLs
const generateImageUrls = (publicId) => {
  return {
    thumbnail: cloudinary.url(publicId, {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    }),
    medium: cloudinary.url(publicId, {
      width: 800,
      height: 600,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    }),
    large: cloudinary.url(publicId, {
      width: 1920,
      height: 1080,
      crop: 'limit',
      quality: 'auto',
      fetch_format: 'auto'
    }),
    original: cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto'
    })
  };
};

module.exports = {
  cloudinary,
  uploadOptions,
  uploadPresets,
  uploadImageWithSizes,
  deleteImage,
  generateImageUrls
};
