const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['customer','provider','admin'], default: 'customer' },
  avatar:   { type: String, default: '' },
  location: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isFlagged:{ type: Boolean, default: false },
  
  // ── NEW OTP FIELDS ──
  isPhoneVerified: { type: Boolean, default: false },
  otpCode:         { type: String },
  otpExpire:       { type: Date },
  
  badges:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  loyaltyPoints:{ type: Number, default: 0 },
  nidVerification: {
    nidNumber:    String,
    frontImageUrl:String,
    backImageUrl: String,
    status: { type: String, enum: ['unverified','pending','verified','rejected'], default: 'unverified' }
  },
  viewedCategories: [String],
  searchHistory:    [String],
  lastLogin:        Date
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.getToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'khoj_secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

module.exports = mongoose.model('User', userSchema);