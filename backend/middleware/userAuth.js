import jwt from 'jsonwebtoken';

const authUser = async (req, res, next) => {
    try {
        // 🌟 THE COOKIE + HEADER BRIDGE:
        // Reads the HttpOnly cookie token first, falls back to raw headers if passed
        const token = req.cookies?.token || req.headers?.token;

        // Prevent literal "true" string flags from sneaking into your cryptographic verifier
        if (!token || token === "true") {
            return res.json({ 
                success: false, 
                message: "Not Authorized. Your login session token is missing." 
            });
        }

        // Verify the secure token cryptographic payload against your JWT secret key
        const decoded_token = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🌟 CRITICAL: Extract the user ID parameter. 
        // Checks both your token payload structures (decoded_token.id or decoded_token.userId)
        const targetUserId = decoded_token.id || decoded_token.userId;

        if (!targetUserId) {
            return res.json({ success: false, message: "Authorization Failed. User references missing." });
        }

        // Inject the resolved userId straight into req.body so your existing controllers continue working flawlessly!
        req.body.userId = targetUserId; 
        
        next(); // Authorization success! Pass control safely down to your controller function.

    } catch (error) {
        console.error("User Auth Middleware Error:", error.message);
        return res.json({ 
            success: false, 
            message: "Session expired or invalid token. Please log in again." 
        });
    }
};

export default authUser;