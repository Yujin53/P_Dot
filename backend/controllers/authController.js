const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const Vehicle = require('../models/Vehicle');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { isValidEmail, isValidPhPhone } = require('../middleware/validationMiddleware');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'pdot_super_secret_jwt_key_tuguegarao_2026_xyz987', {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  });
};

// @desc    Register a new passenger
// @route   POST /api/auth/register
// @access  Public
const registerPassenger = async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, password, confirmPassword, phone } = req.body;

    if (!firstName || !lastName || !username || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required registration fields',
        error: 'Validation failed'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        error: 'Password mismatch'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        error: 'Password too short'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        error: 'Invalid email'
      });
    }

    if (!isValidPhPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Philippine mobile number (e.g. 09171234567 or +639171234567)',
        error: 'Invalid phone'
      });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        error: 'Email in use'
      });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken. Please choose another.',
        error: 'Username in use'
      });
    }

    let profileImage = '/uploads/profiles/default-avatar.png';
    if (req.file) {
      profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.create({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      phone,
      profileImage,
      role: 'passenger',
      accountStatus: 'active'
    });

    const token = generateToken(user._id);

    // Welcome Notification
    await createNotification({
      recipient: user._id,
      title: 'Welcome to P_Dot Tuguegarao!',
      message: `Mabuhay, ${user.firstName}! Your passenger account is active. You can now request rides across Tuguegarao City.`,
      type: 'general'
    });

    res.status(201).json({
      success: true,
      message: 'Passenger registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new driver application
// @route   POST /api/auth/register-driver
// @access  Public
const registerDriver = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      username,
      email,
      password,
      confirmPassword,
      phone,
      address,
      licenseReference,
      governmentIdReference,
      emergencyContactName,
      emergencyContactPhone,
      vehicleType,
      make,
      model,
      year,
      color,
      plateNumber,
      registrationReference,
      capacity
    } = req.body;

    if (!firstName || !lastName || !username || !email || !password || !phone || !licenseReference || !governmentIdReference || !plateNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required personal, driving, and vehicle fields',
        error: 'Validation failed'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        error: 'Password mismatch'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        error: 'Invalid email'
      });
    }

    if (!isValidPhPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Philippine mobile number for the driver',
        error: 'Invalid phone'
      });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        error: 'Email in use'
      });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken',
        error: 'Username in use'
      });
    }

    const plateExists = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (plateExists) {
      return res.status(409).json({
        success: false,
        message: 'A vehicle with this plate number is already registered',
        error: 'Plate in use'
      });
    }

    let profileImage = '/uploads/profiles/default-avatar.png';
    let documents = [];

    // Parse uploaded files if any
    if (req.files) {
      if (req.files.profileImage && req.files.profileImage[0]) {
        profileImage = `/uploads/profiles/${req.files.profileImage[0].filename}`;
      }
      if (req.files.licenseDoc && req.files.licenseDoc[0]) {
        documents.push({
          docType: 'driver_license',
          title: 'Driver License Document',
          filePath: `/uploads/driver-documents/${req.files.licenseDoc[0].filename}`
        });
      }
      if (req.files.govIdDoc && req.files.govIdDoc[0]) {
        documents.push({
          docType: 'government_id',
          title: 'Government ID Document',
          filePath: `/uploads/driver-documents/${req.files.govIdDoc[0].filename}`
        });
      }
      if (req.files.clearanceDoc && req.files.clearanceDoc[0]) {
        documents.push({
          docType: 'nbi_or_police_clearance',
          title: 'Clearance Document',
          filePath: `/uploads/driver-documents/${req.files.clearanceDoc[0].filename}`
        });
      }
    }

    // Create user with driver role
    const user = await User.create({
      firstName,
      lastName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      phone,
      profileImage,
      role: 'driver',
      accountStatus: 'active'
    });

    // Create driver profile (pending verification)
    const driverProfile = await DriverProfile.create({
      user: user._id,
      applicationStatus: 'pending',
      verificationStatus: 'pending',
      licenseReference,
      governmentIdReference,
      address: address || 'Tuguegarao City',
      emergencyContactName: emergencyContactName || 'N/A',
      emergencyContactPhone: emergencyContactPhone || phone,
      documents,
      isOnline: false
    });

    // Create vehicle
    const vehicle = await Vehicle.create({
      driver: driverProfile._id,
      vehicleType: vehicleType || 'tricycle',
      make: make || 'Honda',
      model: model || 'TMX 125',
      year: Number(year) || 2022,
      color: color || 'Black',
      plateNumber: plateNumber.toUpperCase(),
      registrationReference: registrationReference || 'ORCR-PENDING',
      capacity: Number(capacity) || (vehicleType === 'motorcycle' ? 1 : vehicleType === 'sedan' ? 4 : 3),
      verificationStatus: 'pending',
      isActive: true
    });

    const token = generateToken(user._id);

    // Notification to driver
    await createNotification({
      recipient: user._id,
      title: 'Driver Application Received',
      message: 'Your P_Dot driver application and vehicle details have been submitted. An administrator will review your credentials shortly.',
      type: 'driver_application'
    });

    // Audit log
    await logAudit({
      actor: user._id,
      action: 'DRIVER_APPLICATION_SUBMITTED',
      targetType: 'DriverProfile',
      targetId: driverProfile._id,
      description: `Driver ${user.firstName} ${user.lastName} submitted onboarding application`,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Driver application submitted successfully. Pending admin approval.',
      data: {
        user,
        driverProfile,
        vehicle,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log in user (passenger, driver, admin)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { loginId, password } = req.body; // loginId can be email or username

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password',
        error: 'Missing credentials'
      });
    }

    const cleanLoginId = loginId.trim().toLowerCase();

    // Query user including password field
    const user = await User.findOne({
      $or: [{ email: cleanLoginId }, { username: cleanLoginId }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username/email and password.',
        error: 'Invalid credentials'
      });
    }

    // Check account status
    if (user.accountStatus === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Your P_Dot account has been disabled. Please contact administrator.',
        error: 'Account disabled'
      });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your P_Dot account is currently suspended.',
        error: 'Account suspended'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your password.',
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    // Fetch extra role-specific data
    let driverProfile = null;
    let vehicle = null;

    if (user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: user._id });
      if (driverProfile) {
        vehicle = await Vehicle.findOne({ driver: driverProfile._id, isActive: true });
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        driverProfile,
        vehicle,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently authenticated user info
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let driverProfile = null;
    let vehicle = null;

    if (user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: user._id });
      if (driverProfile) {
        vehicle = await Vehicle.findOne({ driver: driverProfile._id, isActive: true });
      }
    }

    res.json({
      success: true,
      data: {
        user,
        driverProfile,
        vehicle
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords',
        error: 'Validation failed'
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
        error: 'Password mismatch'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
        error: 'Password too short'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
        error: 'Unauthorized'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (stateless acknowledgment)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  registerPassenger,
  registerDriver,
  login,
  getMe,
  changePassword,
  logout
};
