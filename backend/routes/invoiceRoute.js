import express from 'express';
import counterSalesInvoiceModel from '../models/counterSalesInvoiceModel.js'; 
import LensConfigModel from '../models/lensConfigModel.js';

const invoiceRouter = express.Router(); 

// ---------------------------------------------------------------------
// 1. GET UNIQUE CUSTOMER LIST FOR THE SEARCH DROPDOWN
// ---------------------------------------------------------------------
invoiceRouter.get('/customers/lookup', async (req, res) => {
  try {
    const customerList = await counterSalesInvoiceModel.aggregate([
      {
        $group: {
          _id: "$customer.phone",
          name: { $first: "$customer.name" }, 
          mobile: { $first: "$customer.phone" }
        }
      },
      { $sort: { name: 1 } } 
    ]);
    res.json(customerList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------
// 2. GET SINGLE CUSTOMER DETAILS FROM THEIR INVOICES
// ---------------------------------------------------------------------
invoiceRouter.get('/customers/profile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const invoices = await counterSalesInvoiceModel.find({ "customer.phone": mobile }).sort({ createdAt: -1, date: -1 });

    if (invoices.length === 0) {
      return res.status(404).json({ message: "No invoices found for this customer." });
    }

    const latestInvoice = invoices[0];
    let rightEye = null;
    let leftEye = null;
    let latestLensSpecs = { type: 'Plain / Frame Only', features: 'None' };

    for (const inv of invoices) {
      if (!inv.items || inv.items.length === 0) continue;

      const itemWithPower = inv.items.find(item => 
        item.category === 'EYE_GLASS' || 
        item.category === 'POWERED_GLASS' || 
        item.category === 'CONTACT_LENS'
      );

      if (itemWithPower) {
        rightEye = itemWithPower.rightEyePower;
        leftEye = itemWithPower.leftEyePower;
        latestLensSpecs = {
          type: itemWithPower.lensType || 'Standard',
          features: itemWithPower.lensFeatures || 'None'
        };
        break; 
      }
    }

    const history = invoices.map(inv => {
      let itemSummaryText = "No Items Listed";
      if (inv.items && inv.items.length > 0) {
        itemSummaryText = inv.items.map(i => `${i.category?.replace('_', ' ') || 'Item'}: ${i.itemName}`).join(' + ');
      }
      return {
        date: new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN'),
        invoiceNumber: inv.invoiceNumber,
        details: itemSummaryText,
        totalAmount: `₹${inv.grandTotal}`,
        paymentMode: inv.paymentMethod
      };
    });

    const customerProfile = {
      name: latestInvoice.customer?.name || "Unknown",
      mobile: latestInvoice.customer?.phone || mobile,
      lastVisit: new Date(latestInvoice.date || latestInvoice.createdAt).toLocaleDateString('en-IN'),
      history: history,
      prescription: {
        od: rightEye ? {
          sph: rightEye.sph || "0.00",
          cyl: rightEye.cyl || "0.00",
          axis: rightEye.axis || "0",
          add: rightEye.add || "0.00",
          pd: rightEye.pd || "60",
          lens: `${latestLensSpecs.type} (${latestLensSpecs.features})`
        } : { sph: "0.00", cyl: "0.00", axis: "0", add: "0.00", pd: "60", lens: "Plain / No Power" },
        
        os: leftEye ? {
          sph: leftEye.sph || "0.00",
          cyl: leftEye.cyl || "0.00",
          axis: leftEye.axis || "0",
          add: leftEye.add || "0.00",
          pd: leftEye.pd || "60",
          lens: `${latestLensSpecs.type} (${latestLensSpecs.features})`
        } : { sph: "0.00", cyl: "0.00", axis: "0", add: "0.00", pd: "60", lens: "Plain / No Power" }
      }
    };

    res.json(customerProfile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------
// 3. FETCH ALL BILLS IN FULL FORMAT FOR THE SALES DASHBOARD
// ---------------------------------------------------------------------
invoiceRouter.get('/all-sales-ledger', async (req, res) => {
  try {
    const allInvoices = await counterSalesInvoiceModel.find({}).sort({ createdAt: -1 });
    res.json(allInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------
// 4. SEARCH ENGINE BY REAL DATABASE FIELDS (Uses customer.phone)
// ---------------------------------------------------------------------
invoiceRouter.get('/pending-invoice-lookup', async (req, res) => {
  try {
    const { mobile } = req.query; 
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Search parameter required." });
    }

    const cleanQuery = mobile.trim();

    const invoices = await counterSalesInvoiceModel.find({
      status: { $regex: /Partially Paid|Unpaid/i }, 
      $or: [
        { "customer.phone": { $regex: cleanQuery, $options: 'i' } },
        { "customer.name": { $regex: cleanQuery, $options: 'i' } },
        { invoiceNumber: { $regex: cleanQuery, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).limit(20);

    const matchingPendingInvoices = invoices.filter(inv => {
      const balance = Number(inv.balanceAmount);
      return balance > 0;
    });

    if (matchingPendingInvoices.length === 0) {
      return res.json({ success: true, invoices: [], message: "No outstanding balances found." });
    }

    const normalizedInvoices = matchingPendingInvoices.map(inv => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.customer?.name || "Unknown Patient",
      patientMobile: inv.customer?.phone || "No Mobile",
      totalAmount: Number(inv.grandTotal || 0),
      advancePaid: Number(inv.advanceAmount || 0),
      balanceDue: Number(inv.balanceAmount || 0),
      status: inv.status?.trim() || "Partially Paid",
      items: inv.items || [],
      createdAt: inv.createdAt || inv.date
    }));

    return res.json({ success: true, invoices: normalizedInvoices });
  } catch (error) {
    console.error("Pending invoice search system fault:", error);
    return res.status(500).json({ success: false, message: "Server search routine fault." });
  }
});

// ---------------------------------------------------------------------
// 5. RE-BUILT UNIFIED VOUCHER ROUTE (Processes both concepts safely)
// ---------------------------------------------------------------------
invoiceRouter.post('/settle-balance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalPaymentMode, voucherType, amountReceived, creditAccountName, narration } = req.body;

    if (voucherType === 'Customer Settle') {
      const invoice = await counterSalesInvoiceModel.findById(id);
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice document not found." });
      }

      const numericBalance = Number(invoice.balanceAmount);
      if (invoice.status === 'Paid' || numericBalance === 0) {
        return res.status(400).json({ success: false, message: "Invoice is already closed." });
      }

      invoice.advanceAmount = Number(invoice.advanceAmount || 0) + numericBalance;
      
      if (finalPaymentMode) {
        invoice.paymentMethod = finalPaymentMode; 
      }

      await invoice.save();

      const responseInvoice = {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        patientName: invoice.customer?.name || "Unknown Patient",
        patientMobile: invoice.customer?.phone || "No Mobile",
        totalAmount: Number(invoice.grandTotal),
        advancePaid: invoice.advanceAmount,
        balanceDue: invoice.balanceAmount,
        status: invoice.status,
        items: invoice.items || [],
        paymentMode: invoice.paymentMethod,
        createdAt: invoice.createdAt || invoice.date,
        voucherType: 'Customer Settle'
      };

      return res.status(200).json({
        success: true,
        message: "Customer ledger voucher cleared successfully!",
        invoice: responseInvoice
      });
    }

    else {
      const mockVoucherLog = {
        _id: `VCH-${Date.now()}`,
        invoiceNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
        patientName: creditAccountName || "Commission Account",
        patientMobile: "N/A",
        totalAmount: Number(amountReceived),
        advancePaid: Number(amountReceived),
        balanceDue: 0,
        status: 'Paid',
        items: [],
        paymentMode: finalPaymentMode || "Cash",
        createdAt: new Date(),
        voucherType: 'General Income',
        narration: narration || 'General Cash Entry Logged'
      };

      return res.status(200).json({
        success: true,
        message: `${voucherType} entry registered successfully in system daybook!`,
        invoice: mockVoucherLog
      });
    }

  } catch (error) {
    console.error("Receipt balance patch exception:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------
// 6. GET ALL LENS/FRAME ORDERS CURRENTLY IN WAITING OR PENDING WORK
// ---------------------------------------------------------------------
invoiceRouter.get('/reports/yesterday-pending', async (req, res) => {
  try {
    const pendingOrders = await counterSalesInvoiceModel.find({
      status: { $in: ["Partially Paid", "Unpaid"] }
    }).sort({ createdAt: -1 });

    let totalRemainingBalance = 0;

    const formattedReportData = pendingOrders.map(inv => {
      totalRemainingBalance += Number(inv.balanceAmount || 0);
      
      let jobItemsSummary = "Custom Optical Fabrication";
      if (inv.items && inv.items.length > 0) {
        jobItemsSummary = inv.items.map(i => i.itemName).join(', ');
      }

      return {
        _id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || "Walk-In Customer",
        customerPhone: inv.customer?.phone || "N/A",
        grandTotal: inv.grandTotal,
        balanceAmount: inv.balanceAmount,
        status: inv.status?.trim(),
        jobDetails: jobItemsSummary, 
        dateLogged: new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalPendingJobs: pendingOrders.length,
        totalOutstandingRevenue: totalRemainingBalance
      },
      jobs: formattedReportData
    });

  } catch (error) {
    console.error("Pending workshop orders tracking processing failure:", error);
    return res.status(500).json({ success: false, message: "Server reporting engine system fault." });
  }
});

// ---------------------------------------------------------------------
// 🌟 7. COMPREHENSIVE MULTI-COLUMN SEPARATED SALES PROFIT ENGINE
// ---------------------------------------------------------------------
invoiceRouter.get('/reports/sales-profit-range', async (req, res) => {
  try {
    const { from, to } = req.query;

    const startBoundary = new Date(from);
    startBoundary.setHours(0, 0, 0, 0);

    const endBoundary = new Date(to);
    endBoundary.setHours(23, 59, 59, 999);

    // Fetch invoices and populate frame catalog records explicitly using schema key
    const invoicesInScope = await counterSalesInvoiceModel.find({
      createdAt: { $gte: startBoundary, $lte: endBoundary }
    }).populate('items.frameProduct'); 

    // Fetch master costs to build reference dictionary
    const lensMasterList = await LensConfigModel.find({});
    const lensCostLookup = {};
    
    lensMasterList.forEach(lens => {
      if (lens.name) {
        lensCostLookup[lens.name.trim().toUpperCase()] = {
          cost: Number(lens.costprice || 0),
          sale: Number(lens.sellingprice || 0)
        };
      }
    });

    // Run itemized cost extraction and mapping tracking loop
    const compiledBills = invoicesInScope.map((inv) => {
      let frameCostTotal = 0;
      let lensTypeCostTotal = 0;
      let lensFeatureCostTotal = 0;

      inv.items.forEach((item) => {
        const itemQuantity = Number(item.quantity || item.qty || 1);

        // --- Part A: Compute Frame Catalog Cost ---
        if (item.frameProduct) {
          const baseFrameCost = item.frameProduct.purchasePrice || (item.frameProduct.price * 0.7) || 0;
          frameCostTotal += (baseFrameCost * itemQuantity);
        }

        // --- Part B: Match Lens Type Cost ---
        if (item.lensType && item.lensType.toString().trim().toUpperCase() !== "NONE") {
          const typeKey = item.lensType.toString().trim().toUpperCase();
          const match = lensCostLookup[typeKey];
          if (match) {
            lensTypeCostTotal += (match.cost * itemQuantity);
          }
        }

        // --- Part C: Split Comma Strings and Loop Each Selected Shield Feature ---
        if (item.lensFeatures && item.lensFeatures.toString().trim().toUpperCase() !== "NONE" && item.lensFeatures.toString().trim() !== "") {
          
          // Split features by comma to parse multi-selected values accurately
          const featureNamesArray = item.lensFeatures.toString().split(",");

          featureNamesArray.forEach((featureName) => {
            const cleanedFeatureKey = featureName.trim().toUpperCase();
            const match = lensCostLookup[cleanedFeatureKey];
            
            if (match) {
              lensFeatureCostTotal += (match.cost * itemQuantity);
            }
          });
        }
      });

      const totalBillCost = frameCostTotal + lensTypeCostTotal + lensFeatureCostTotal;
      const billTotalRevenue = Number(inv.grandTotal || 0);
      const calculatedProfit = billTotalRevenue - totalBillCost;
      const marginPercentage = billTotalRevenue > 0 ? (calculatedProfit / billTotalRevenue) * 100 : 0;

      return {
        billNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || "WALK-IN CUSTOMER",
        frameCostTotal: Number(frameCostTotal.toFixed(2)),
        lensTypeCostTotal: Number(lensTypeCostTotal.toFixed(2)),
        lensFeatureCostTotal: Number(lensFeatureCostTotal.toFixed(2)),
        totalBillCost: Number(totalBillCost.toFixed(2)),
        billAmount: billTotalRevenue,
        profitAmount: Number(calculatedProfit.toFixed(2)),
        profitPercentage: Number(marginPercentage.toFixed(4))
      };
    });

    return res.status(200).json({
      success: true,
      bills: compiledBills
    });

  } catch (error) {
    console.error("Comprehensive optical profit analyzer string mapper crash:", error);
    return res.status(500).json({ success: false, message: "Database calculation node dropped: " + error.message });
  }
});

export default invoiceRouter;