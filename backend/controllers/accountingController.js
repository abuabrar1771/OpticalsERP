import paymentModel from "../models/paymentModel.js";
import receiptModel from "../models/receiptModel.js";
import invoiceModel from "../models/invoiceModel.js"; 

// Helper to safely generate clean auto-increment strings across isolated collections
const generateSequenceNumber = async (model, prefix) => {
  const count = await model.countDocuments();
  return `${prefix}${Date.now().toString().slice(-4)}${(count + 1).toString().padStart(3, "0")}`;
};

// A. SAVE NEW VOUCHER TRANSACTION (SEPARATED DATA POOLS)
export const addVoucher = async (req, res) => {
  try {
    const { type, date, category, amount, paymentMode, receivedByPaidTo, referenceNumber, notes } = req.body;

    if (!type || !category || !amount || !receivedByPaidTo) {
      return res.json({ success: false, message: "Required bookkeeping parameters missing." });
    }

    if (type === "Payment") {
      const voucherNumber = await generateSequenceNumber(paymentModel, "PMT-");
      const newPayment = new paymentModel({
        voucherNumber,
        date: new Date(date),
        category,
        amount: Number(amount),
        paymentMode,
        paidTo: receivedByPaidTo,
        referenceNumber,
        notes
      });
      await newPayment.save();
      return res.json({ success: true, message: `Payment Voucher ${voucherNumber} recorded in payments database!` });
      
    } else if (type === "Receipt") {
      const voucherNumber = await generateSequenceNumber(receiptModel, "RCT-");
      const newReceipt = new receiptModel({
        voucherNumber,
        date: new Date(date),
        category,
        amount: Number(amount),
        paymentMode,
        receivedFrom: receivedByPaidTo,
        referenceNumber,
        notes
      });
      await newReceipt.save();
      return res.json({ success: true, message: `Receipt Voucher ${voucherNumber} recorded in receipts database!` });
    }

    return res.json({ success: false, message: "Invalid accounting voucher type requested." });
  } catch (error) {
    console.error("Voucher Insertion Fault:", error);
    return res.json({ success: false, message: error.message });
  }
};

// B. QUERY CHRONOLOGICAL DAYBOOK REGISTRY (COMPILES 3 COLLECTIONS SIMULTANEOUSLY)
export const getDaybook = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const filter = { date: { $gte: start, $lte: end } };
    const invoiceFilter = { createdAt: { $gte: start, $lte: end } };

    // Query all 3 distinct document collections concurrently
    const [payments, receipts, retailInvoices] = await Promise.all([
      paymentModel.find(filter).lean(),
      receiptModel.find(filter).lean(),
      invoiceModel.find(invoiceFilter).lean()
    ]);

    const compiledEntries = [];

    // 1. Map Retail Sales Invoices
    retailInvoices.forEach((inv) => {
      compiledEntries.push({
        id: inv._id,
        docNum: inv.invoiceNumber || "INV-SALE",
        particulars: `SALES COUNTER RECEIPT: ${inv.patientName.toUpperCase()}`,
        mode: inv.paymentMode || "Cash",
        inflow: Number(inv.totalAmount || 0),
        outflow: 0
      });
    });

    // 2. Map Isolated Receipt Collections Documents
    receipts.forEach((rct) => {
      compiledEntries.push({
        id: rct._id,
        docNum: rct.voucherNumber,
        particulars: `${rct.category.toUpperCase()} (${rct.receivedFrom.toUpperCase()})`,
        mode: rct.paymentMode,
        inflow: Number(rct.amount || 0),
        outflow: 0
      });
    });

    // 3. Map Isolated Payment Expenses Documents
    payments.forEach((pmt) => {
      compiledEntries.push({
        id: pmt._id,
        docNum: pmt.voucherNumber,
        particulars: `${pmt.category.toUpperCase()} (${pmt.paidTo.toUpperCase()})`,
        mode: pmt.paymentMode,
        inflow: 0,
        outflow: Number(pmt.amount || 0)
      });
    });

    return res.json({ success: true, entries: compiledEntries });
  } catch (error) {
    console.error("Daybook Compilation Exception:", error);
    return res.json({ success: false, message: error.message });
  }
};

// C. COMPILE PROFIT & LOSS ANALYSIS STATEMENTS (PULLS FROM ALL ISOLATED COLLECTIONS)
export const getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.json({ success: false, message: "Date bounds parameters required." });
    }

    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const filter = { date: { $gte: start, $lte: end } };
    const invoiceFilter = { createdAt: { $gte: start, $lte: end } };

    const [payments, receipts, salesInvoices] = await Promise.all([
      paymentModel.find(filter).lean(),
      receiptModel.find(filter).lean(),
      invoiceModel.find(invoiceFilter).lean()
    ]);

    let tradingIncome = 0;
    let otherIncomeReceipts = 0;
    let costOfGoodsPurchased = 0;
    let otherOperatingExpenses = 0;
    const expenseBreakdown = {};

    // 1. Total Core Sales Income
    salesInvoices.forEach(inv => tradingIncome += Number(inv.totalAmount || 0));

    // 2. Total Independent Income Receipts
    receipts.forEach(rct => otherIncomeReceipts += Number(rct.amount || 0));

    // 3. Total Independent Expenses Payments
    payments.forEach((pmt) => {
      const value = Number(pmt.amount || 0);
      if (pmt.category === "Supplier Payment") {
        costOfGoodsPurchased += value; 
      } else {
        otherOperatingExpenses += value;
        expenseBreakdown[pmt.category] = (expenseBreakdown[pmt.category] || 0) + value;
      }
    });

    const netProfitOrLoss = (tradingIncome + otherIncomeReceipts) - (costOfGoodsPurchased + otherOperatingExpenses);

    return res.json({
      success: true,
      summary: { tradingIncome, otherIncomeReceipts, costOfGoodsPurchased, otherOperatingExpenses, netProfitOrLoss },
      expenseBreakdown
    });
  } catch (error) {
    console.error("P&L Statement Calculation Failure:", error);
    return res.json({ success: false, message: error.message });
  }
};