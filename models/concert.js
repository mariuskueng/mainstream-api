const mongoose = require('mongoose');

const ConcertSchema = mongoose.Schema({
  date: {
    type: Date,
  },
  artist: {
    type: String,
    trim: true,
  },
  venue: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
});

const Concert = mongoose.model('Concert', ConcertSchema);

module.exports = Concert;
