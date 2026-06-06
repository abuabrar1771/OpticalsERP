import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import cookieParser from 'cookie-parser'; 
import connectDB from './config/mongoDB.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import lensRouter from './routes/lensRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import inventoryRouter from './routes/inventoryRoute.js'; 
import invoiceRouter from './routes/invoiceRoute.js';
import userModel from "./models/userModels.js"; 
import bcrypt from "bcrypt";
import purchaseRouter from "./routes/purchaseRoutes.js";
import supplierRouter from "./routes/supplierRoutes.js";
import accountingRouter from "./routes/accountingRoutes.js";


// DNS Configuration
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

// App Initialization
const app = express();
const port = process.env.PORT || 4000;

// BULLETPROOF SEEDER FUNCTION
const seedAdminUser = async () => {
  try {
    const adminExists = await userModel.findOne({ mobileNum: process.env.ADMIN_MOBILENUM });

    if (!adminExists) {
      console.log("🌟 Admin record not found in MongoDB. Creating System Administrator account...");

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

      const newAdmin = new userModel({
        fullname: "System Administrator", 
        mobileNum: process.env.ADMIN_MOBILENUM,
        password: hashedPassword,
        role: "admin", 
      });

      await newAdmin.save();
      console.log("✅ Admin User Account successfully seeded into MongoDB!");
    } else {
      console.log("ℹ️ Admin User account already verified in MongoDB database.");
    }
  } catch (error) {
    console.error("⚠️ Failed to seed Admin User account automatically:", error.message);
  }
};

// UNIFIED STARTUP WRAPPER
const initializeApp = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");
    await seedAdminUser();
    connectCloudinary();
  } catch (err) {
    console.error("Critical initialization failure:", err.message);
  }
};
initializeApp();

// Middlewares
app.use(express.json());
app.use(cookieParser()); 

app.use(cors({
  origin: [
    'http://localhost:5174',   // admin
    "http://localhost:4000",
    "https://sacrifice-ravishing-nail.ngrok-free.dev" // <--- ADD YOUR NGROK URL HERE!
  ],
  credentials: true
}));
// Paste this right after your app.use(cors(...)) setup in server.js
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://sacrifice-ravishing-nail.ngrok-free.dev");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning");
  res.header("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
    return res.status(200).json({});
  }
  next();
});

// API Endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/lens', lensRouter);
app.use('/api/cart', cartRouter);
app.use("/api/order", orderRouter);
app.use('/api/inventory', inventoryRouter); 
app.use('/api/invoice', invoiceRouter);

app.use("/api/purchase", purchaseRouter);
app.use("/api/suppliers", supplierRouter);

app.use("/api/accounting", accountingRouter);


app.get('/', (req, res) => {
  res.send("API WORKING")
});

app.listen(port, () => console.log(`Server started on PORT: ${port}`));