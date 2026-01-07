const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  question: { type: String, required: true },
  options: [{
    text: String,
    votes: { type: Number, default: 0 }
  }],
  isActive: { type: Boolean, default: false },
  isLaunched: { type: Boolean, default: false },
  timer: { type: Number, default: 30 }, // seconds
  timerStartedAt: Date,
  allowAnonymous: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  closedAt: Date
});

module.exports = mongoose.model('Poll', pollSchema);