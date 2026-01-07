const express = require('express');
const Vote = require('../models/Vote');
const Poll = require('../models/Poll');
const Session = require('../models/Session');
const router = express.Router();

// Submit Vote
router.post('/submit', async (req, res) => {
  try {
    const { pollId, sessionCode, optionIndex, voterName, isAnonymous } = req.body;
    
    const session = await Session.findOne({ sessionCode });
    const poll = await Poll.findById(pollId);
    
    if (!session || !poll || !poll.isActive) {
      return res.status(400).json({ message: 'Invalid poll or session' });
    }
    
    // Calculate response time
    const responseTime = new Date() - poll.timerStartedAt;
    
    const vote = await Vote.create({
      poll: pollId,
      session: session._id,
      optionIndex,
      voterName: isAnonymous ? null : voterName,
      isAnonymous,
      responseTime
    });
    
    // Update poll option votes
    poll.options[optionIndex].votes += 1;
    await poll.save();
    
    res.status(201).json({ vote, poll });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Session History with Votes
router.get('/session/:sessionId/history', async (req, res) => {
  try {
    const polls = await Poll.find({ session: req.params.sessionId });
    const votes = await Vote.find({ session: req.params.sessionId });
    
    const pollsWithVotes = polls.map(poll => ({
      ...poll.toObject(),
      votes: votes.filter(v => v.poll.toString() === poll._id.toString())
    }));
    
    res.json(pollsWithVotes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;