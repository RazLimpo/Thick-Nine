const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // 1. Get the token from the header
    const authHeader = req.header('Authorization');
    
    // Check if no header or token exists
    if (!authHeader) {
        return res.status(401).json({ msg: "No token detected. Authorization denied." });
    }

    // Handle both raw tokens and "Bearer <token>" formats safely
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    // 2. Verify the token signature
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add the authenticated user payload from the token to the request object
        req.user = decoded; 
        next(); // Move forward to the controller function safely
    } catch (err) {
        res.status(401).json({ msg: "Security token is invalid or has expired." });
    }
};