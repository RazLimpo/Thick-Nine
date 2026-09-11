const User = require("../models/User");
const Admin = require("../models/Admin");

/**
 * Resolves the authenticated marketplace User into an Admin identity.
 *
 * This middleware must run AFTER the generic auth middleware.
 *
 * Flow:
 * JWT → req.user.id → User → Admin → req.admin
 *
 * The User model remains the source of authentication.
 * The Admin model remains the source of admin role/permission data.
 */
module.exports = async function adminContext(req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // Load the authenticated marketplace user.
        const user = await User.findById(req.user.id).select(
            "fullName displayName email role"
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user account was not found."
            });
        }

        // The marketplace User must explicitly have admin access.
        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator privileges required."
            });
        }

        /*
         * Current Admin/User relationship:
         * Admin records do not yet contain a userId field.
         *
         * Therefore, email is used as the temporary bridge.
         * A permanent User._id → Admin.userId relationship can
         * be introduced later without changing authentication.
         */
        const admin = await Admin.findOne({
            email: user.email.toLowerCase().trim()
        }).select("+password");

        if (!admin) {
            return res.status(403).json({
                success: false,
                message: "Administrator profile not found."
            });
        }

        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: "Administrator account is inactive."
            });
        }

        /*
         * Keep authentication identity and admin authorization
         * separate.
         *
         * req.user = authenticated marketplace User
         * req.admin = Admin RBAC identity
         */
        req.user = {
            ...req.user,
            id: user._id.toString(),
            fullName: user.fullName,
            displayName: user.displayName,
            email: user.email,
            role: user.role
        };

        req.admin = {
            id: admin._id,
            userId: user._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: Array.isArray(admin.permissions)
                ? admin.permissions
                : [],
            isActive: admin.isActive
        };

        next();
    } catch (err) {
        console.error("Admin Context Middleware Error:", err);

        return res.status(500).json({
            success: false,
            message: "Server error while resolving administrator access."
        });
    }
};