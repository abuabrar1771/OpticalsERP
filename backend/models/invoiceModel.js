import mongoose from "mongoose";

// Sub-schema to hold individual product specs inside a single invoice array
const invoiceItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  subCategory: { type: String },
  frameProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
  productName: { type: String, required: true },
  framePrice: { type: Number, default: 0 },
  lensType: { type: String, default: 'Standard Non-Powered' },
  lensFeatures: { type: String, default: 'None' },
  lensPrice: { type: Number, default: 0 },
  itemSubtotal: { type: Number, required: true },
  rightEyePower: { sph: String, cyl: String, axis: String, add: String, pd: String },
  leftEyePower: { sph: String, cyl: String, axis: String, add: String, pd: String }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  patientName: { type: String, required: true },
  patientMobile: { type: String, required: true },
  
  // Array matrix capable of storing infinite mix-and-match items together
  items: [invoiceItemSchema], 
  
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

const invoiceModel = mongoose.models.invoice || mongoose.model("invoice", invoiceSchema);
export default invoiceModel;