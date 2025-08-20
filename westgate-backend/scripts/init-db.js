#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const Admin = require('../src/models/Admin');
const Application = require('../src/models/Application');
const Message = require('../src/models/Message');
const Gallery = require('../src/models/Gallery');

// Sample data
const sampleApplications = [
  {
    studentFirstName: 'John',
    studentLastName: 'Doe',
    dateOfBirth: new Date('2010-05-15'),
    gender: 'male',
    nationality: 'Kenyan',
    program: 'primary',
    currentGrade: 'Grade 5',
    parentFirstName: 'Jane',
    parentLastName: 'Doe',
    relationship: 'parent',
    email: 'jane.doe@example.com',
    phone: '+254700000001',
    address: '123 Main Street',
    city: 'Nairobi',
    previousSchool: 'ABC Primary School',
    previousGrade: 'Grade 4',
    reasonForTransfer: 'Better educational opportunities',
    medicalConditions: 'None',
    specialNeeds: 'None',
    extracurriculars: 'Football, Piano',
    status: 'pending',
    source: 'website'
  },
  {
    studentFirstName: 'Alice',
    studentLastName: 'Smith',
    dateOfBirth: new Date('2008-12-20'),
    gender: 'female',
    nationality: 'British',
    program: 'secondary',
    currentGrade: 'Form 1',
    parentFirstName: 'Robert',
    parentLastName: 'Smith',
    relationship: 'parent',
    email: 'robert.smith@example.com',
    phone: '+254700000002',
    address: '456 Oak Avenue',
    city: 'Nairobi',
    previousSchool: 'XYZ International School',
    previousGrade: 'Grade 8',
    reasonForTransfer: 'Family relocation',
    medicalConditions: 'Asthma',
    specialNeeds: 'None',
    extracurriculars: 'Swimming, Drama',
    status: 'approved',
    source: 'website'
  }
];

const sampleMessages = [
  {
    firstName: 'Mary',
    lastName: 'Johnson',
    email: 'mary.johnson@example.com',
    phone: '+254700000003',
    subject: 'Inquiry about admission process',
    message: 'Hello, I would like to know more about the admission process for the early years program. What documents are required?',
    messageType: 'inquiry',
    status: 'unread',
    priority: 'medium',
    source: 'website'
  },
  {
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@example.com',
    phone: '+254700000004',
    subject: 'School tour request',
    message: 'I would like to schedule a school tour for next week. Please let me know available times.',
    messageType: 'inquiry',
    status: 'replied',
    priority: 'high',
    response: 'Thank you for your interest. We have slots available on Tuesday and Thursday at 10 AM. Please confirm your preferred time.',
    source: 'website'
  }
];

// Connect to database
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/westgate-school';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    console.log('🔄 Initializing database...\n');
    
    // Create default admin
    console.log('👤 Creating default admin account...');
    await Admin.createDefaultAdmin();
    
    // Create sample applications
    console.log('📝 Creating sample applications...');
    for (const appData of sampleApplications) {
      const existingApp = await Application.findOne({ email: appData.email });
      if (!existingApp) {
        const app = new Application(appData);
        await app.save();
        console.log(`   ✓ Created application: ${app.applicationNumber} - ${app.studentFullName}`);
      } else {
        console.log(`   ⚠ Application already exists for ${appData.email}`);
      }
    }
    
    // Create sample messages
    console.log('💬 Creating sample messages...');
    for (const msgData of sampleMessages) {
      const existingMsg = await Message.findOne({ email: msgData.email, subject: msgData.subject });
      if (!existingMsg) {
        const msg = new Message(msgData);
        await msg.save();
        console.log(`   ✓ Created message from: ${msg.fullName}`);
      } else {
        console.log(`   ⚠ Message already exists from ${msgData.email}`);
      }
    }
    
    // Create database indexes
    console.log('🔍 Creating database indexes...');
    await Application.createIndexes();
    await Message.createIndexes();
    await Gallery.createIndexes();
    await Admin.createIndexes();
    console.log('   ✓ Indexes created successfully');
    
    console.log('\n✅ Database initialization completed!');
    console.log('\n🔑 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: westgate2024');
    console.log('   Email: admin@westgate.ac.ke\n');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Cleanup database (optional)
const cleanupDatabase = async () => {
  try {
    console.log('🧹 Cleaning up database...');
    
    await Promise.all([
      Admin.deleteMany({}),
      Application.deleteMany({}),
      Message.deleteMany({}),
      Gallery.deleteMany({})
    ]);
    
    console.log('✅ Database cleaned up successfully');
    
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  await connectDB();
  
  switch (command) {
    case 'init':
      await initializeDatabase();
      break;
    case 'clean':
      await cleanupDatabase();
      break;
    case 'reset':
      await cleanupDatabase();
      await initializeDatabase();
      break;
    default:
      console.log('📋 Available commands:');
      console.log('   init  - Initialize database with sample data');
      console.log('   clean - Clean up all data');
      console.log('   reset - Clean and reinitialize database');
      console.log('\n💡 Usage: node scripts/init-db.js <command>');
      break;
  }
  
  await mongoose.connection.close();
  console.log('👋 Disconnected from MongoDB');
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
}

module.exports = {
  connectDB,
  initializeDatabase,
  cleanupDatabase
};