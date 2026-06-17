import mongoose from "mongoose";

const daybookSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"], // Keeps tracking clean for accounting analytics
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Automatically manages createdAt and updatedAt fields
);

const DaybookModel = mongoose.models.daybook || mongoose.model("daybook", daybookSchema);

export default DaybookModel;