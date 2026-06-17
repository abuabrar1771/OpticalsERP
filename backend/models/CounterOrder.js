import mongoose from 'mongoose';

const counterOrderSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  patientMobile: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Core Product Item Line
  item: {
    name: { type: String, required: true },
    frameProduct: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'product', // Make sure this matches your product model name string exactly
      default: null 
    },
    qty: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  // Lens Design Configurations
  lensConfig: {
    type: { type: String, default: "" },
    price: { type: Number, default: 0 },
    features: { type: String, default: "None" }, 
    featurePrice: { type: Number, default: 0 }
  },
  // Full Eye Diopter Matrix
  prescription: {
    rightEye: {
      sph: { type: String, default: "0.00" },
      cyl: { type: String, default: "0.00" },
      axis: { type: String, default: "0" },
      add: { type: String, default: "0.00" }
    },
    leftEye: {
      sph: { type: String, default: "0.00" },
      cyl: { type: String, default: "0.00" },
      axis: { type: String, default: "0" },
      add: { type: String, default: "0.00" }
    }
  },
  // Financial Accounting Ledger
  billing: {
    totalAmount: { type: String, required: true },
    advancePaid: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 }
  },
  status: {
    type: String,
    enum: ['Pending', 'In Lab', 'Ready', 'Delivered'],
    default: 'Pending'
  }
}, { timestamps: true });

// 🌟 OPTIONAL PRO-TIP: You can add a third argument to enforce a precise lowercase name in MongoDB
const CounterOrderModel = mongoose.model('CounterOrder', counterOrderSchema, 'counterorders');

// 🌟 FORCE EXPLICIT COLLECTION CREATION ON SERVER START
CounterOrderModel.createCollection()
  .then(() => console.log("🚀 MERN Sync: 'counterorders' collection verified/created successfully in MongoDB!"))
  .catch((err) => console.error("❌ Collection auto-creation failed: ", err));

export default CounterOrderModel;