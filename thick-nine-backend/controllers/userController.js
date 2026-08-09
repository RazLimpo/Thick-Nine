// controllers/userController.js
const User = require('../models/User');

/**
 * COMPATIBILITY HELPER: formatUserPayload
 * Ensures user responses consistently deliver complete metadata required by Next.js.
 */
const formatUserPayload = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const userAvatar = userObj.avatar || userObj.profilePicture || '';
  const userProfilePicture = userObj.profilePicture || userObj.avatar || '';

  return {
    id: userObj._id?.toString(),
    fullName: userObj.fullName,
    displayName: userObj.displayName || userObj.fullName,
    username: userObj.username,
    email: userObj.email,
    gender: userObj.gender,
    role: userObj.role || 'client',
    planType: userObj.planType || 'free',
    accountStrength: userObj.accountStrength || 80,
    isEmailVerified: Boolean(userObj.isEmailVerified),
    isProfileComplete: Boolean(userObj.isProfileComplete),
    avatar: userAvatar,
    profilePicture: userProfilePicture,
    location: userObj.location || { country: '', city: '' }
  };
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update authenticated user profile
 * @access  Private (Requires JWT auth middleware)
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const { fullName, gender, role, location, referralCode } = req.body;

    // Merge incoming update fields
    if (fullName) user.fullName = fullName.trim();
    if (gender) user.gender = gender;
    if (role) user.role = role;
    if (referralCode) user.referralCode = referralCode.trim();

    // Safely update location
    if (location) {
      user.location = {
        country: location.country || user.location?.country || '',
        city: location.city || user.location?.city || ''
      };
    }

    user.isProfileComplete = true;

    // Recalculate account strength if method exists
    if (typeof user.calculateStrength === 'function') {
      user.calculateStrength();
    } else {
      user.accountStrength = referralCode ? 85 : 80;
    }

    await user.save();

    const formattedUser = formatUserPayload(user);

    return res.status(200).json({
      message: "Profile updated successfully",
      user: formattedUser
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ message: "Server error while updating profile." });
  }
};