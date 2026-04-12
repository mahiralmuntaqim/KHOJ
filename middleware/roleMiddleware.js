const User = require('../models/user');

// This function takes an array of allowed roles (e.g., ['admin', 'provider'])
exports.requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // For this demo, we read the user's ID from the request headers
            const userId = req.headers['user-id'];
            
            if (!userId) {
                return res.status(401).json({ error: "Access Denied: Please log in." });
            }

            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({ error: "User not found." });
            }

            // CHECK ROLE: Does the user's role match the allowed roles?
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ 
                    error: `Forbidden: This action requires one of these roles: ${allowedRoles.join(', ')}` 
                });
            }

            // If they pass, let them through to the controller!
            req.user = user;
            next();
        } catch (error) {
            res.status(500).json({ error: "Server error during role verification" });
        }
    };
};