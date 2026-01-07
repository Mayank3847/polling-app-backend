const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration request received');
    console.log('📦 Request body:', req.body);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Please provide name, email and password' 
      });
    }

    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    console.log('🔍 Checking if user exists...');
    const userExists = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (userExists) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    console.log('✅ Creating new user...');
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    console.log('✅ User created successfully:', user._id);

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Token generated');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

    console.log('✅ Registration successful for:', email);

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'User already exists with this email' 
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: messages.join(', ') 
      });
    }

    res.status(500).json({ 
      message: 'Registration failed. Please try again.',
      error: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login request received');
    console.log('📦 Request body:', { email: req.body.email });

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Please provide email and password' 
      });
    }

    console.log('🔍 Finding user...');
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ User found:', user._id);
    console.log('🔐 Comparing passwords...');
    console.log('📝 Stored hash:', user.password.substring(0, 20) + '...');
    
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ Password valid');

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Login successful for:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.',
      error: error.message
    });
  }
});

module.exports = router;