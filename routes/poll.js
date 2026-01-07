const express = require('express');
const Poll = require('../models/Poll');
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Create Poll
router.post('/create', protect, async (req, res) => {
  try {
    const { sessionId, question, options, timer, allowAnonymous } = req.body;
    
    const session = await Session.findById(sessionId);
    
    if (!session || session.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const poll = await Poll.create({
      session: sessionId,
      question,
      options: options.map(text => ({ text, votes: 0 })),
      timer: timer || 30,
      allowAnonymous: allowAnonymous !== undefined ? allowAnonymous : true
    });
    
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Launch Poll
router.put('/:pollId/launch', protect, async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId).populate('session');
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (poll.session.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Close any other active polls in this session
    await Poll.updateMany(
      { session: poll.session._id, isActive: true },
      { isActive: false, closedAt: new Date() }
    );
    
    poll.isActive = true;
    poll.isLaunched = true;
    poll.timerStartedAt = new Date();
    await poll.save();
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Active Poll for Session
router.get('/session/:sessionCode/active', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionCode: req.params.sessionCode });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const poll = await Poll.findOne({ session: session._id, isActive: true });
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Poll Results
router.get('/:pollId/results', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
