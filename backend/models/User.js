const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const savedPlaceSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true }, // e.g. "Home", "Office", "School"
  address: { type: String, required: true, trim: true },
  barangay: { type: String, trim: true },
  landmark: { type: String, trim: true },
  latitude: { type: Number },
  longitude: { type: Number }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true,
    minlength: 3 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6,
    select: false 
  },
  phone: { 
    type: String, 
    required: true, 
    trim: true 
  },
  profileImage: { 
    type: String, 
    default: '/uploads/profiles/default-avatar.png' 
  },
  role: { 
    type: String, 
    enum: ['passenger', 'driver', 'admin', 'superadmin'], 
    default: 'passenger' 
  },
  accountStatus: { 
    type: String, 
    enum: ['active', 'pending', 'suspended', 'disabled'], 
    default: 'active' 
  },
  savedPlaces: [savedPlaceSchema],
  lastLogin: { type: Date }
}, { 
  timestamps: true 
});

// Additional Indexes
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });

// Password hashing middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Exclude password and sensitive info on serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
