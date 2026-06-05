import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: true 
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
      name: String,
      price: Number,
      quantity: Number,
      image: String
    },
    { _id: false } // 👈 ADD THIS LINE HERE to stop Mongoose from generating/validating _id for items
  ],
  amount: { type: Number, required: true },
  address: { type: Object, required: true },
  status: { type: String, default: "Order Placed" },
  payment: { type: Boolean, default: false }, 
  paymentMethod: { type: String, default: 'COD' },
  paidAmount: { type: Number },
  date: { type: Date, default: Date.now }
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;