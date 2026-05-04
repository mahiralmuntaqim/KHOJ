const SearchHistory = require('../models/SearchHistory');

// ─────────────────────────────────────────────────────────────
// GET /api/search-history
// Protected – get logged-in user's recent searches
// Query: ?limit=10
// ─────────────────────────────────────────────────────────────
exports.getMySearchHistory = async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 10);

    // Return unique queries (most recent per query string)
    const history = await SearchHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 3) // fetch extra to deduplicate
      .lean();

    // Deduplicate by query string (keep most recent)
    const seen  = new Set();
    const unique = [];
    for (const item of history) {
      const key = item.query.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
        if (unique.length >= limit) break;
      }
    }

    res.status(200).json({ success: true, count: unique.length, history: unique });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch search history.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/search-history
// Protected – manually save a search query
// Body: { query, category, locationFilter }
// (Also called automatically by listingController on each search)
// ─────────────────────────────────────────────────────────────
exports.saveSearch = async (req, res) => {
  try {
    const { query, category, locationFilter } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'query is required.' });
    }

    const entry = await SearchHistory.create({
      user:           req.user._id,
      query:          query.trim(),
      category:       category       || '',
      locationFilter: locationFilter || '',
    });

    res.status(201).json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save search.' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/search-history
// Protected – clear all search history for the logged-in user
// ─────────────────────────────────────────────────────────────
exports.clearMySearchHistory = async (req, res) => {
  try {
    const result = await SearchHistory.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} search entries cleared.`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear search history.' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/search-history/:id
// Protected – delete a single search history entry
// ─────────────────────────────────────────────────────────────
exports.deleteSearchEntry = async (req, res) => {
  try {
    const entry = await SearchHistory.findOneAndDelete({
      _id:  req.params.id,
      user: req.user._id,
    });

    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    res.status(200).json({ success: true, message: 'Entry deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/search-history/popular
// Public – get top searched terms (for search suggestions)
// ─────────────────────────────────────────────────────────────
exports.getPopularSearches = async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit) || 8);

    const popular = await SearchHistory.aggregate([
      {
        $group: {
          _id:   { $toLower: '$query' },
          count: { $sum: 1 },
          query: { $last: '$query' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, query: 1, count: 1 } },
    ]);

    res.status(200).json({ success: true, popular });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch popular searches.' });
  }
};