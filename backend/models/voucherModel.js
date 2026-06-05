import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true, unique: true }, // e.g., VOU-2026-1001
  type: { type: String, enum: ["Payment", "Receipt"], required: true }, // Payment = Outgoing, Receipt = Incoming
  date: { type: Date, required: true, default: Date.now },
  category: { 
    type: String, 
    required: true, 
    enum: [
      // Outgoing Expenses Categories
      "Shop Rent", "Staff Salary", "Electricity Bill", "Telephone & Internet", 
      "Optical Lab Maintenance", "Office Expenses", "Supplier Payment", "Marketing & Ads",

      "Bank Interest", "Optical Insurance Payout", "Scrap/Old Frame Sale", "Commission Received", "Other Income"
    ]
  },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMode: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Card"], required: true },
  receivedByPaidTo: { type: String, required: true },
  referenceNumber: { type: String, default: "" }, 
  notes: { type: String, trim: true }
}, { timestamps: true });

const voucherModel = mongoose.models.voucher || mongoose.model("voucher", voucherSchema, "vouchers");
export default voucherModel;