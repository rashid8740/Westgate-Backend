const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import Admin model
const Admin = require('../src/models/Admin');

async function migrateAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Set new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password directly using updateOne to avoid pre-save middleware
    const result = await Admin.updateOne(
      { username: 'admin' },
      { 
        $set: {
          password: hashedPassword,
          isLocked: false,
          loginAttempts: 0,
          lastLogin: null
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Admin password migrated successfully!');
      console.log('Username: admin');
      console.log('Password: admin123');
      
      // Verify the password works by fetching the updated admin
      const admin = await Admin.findOne({ username: 'admin' });
      if (admin) {
        const isValid = await admin.comparePassword(newPassword);
        console.log(`Password verification: ${isValid ? '✅ SUCCESS' : '❌ FAILED'}`);
      }
    } else {
      console.log('❌ No admin user found to update');
    }

  } catch (error) {
    console.error('Error migrating admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateAdminPassword();
}

module.exports = { migrateAdminPassword };
