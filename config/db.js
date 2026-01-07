const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    // Log specific error types
    if (error.name === 'MongooseServerSelectionError') {
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Check MongoDB Atlas Network Access (whitelist IP)');
      console.error('   2. Verify database user credentials');
      console.error('   3. Ensure cluster is running');
      console.error('   4. Check connection string format');
    }
    
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

module.exports = connectDB;