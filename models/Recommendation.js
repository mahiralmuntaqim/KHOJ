const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listings:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],

  // What signals drove this recommendation
  basedOn: {
    pastBookings:     [String],   // categories booked before
    viewedCategories: [String],   // categories browsed
    searchHistory:    [String],   // search terms used
    location:         String,     // user's location
    topRatedInArea:   Boolean,    // included because highly rated nearby
    popularThisWeek:  Boolean     // trending services
  },

  algorithm:   { type: String, default: 'hybrid' }, // 'collaborative', 'content', 'hybrid'
  score:       { type: Number, default: 0 },         // relevance score 0-100
  expiresAt:   { type: Date },                       // refresh after this date
}, { timestamps: true });

module.exports = mongoose.model('Recommendation', recommendationSchema);
