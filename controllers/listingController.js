const Listing       = require('../models/Listing');
const SearchHistory = require('../models/SearchHistory');

// ─────────────────────────────────────────────────────────────
// HELPER: build a text-search + filter query object
// ─────────────────────────────────────────────────────────────
function buildQuery(reqQuery) {
  const filter = { isActive: true, isFlagged: false };

  if (reqQuery.type && ['service', 'rental'].includes(reqQuery.type)) {
    filter.type = reqQuery.type;
  }

  if (reqQuery.category && reqQuery.category.trim()) {
    filter.category = { $regex: reqQuery.category.trim(), $options: 'i' };
  }

  // String-based location: simple case-insensitive substring match
  if (reqQuery.location && reqQuery.location.trim()) {
    filter.location = { $regex: reqQuery.location.trim(), $options: 'i' };
  }

  if (reqQuery.minPrice || reqQuery.maxPrice) {
    filter.price = {};
    if (reqQuery.minPrice) filter.price.$gte = Number(reqQuery.minPrice);
    if (reqQuery.maxPrice) filter.price.$lte = Number(reqQuery.maxPrice);
  }

  // Keyword search across title, description, location, category
  if (reqQuery.q && reqQuery.q.trim()) {
    filter.$or = [
      { title:       { $regex: reqQuery.q.trim(), $options: 'i' } },
      { description: { $regex: reqQuery.q.trim(), $options: 'i' } },
      { location:    { $regex: reqQuery.q.trim(), $options: 'i' } },
      { category:    { $regex: reqQuery.q.trim(), $options: 'i' } },
    ];
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────
// GET /api/listings
// Public – browse / search listings
// Query params: q, type, category, location, minPrice, maxPrice,
//               sortBy, page, limit
// ─────────────────────────────────────────────────────────────
exports.getListings = async (req, res) => {
  try {
    const filter = buildQuery(req.query);

    let sort = { createdAt: -1 };
    const sortMap = {
      price_asc:  { price: 1 },
      price_desc: { price: -1 },
      rating:     { averageRating: -1 },
      newest:     { createdAt: -1 },
    };
    if (req.query.sortBy && sortMap[req.query.sortBy]) {
      sort = sortMap[req.query.sortBy];
    }

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip  = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate('provider', 'name phone badges nidVerification.status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    // Save search history fire-and-forget
    const searchTerm = (req.query.q || req.query.location || '').trim();
    if (searchTerm) {
      SearchHistory.create({
        user:           req.user?._id || null,
        query:          searchTerm,
        category:       req.query.category || '',
        locationFilter: req.query.location || '',
        resultCount:    total,
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: listings.length,
      listings,
    });
  } catch (err) {
    console.error('getListings error:', err);
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/search-by-location?location=Mirpur&type=service
// Public – location-string discovery (for "Services in your area")
// ─────────────────────────────────────────────────────────────
exports.searchByLocation = async (req, res) => {
  try {
    const { location, type, limit: rawLimit } = req.query;

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'location query parameter is required.' });
    }

    const filter = {
      isActive:  true,
      isFlagged: false,
      location:  { $regex: location.trim(), $options: 'i' },
    };

    if (type && ['service', 'rental'].includes(type)) {
      filter.type = type;
    }

    const limit = Math.min(20, parseInt(rawLimit) || 8);

    const listings = await Listing.find(filter)
      .populate('provider', 'name badges')
      .sort({ averageRating: -1 })
      .limit(limit)
      .lean();

    SearchHistory.create({
      user:           req.user?._id || null,
      query:          location.trim(),
      locationFilter: location.trim(),
      resultCount:    listings.length,
    }).catch(() => {});

    res.status(200).json({
      success:  true,
      location: location.trim(),
      count:    listings.length,
      listings,
    });
  } catch (err) {
    console.error('searchByLocation error:', err);
    res.status(500).json({ error: 'Location search failed.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/:id
// Public – single listing detail
// ─────────────────────────────────────────────────────────────
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('provider', 'name phone badges nidVerification.status');

    if (!listing) return res.status(404).json({ error: 'Listing not found.' });

    res.status(200).json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/listings
// Protected (provider only) – create listing
// ─────────────────────────────────────────────────────────────
exports.createListing = async (req, res) => {
  try {
    const { title, description, type, category, price, priceUnit, location, paymentOptions } = req.body;

    if (!title || !type || !category || price === undefined || !location) {
      return res.status(400).json({
        error: 'Required fields: title, type, category, price, location.',
      });
    }

    const listing = await Listing.create({
      provider: req.user._id,
      title,
      description: description || '',
      type,
      category,
      price:          Number(price),
      priceUnit:      priceUnit || 'session',
      location,
      paymentOptions: paymentOptions || ['cash'],
      imageUrl:       req.file?.path || '',
    });

    res.status(201).json({ success: true, message: 'Listing created.', listing });
  } catch (err) {
    console.error('createListing error:', err);
    res.status(500).json({ error: 'Failed to create listing.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings/my/all
// Protected (provider) – provider's own listings
// ─────────────────────────────────────────────────────────────
exports.getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: listings.length, listings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your listings.' });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/listings/:id
// Protected (provider) – update own listing
// ─────────────────────────────────────────────────────────────
exports.updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, provider: req.user._id });
    if (!listing) return res.status(404).json({ error: 'Listing not found or not yours.' });

    const allowed = ['title', 'description', 'category', 'price', 'priceUnit',
                     'location', 'paymentOptions', 'isActive'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) listing[field] = req.body[field];
    });
    if (req.file?.path) listing.imageUrl = req.file.path;

    await listing.save();
    res.status(200).json({ success: true, message: 'Listing updated.', listing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing.' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/listings/:id
// Protected (provider or admin)
// ─────────────────────────────────────────────────────────────
exports.deleteListing = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, provider: req.user._id };

    const listing = await Listing.findOneAndDelete(filter);
    if (!listing) return res.status(404).json({ error: 'Listing not found or not authorised.' });

    res.status(200).json({ success: true, message: 'Listing deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing.' });
  }
};
