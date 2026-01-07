const express = require('express');
const Session = require('../models/Session');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const { protect } = require('../middleware/auth');
const { generateSessionCode } = require('../utils/sessionCode');
const router = express.Router();

// Create Session
router.post('/create', protect, async (req, res) => {
  try {
    console.log('📝 Create session request from user:', req.user._id);
    console.log('📦 Request body:', req.body);

    const { title } = req.body;

    if (!title || !title.trim()) {
      console.log('❌ Missing session title');
      return res.status(400).json({ message: 'Session title is required' });
    }

    // Generate unique session code
    let sessionCode = generateSessionCode();
    let existingSession = await Session.findOne({ sessionCode });

    // Ensure unique code
    while (existingSession) {
      sessionCode = generateSessionCode();
      existingSession = await Session.findOne({ sessionCode });
    }

    console.log('✅ Generated session code:', sessionCode);

    const session = await Session.create({
      admin: req.user._id,
      sessionCode,
      title: title.trim()
    });

    console.log('✅ Session created successfully:', session._id);

    res.status(201).json(session);
  } catch (error) {
    console.error('❌ Create session error:', error);
    res.status(500).json({ 
      message: 'Failed to create session',
      error: error.message 
    });
  }
});

// Join Session
router.post('/join', async (req, res) => {
  try {
    console.log('📝 Join session request:', req.body);

    const { sessionCode, name, isAnonymous } = req.body;

    if (!sessionCode) {
      return res.status(400).json({ message: 'Session code is required' });
    }

    if (!isAnonymous && (!name || !name.trim())) {
      return res.status(400).json({ message: 'Name is required for non-anonymous users' });
    }

    const session = await Session.findOne({ sessionCode, isActive: true });

    if (!session) {
      console.log('❌ Session not found or inactive:', sessionCode);
      return res.status(404).json({ message: 'Session not found or has ended' });
    }

    session.participants.push({ 
      name: isAnonymous ? 'Anonymous' : name.trim(), 
      isAnonymous 
    });
    await session.save();

    console.log('✅ User joined session:', sessionCode);

    res.json({ 
      session, 
      participantId: session.participants[session.participants.length - 1]._id 
    });
  } catch (error) {
    console.error('❌ Join session error:', error);
    res.status(500).json({ 
      message: 'Failed to join session',
      error: error.message 
    });
  }
});

// Get Session Details
// Get Session by ID (for admin)
router.get('/by-id/:sessionId', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate('admin', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.admin._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const polls = await Poll.find({ session: session._id });

    res.json({ session, polls });
  } catch (error) {
    console.error('❌ Get session by ID error:', error);
    res.status(500).json({ 
      message: 'Failed to get session',
      error: error.message 
    });
  }
});

// Get Admin Sessions (History)
router.get('/admin/history', protect, async (req, res) => {
  try {
    console.log('📝 Fetching session history for user:', req.user._id);

    const sessions = await Session.find({ admin: req.user._id })
      .sort({ createdAt: -1 });

    const sessionsWithStats = await Promise.all(sessions.map(async (session) => {
      const polls = await Poll.find({ session: session._id });
      const votes = await Vote.find({ session: session._id });

      return {
        ...session.toObject(),
        totalPolls: polls.length,
        totalVotes: votes.length,
        participantCount: session.participants.length
      };
    }));

    console.log('✅ Found', sessionsWithStats.length, 'sessions');

    res.json(sessionsWithStats);
  } catch (error) {
    console.error('❌ Get history error:', error);
    res.status(500).json({ 
      message: 'Failed to get session history',
      error: error.message 
    });
  }
});

// End Session
router.put('/:sessionId/end', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    console.log('✅ Session ended:', session._id);

    res.json(session);
  } catch (error) {
    console.error('❌ End session error:', error);
    res.status(500).json({ 
      message: 'Failed to end session',
      error: error.message 
    });
  }
});

module.exports = router;