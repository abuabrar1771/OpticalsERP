import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  qtyReceived: { type: Number, required: true, min: 1 },
  purchasePricePerUnit: { type: Number, required: true }, // Cost Price (CP)
  sellingPricePerUnit: { type: Number, required: true },  // Retail Price (MRP)
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  itemSubtotal: { type: Number, required: true }
});

const purchaseInvoiceSchema = new mongoose.Schema({
  supplierName: { type: String, required: true, uppercase: true },
  supplierInvoiceNumber: { type: String, required: true, unique: true },
  purchaseDate: { type: Date, default: Date.now },
  items: [purchaseItemSchema],
  grossTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["Paid", "Pending", "Partial"], default: "Paid" },
  notes: { type: String }
}, { timestamps: true });

const purchaseModel = mongoose.models.purchase || mongoose.model("purchase", purchaseInvoiceSchema);
export default purchaseModel;