import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModels.js";
import jwt from "jsonwebtoken";

// Helper function to sign and set a secure HttpOnly cookie
const sendAuthCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.cookie('token', token, {
    httpOnly: true, // Safeguards against cross-site scripting (XSS) scripts
    secure: process.env.NODE_ENV === 'production', // Delivers over HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-domain cookiess
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  return token;
};

// ---------------- 1. UNIFIED LOGIN (USERS & ADMIN) ----------------
const loginUser = async (req, res) => {
  try {
    const { mobileNum, password } = req.body;

    // 1. 🛡️ Check if the incoming credentials match the Environment Admin
    const envAdminMobile = process.env.ADMIN_MOBILENUM;
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (mobileNum === envAdminMobile && password === envAdminPassword) {
      // Create a specific hardcoded token payload for your environmental admin
      sendAuthCookie(res, { id: "ENV_ADMIN_ID", role: "admin" });

      return res.json({
        success: true,
        message: "Logged in successfully as System Administrator",
        user: {
          fullname: "Shop Owner (Admin)",
          mobileNum: envAdminMobile,
          role: "admin" // This enables your frontend UI conditional button!
        }
      });
      toast.message('Logged in successfully as System Admin')
    }

    // 2. 👥 Fallback to standard database lookup if it's not the env admin
    const user = await userModel.findOne({ mobileNum });
    if (!user) {
      return res.json({ success: false, message: "User doesn't exist" });
    }

    // Match the bcrypt passwords safely for regular database users
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    // Drop secure token cookie for normal users
    sendAuthCookie(res, { id: user._id, role: user.role });

    return res.json({
      success: true,
      message: "Logged in successfully",
      user: {
        fullname: user.fullname,
        mobileNum: user.mobileNum,
        role: user.role // Sends 'user' back (or 'admin' if seeded manually in DB)
      }
    });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

// ---------------- 2. USER SIGNUP / REGISTER ----------------
const registerUser = async (req, res) => {
  try {
    const { fullname, mobileNum, password } = req.body;
    
    // Check if phone profile is already registered
    const exists = await userModel.findOne({ mobileNum });
    if (exists) {
      return res.json({
        success: false,
        message: "The User already exists",
      });
    }

    // Form inputs structure validation
    if (!validator.isMobilePhone(mobileNum, "en-IN")) {
      return res.json({
        success: false,
        message: "Please Enter Valid Mobile Number",
      });
    }
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please Enter minimum 8 characters",
      });
    }

    // Hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      fullname,
      mobileNum,
      password: hashedPassword,
      role: 'user' // Clean, corrected field matching model
    });

    const user = await newUser.save();
    
    // Issue immediate login cookie right upon registration success
    sendAuthCookie(res, { id: user._id, role: user.role });

    return res.json({
      success: true,
      message: "Account Created Successfully",
      user: {
        fullname: user.fullname,
        mobileNum: user.mobileNum,
        role: user.role
      }
    });
  } catch (error) {
    return res.json({
      success: false,
      message: "Registration error: " + error.message,
    });
  }
};

// ---------------- 3. ADMIN LOGIN (LEGACY FALLBACK DEPRECATED) ----------------
// Keeps API stability intact if your admin client directly uses this route path still.
const adminLogin = async (req, res) => {
  // Routes traffic into the new secure unified lookup handler natively
  return loginUser(req, res);
};

// ---------------- 4. AUTHENTICATED PROFILE RECOVERY ----------------
const getUserData = async (req, res) => {
  try {
    const authUser = req.user; 

    if (!authUser || !authUser.id) {
      return res.status(401).json({ success: false, message: "Authorization Failed. User session details missing." });
    }

    // 🌟 ADD THIS CHECK FOR YOUR ENV ADMIN
    if (authUser.id === "ENV_ADMIN_ID" || authUser.role === "admin") {
      return res.json({ 
        success: true, 
        user: {
          fullname: "Shop Owner (Admin)",
          mobileNum: process.env.ADMIN_MOBILENUM,
          role: "admin"
        } 
      });
    }

    // Look up regular users in MongoDB as normal
    const user = await userModel.findById(authUser.id).select("-password");
    if (!user) {
      return res.json({ success: false, message: "User profile not found in database." });
    }

    return res.json({ 
      success: true, 
      user: {
        fullname: user.fullname,
        mobileNum: user.mobileNum,
        role: user.role
      } 
    });

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export { loginUser, registerUser, adminLogin, getUserData };