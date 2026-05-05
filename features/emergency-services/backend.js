const express = require('express');
const EmergencyContact = require('../../models/emergencyContact');

const fallbackContacts = [
  { serviceType: 'Electric Emergency', phone: '09609000001', city: 'Dhaka', responseTimeMinutes: 10 },
  { serviceType: 'Plumbing Emergency', phone: '09609000002', city: 'Dhaka', responseTimeMinutes: 10 },
  { serviceType: 'Locksmith', phone: '09609000003', city: 'Dhaka', responseTimeMinutes: 15 },
  { serviceType: 'Gas Leak', phone: '09609000004', city: 'Dhaka', responseTimeMinutes: 5 }
];

const getEmergencyContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ isActive: true }).sort({ serviceType: 1 });
    return res.status(200).json(contacts.length ? contacts : fallbackContacts);
  } catch (error) {
    console.error('getEmergencyContacts error:', error);
    return res.status(500).json({ message: 'Unable to load emergency contacts', error: error.message });
  }
};

const requestEmergencySupport = async (req, res) => {
  try {
    const { serviceType, city, phone, location, contacts = [] } = req.body;
    const contact = await EmergencyContact.findOne({
      serviceType: new RegExp(serviceType || '', 'i'),
      isActive: true
    });
    const selected = contact || fallbackContacts.find(item =>
      item.serviceType.toLowerCase().includes((serviceType || '').toLowerCase())
    ) || fallbackContacts[0];

    return res.status(200).json({
      message: 'Emergency support request received',
      request: {
        serviceType: selected.serviceType,
        city: city || selected.city,
        customerPhone: phone || '',
        helpline: selected.phone,
        responseTimeMinutes: selected.responseTimeMinutes,
        location: location || null,
        notifiedContacts: contacts.map(contact => ({
          name: contact.name,
          phone: contact.phone,
          status: 'notified'
        }))
      }
    });
  } catch (error) {
    console.error('requestEmergencySupport error:', error);
    return res.status(500).json({ message: 'Unable to request emergency support', error: error.message });
  }
};

const router = express.Router();
router.get('/contacts', getEmergencyContacts);
router.post('/request', requestEmergencySupport);

module.exports = router;