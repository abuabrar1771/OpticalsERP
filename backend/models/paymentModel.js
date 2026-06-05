import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true, unique: true }, // e.g., PMT-1001
  date: { type: Date, required: true, default: Date.now },
  category: { 
    type: String, 
    required: true, 
    enum: [
      "Shop Rent", "Staff Salary", "Electricity Bill", "Telephone & Internet", 
      "Optical Lab Maintenance", "Office Expenses", "Supplier Payment", "Marketing & Ads"
    ]
  },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Card"], required: true },
  paidTo: { type: String, required: true },
  referenceNumber: { type: String, default: "" }, 
  notes: { type: String, trim: true }
}, { timestamps: true });

const paymentModel = mongoose.models.payment || mongoose.model("payment", paymentSchema, "payments");
export default paymentModel;