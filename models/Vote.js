const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  optionIndex: { type: Number, required: true },
  voterName: String,
  isAnonymous: { type: Boolean, default: false },
  votedAt: { type: Date, default: Date.now },
  responseTime: Number // milliseconds from poll launch
});

module.exports = mongoose.model('Vote', voteSchema);