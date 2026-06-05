import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true, unique: true }, // e.g., RCT-1001
  date: { type: Date, required: true, default: Date.now },
  category: { 
    type: String, 
    required: true, 
    enum: [
      "Credit Customer", "Bank Interest", "Optical Insurance Payout", "Scrap/Old Frame Sale", "Commission Received", "Other Income"
    ]
  },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Card"], required: true },
  receivedFrom: { type: String, required: true },
  referenceNumber: { type: String, default: "" }, 
  notes: { type: String, trim: true }
}, { timestamps: true });

const receiptModel = mongoose.models.receipt || mongoose.model("receipt", receiptSchema, "receipts");
export default receiptModel;