import paymentModel from "../models/paymentModel.js";
import receiptModel from "../models/receiptModel.js";
import invoiceModel from "../models/invoiceModel.js";
// 🌟 IMPORT YOUR NEW COUNTER ORDER MODEL HERE!
import CounterOrderModel from "../models/CounterOrder.js";

// Helper to safely generate clean auto-increment strings across isolated collections
const generateSequenceNumber = async (model, prefix) => {
  const count = await model.countDocuments();
  return `${prefix}${Date.now().toString().slice(-4)}${(count + 1).toString().padStart(3, "0")}`;
};

// A. SAVE NEW VOUCHER TRANSACTION (SEPARATED DATA POOLS)
export const addVoucher = async (req, res) => {
  try {
    const {
      type,
      date,
      category,
      amount,
      paymentMode,
      receivedByPaidTo,
      referenceNumber,
      notes,
    } = req.body;

    if (!type || !category || !amount || !receivedByPaidTo) {
      return res.json({
        success: false,
        message: "Required bookkeeping parameters missing.",
      });
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
        notes,
      });
      await newPayment.save();
      return res.json({
        success: true,
        message: `Payment Voucher ${voucherNumber} recorded in payments database!`,
      });
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
        notes,
      });
      await newReceipt.save();
      return res.json({
        success: true,
        message: `Receipt Voucher ${voucherNumber} recorded in receipts database!`,
      });
    }

    return res.json({
      success: false,
      message: "Invalid accounting voucher type requested.",
    });
  } catch (error) {
    console.error("Voucher Insertion Fault:", error);
    return res.json({ success: false, message: error.message });
  }
};

// B. QUERY CHRONOLOGICAL DAYBOOK REGISTRY (COMPILES 4 COLLECTIONS WITH TOTALS)
// B. QUERY CHRONOLOGICAL DAYBOOK REGISTRY WITH CONTINUOUS OPENING BALANCE LOOP
export const getDaybook = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const startOfToday = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfToday = new Date(targetDate.setHours(23, 59, 59, 999));

    // --- PHASE 1: LOOP & COMPUTE HISTORICAL CLOSING BALANCE (TODAY'S OPENING) ---
    // Look at all files created strictly BEFORE 00:00:00 AM of the selected date
    const historicalFilter = { date: { $lt: startOfToday } };
    const historicalInvoiceFilter = { createdAt: { $lt: startOfToday } };

    const [pastPayments, pastReceipts, pastRetailInvoices, pastCounterOrders] =
      await Promise.all([
        paymentModel.find(historicalFilter).lean(),
        receiptModel.find(historicalFilter).lean(),
        invoiceModel.find(historicalInvoiceFilter).lean(),
        CounterOrderModel.find(historicalInvoiceFilter).lean(),
      ]);

    let historicalInflow = 0;
    let historicalOutflow = 0;

    pastRetailInvoices.forEach(
      (inv) => (historicalInflow += Number(inv.totalAmount || 0)),
    );
    pastCounterOrders.forEach(
      (ord) => (historicalInflow += Number(ord.billing?.advancePaid || 0)),
    );
    pastReceipts.forEach(
      (rct) => (historicalInflow += Number(rct.amount || 0)),
    );
    pastPayments.forEach(
      (pmt) => (historicalOutflow += Number(pmt.amount || 0)),
    );

    const openingBalance = historicalInflow - historicalOutflow;

    // --- PHASE 2: COMPILE TODAY'S LEDGER ENTRIES ---
    const filter = { date: { $gte: startOfToday, $lte: endOfToday } };
    const invoiceFilter = {
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    const [payments, receipts, retailInvoices, counterOrders] =
      await Promise.all([
        paymentModel.find(filter).lean(),
        receiptModel.find(filter).lean(),
        invoiceModel.find(invoiceFilter).lean(),
        CounterOrderModel.find(invoiceFilter).lean(),
      ]);

    const compiledEntries = [];

    // 1. Map Retail Sales
    retailInvoices.forEach((inv) => {
      compiledEntries.push({
        id: inv._id,
        docNum: inv.invoiceNumber || "INV-SALE",
        particulars: `SALES COUNTER RECEIPT: ${inv.patientName.toUpperCase()}`,
        mode: inv.paymentMode || "Cash",
        inflow: Number(inv.totalAmount || 0),
        outflow: 0,
      });
    });

    // 2. Map Counter Advances
    counterOrders.forEach((order) => {
      const advance = Number(order.billing?.advancePaid || 0);
      if (advance > 0) {
        compiledEntries.push({
          id: order._id,
          docNum: order.invoiceNumber || "ORD-COUNTER",
          particulars: `COUNTER ORDER ADVANCE: ${order.patientName.toUpperCase()}`,
          mode: "Cash/Online",
          inflow: advance,
          outflow: 0,
        });
      }
    });

    // 3. Map Receipts
    receipts.forEach((rct) => {
      compiledEntries.push({
        id: rct._id,
        docNum: rct.voucherNumber,
        particulars: `${rct.category.toUpperCase()} (${rct.receivedFrom.toUpperCase()})`,
        mode: rct.paymentMode,
        inflow: Number(rct.amount || 0),
        outflow: 0,
      });
    });

    // 4. Map Expenses
    payments.forEach((pmt) => {
      compiledEntries.push({
        id: pmt._id,
        docNum: pmt.voucherNumber,
        particulars: `${pmt.category.toUpperCase()} (${pmt.paidTo.toUpperCase()})`,
        mode: pmt.paymentMode,
        inflow: 0,
        outflow: Number(pmt.amount || 0),
      });
    });

    // --- PHASE 3: DAILY LIVE BALANCING MATH ---
    let todaysInflow = 0;
    let todaysOutflow = 0;

    compiledEntries.forEach((entry) => {
      todaysInflow += entry.inflow;
      todaysOutflow += entry.outflow;
    });

    const closingBalance = openingBalance + todaysInflow - todaysOutflow;

    return res.json({
      success: true,
      entries: compiledEntries,
      summary: {
        openingBalance: Number(openingBalance.toFixed(2)),
        todaysInflow: Number(todaysInflow.toFixed(2)),
        todaysOutflow: Number(todaysOutflow.toFixed(2)),
        closingBalance: Number(closingBalance.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Daybook Loop Compilation Exception:", error);
    return res.json({ success: false, message: error.message });
  }
};

// C. COMPILE PROFIT & LOSS ANALYSIS STATEMENTS (PULLS FROM ALL ISOLATED COLLECTIONS)
export const getProfitLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.json({
        success: false,
        message: "Date bounds parameters required.",
      });
    }

    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

    const filter = { date: { $gte: start, $lte: end } };
    const invoiceFilter = { createdAt: { $gte: start, $lte: end } };

    const [payments, receipts, salesInvoices, counterOrders] =
      await Promise.all([
        paymentModel.find(filter).lean(),
        receiptModel.find(filter).lean(),
        invoiceModel.find(invoiceFilter).lean(),
        CounterOrderModel.find(invoiceFilter).lean(), // 🌟 Aggregate counter transactions too!
      ]);

    let tradingIncome = 0;
    let otherIncomeReceipts = 0;
    let costOfGoodsPurchased = 0;
    let otherOperatingExpenses = 0;
    const expenseBreakdown = {};

    // 1. Total Core Sales Income
    salesInvoices.forEach(
      (inv) => (tradingIncome += Number(inv.totalAmount || 0)),
    );

    // 🌟 2. Add Counter Booking Advances into Core Trading Income
    counterOrders.forEach(
      (order) => (tradingIncome += Number(order.billing?.advancePaid || 0)),
    );

    // 3. Total Independent Income Receipts
    receipts.forEach((rct) => (otherIncomeReceipts += Number(rct.amount || 0)));

    // 4. Total Independent Expenses Payments
    payments.forEach((pmt) => {
      const value = Number(pmt.amount || 0);
      if (pmt.category === "Supplier Payment") {
        costOfGoodsPurchased += value;
      } else {
        otherOperatingExpenses += value;
        expenseBreakdown[pmt.category] =
          (expenseBreakdown[pmt.category] || 0) + value;
      }
    });

    const netProfitOrLoss =
      tradingIncome +
      otherIncomeReceipts -
      (costOfGoodsPurchased + otherOperatingExpenses);

    return res.json({
      success: true,
      summary: {
        tradingIncome,
        otherIncomeReceipts,
        costOfGoodsPurchased,
        otherOperatingExpenses,
        netProfitOrLoss,
      },
      expenseBreakdown,
    });
  } catch (error) {
    console.error("P&L Statement Calculation Failure:", error);
    return res.json({ success: false, message: error.message });
  }
};
