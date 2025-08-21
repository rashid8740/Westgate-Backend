const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import Admin model
const Admin = require('../src/models/Admin');

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Admin user not found. Creating new one...');
      
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const newAdmin = new Admin({
        username: 'admin',
        email: 'admin@westgate.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        isActive: true,
        isLocked: false,
        loginAttempts: 0,
        lastLogin: null
      });

      await newAdmin.save();
      console.log('New admin user created successfully!');
    } else {
      // Reset password
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      admin.password = hashedPassword;
      admin.isLocked = false;
      admin.loginAttempts = 0;
      admin.lastLogin = null;
      
      await admin.save();
      console.log('Admin password reset successfully!');
    }

    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('You can now login with these credentials');

  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetAdminPassword();
