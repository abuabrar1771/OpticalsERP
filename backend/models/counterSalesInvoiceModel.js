import mongoose from 'mongoose';

// Sub-schema for individual items sold at the retail optical counter
const invoiceItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 }, // Percentage (e.g., 18 for 18% GST)
  total: { type: Number, required: true }, // (Price * Qty)

  // --- Optometry/Optical Specific Tracking Fields ---
  category: { type: String, default: "EYE_GLASS" },
  frameProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'product', default: null },
  lensType: { type: String, default: "Standard Non-Powered" },
  lensFeatures: { type: String, default: "None" },
  lensPrice: { type: Number, default: 0 },
  rightEyePower: {
    sph: { type: String, default: "0.00" },
    cyl: { type: String, default: "0.00" },
    axis: { type: String, default: "0" },
    add: { type: String, default: "0.00" },
    pd: { type: String, default: "60" }
  },
  leftEyePower: {
    sph: { type: String, default: "0.00" },
    cyl: { type: String, default: "0.00" },
    axis: { type: String, default: "0" },
    add: { type: String, default: "0.00" },
    pd: { type: String, default: "60" }
  }
});

const counterSalesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true
  },
  date: { type: Date, default: Date.now },
  customer: {
    name: { type: String, required: true, default: 'WALK-IN CUSTOMER' },
    phone: { type: String, required: true }
  },
  items: [invoiceItemSchema],
  subTotal: { type: Number, required: true, min: 0, default: 0 },
  taxAmount: { type: Number, required: true, min: 0, default: 0 },
  grandTotal: { type: Number, required: true, min: 0, default: 0 },
  
  // --- Payment Matrix Tracking ---
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Card', 'UPI', 'Mixed'], 
    default: 'Cash' 
  },
  advanceAmount: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  balanceAmount: { 
    type: Number, 
    default: 0 
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partially Paid', 'Unpaid'], 
    default: 'Unpaid' 
  }
}, { timestamps: true });

// --- Auto-calculate Balance and Collection Status Before Saving ---
// 🌟 FIX: Removed all arguments from the function entirely so Kareem won't wait for next()
counterSalesInvoiceSchema.pre('save', function() {
  const invoice = this;

  // Balance = Grand Total - Advance Paid
  invoice.balanceAmount = Math.max(0, Math.round(invoice.grandTotal - invoice.advanceAmount));

  // Automatically adjust payment status flags based on outstanding credit balances
  if (invoice.balanceAmount <= 0) {
    invoice.status = 'Paid';
    invoice.balanceAmount = 0; 
  } else if (invoice.advanceAmount > 0 && invoice.balanceAmount > 0) {
    invoice.status = 'Partially Paid';
  } else {
    invoice.status = 'Unpaid';
  }
});

// ES Module export to flawlessly bind with your controllers
const counterSalesInvoiceModel = mongoose.models.CounterSalesInvoice || mongoose.model('CounterSalesInvoice', counterSalesInvoiceSchema);

export default counterSalesInvoiceModel;