const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: { 
    type: String, 
    enum: ['admin', 'user'], 
    default: 'admin' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('✅ Password hashed successfully');
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw error;
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔍 Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);