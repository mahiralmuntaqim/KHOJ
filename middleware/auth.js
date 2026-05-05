const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async function(req, res, next) {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'khoj_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

exports.requireRole = function() {
  var roles = Array.prototype.slice.call(arguments);
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }
    if (roles.indexOf(req.user.role) === -1) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    return next();
  };
};
