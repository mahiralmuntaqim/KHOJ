const Parcel = require('../models/parcel');

const fallbackParcel = {
  parcelId: 'KHJ-PCL-8841',
  status: 'in-transit',
  origin: 'Warehouse',
  destination: 'Your Address',
  currentLocation: 'Farmgate, Dhaka',
  eta: 'Today, 4-6 PM',
  events: [
    { label: 'Parcel created', location: 'Warehouse', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { label: 'Picked up', location: 'KHOJ Hub', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { label: 'In transit', location: 'Farmgate, Dhaka', timestamp: new Date(Date.now() - 30 * 60 * 1000) }
  ]
};

const getParcelTracking = async (req, res) => {
  try {
    const parcelId = req.params.parcelId.toUpperCase();
    const parcel = await Parcel.findOne({ parcelId }).populate('customer', 'name phone').populate('booking');

    if (!parcel && parcelId !== fallbackParcel.parcelId) {
      return res.status(404).json({ message: 'Parcel not found' });
    }

    return res.status(200).json(parcel || fallbackParcel);
  } catch (error) {
    console.error('getParcelTracking error:', error);
    return res.status(500).json({ message: 'Unable to load parcel tracking', error: error.message });
  }
};

const upsertParcelTracking = async (req, res) => {
  try {
    const { parcelId } = req.params;
    const parcel = await Parcel.findOneAndUpdate(
      { parcelId: parcelId.toUpperCase() },
      { ...req.body, parcelId: parcelId.toUpperCase() },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ message: 'Parcel tracking saved', parcel });
  } catch (error) {
    console.error('upsertParcelTracking error:', error);
    return res.status(500).json({ message: 'Unable to save parcel tracking', error: error.message });
  }
};

module.exports = {
  getParcelTracking,
  upsertParcelTracking
};
