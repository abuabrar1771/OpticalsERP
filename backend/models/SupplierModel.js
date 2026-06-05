import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, uppercase: true, trim: true },
    gstinTaxId: { type: String, uppercase: true, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    mobile: { type: String, trim: true, default: "" },
    email: { type: String, lowercase: true, trim: true, default: "" },
    street: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true },
);

// Ensures rapid, unique indexing queries inside search bars
supplierSchema.index({ supplierName: "text" });

const supplierModel =
  mongoose.models.supplier ||
  mongoose.model("supplier", supplierSchema, "suppliers");
export default supplierModel;
