const User = require('../models/User');
const { isValidPhPhone } = require('../middleware/validationMiddleware');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (req.body.firstName) user.firstName = req.body.firstName.trim();
    if (req.body.lastName) user.lastName = req.body.lastName.trim();
    if (req.body.phone) {
      if (!isValidPhPhone(req.body.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Philippine phone number format',
          error: 'Validation failed'
        });
      }
      user.phone = req.body.phone.trim();
    }

    if (req.file) {
      user.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get saved places
// @route   GET /api/users/saved-places
// @access  Private
const getSavedPlaces = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user.savedPlaces || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a saved place
// @route   POST /api/users/saved-places
// @access  Private
const addSavedPlace = async (req, res, next) => {
  try {
    const { label, address, barangay, landmark, latitude, longitude } = req.body;

    if (!label || !address) {
      return res.status(400).json({
        success: false,
        message: 'Label and address are required',
        error: 'Validation failed'
      });
    }

    const user = await User.findById(req.user._id);
    user.savedPlaces.push({
      label,
      address,
      barangay: barangay || 'Tuguegarao City',
      landmark,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Place saved successfully',
      data: user.savedPlaces
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a saved place
// @route   PUT /api/users/saved-places/:id
// @access  Private
const updateSavedPlace = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const place = user.savedPlaces.id(req.params.id);

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Saved place not found',
        error: 'Not found'
      });
    }

    if (req.body.label) place.label = req.body.label.trim();
    if (req.body.address) place.address = req.body.address.trim();
    if (req.body.barangay) place.barangay = req.body.barangay.trim();
    if (req.body.landmark !== undefined) place.landmark = req.body.landmark.trim();
    if (req.body.latitude !== undefined) place.latitude = Number(req.body.latitude);
    if (req.body.longitude !== undefined) place.longitude = Number(req.body.longitude);

    await user.save();

    res.json({
      success: true,
      message: 'Saved place updated',
      data: user.savedPlaces
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved place
// @route   DELETE /api/users/saved-places/:id
// @access  Private
const deleteSavedPlace = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedPlaces.pull(req.params.id);
    await user.save();

    res.json({
      success: true,
      message: 'Saved place deleted',
      data: user.savedPlaces
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getSavedPlaces,
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace
};
