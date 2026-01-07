const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionCode: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  participants: [{
    name: String,
    joinedAt: { type: Date, default: Date.now },
    isAnonymous: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  endedAt: Date
});

module.exports = mongoose.model('Session', sessionSchema);