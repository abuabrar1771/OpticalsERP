import jwt from "jsonwebtoken";

const adminAuth = async (req, res, next) => {
  try {
    // 🌟 Secure Hook: Read the token directly from the HTTP-Only cookie layer
    const token = req.cookies?.token;
    
    if (!token) {
      return res.json({ 
        success: false, 
        message: "Access Denied: Administrative Session Token Missing." 
      });
    }

    // Decode and verify the cookie token against your JWT secret key
    const token_decode = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🛡️ Strict Role-Based Gatekeeper Check
    // Verifies that the token contains the 'admin' role assigned by MongoDB
    if (!token_decode || token_decode.role !== 'admin') {
      return res.json({
        success: false,
        message: "Access Denied: You do not have administrator permissions.",
      });
    }

    // Inject the decoded user details into the Request container for downstream tracking
    req.user = {
      id: token_decode.id,
      role: token_decode.role
    };

    next(); // Valid admin verified! Let the request move to the controller endpoint
  } catch (error) {
    console.error("Admin Auth Middleware Error:", error.message);
    return res.json({
      success: false,
      message: "Authentication failed: Invalid admin session data.",
    });
  }
};

export default adminAuth;