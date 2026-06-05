import express from 'express';
import invoiceModel from '../models/invoiceModel.js'; 

const invoiceRouter = express.Router(); 

// 1. GET UNIQUE CUSTOMER LIST FOR THE SEARCH DROPDOWN
// Full URL: http://localhost:4000/api/invoice/customers/lookup
invoiceRouter.get('/customers/lookup', async (req, res) => {
  try {
    const customerList = await invoiceModel.aggregate([
      {
        $group: {
          _id: "$patientMobile",
          name: { $first: "$patientName" }, 
          mobile: { $first: "$patientMobile" }
        }
      },
      { $sort: { name: 1 } } 
    ]);
    res.json(customerList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. GET SINGLE CUSTOMER DETAILS & PRESCRIPTION FROM THEIR INVOICES
// Full URL: http://localhost:4000/api/invoice/customers/profile/:mobile
invoiceRouter.get('/customers/profile/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;

    // Fetch all invoices for this specific mobile number, newest first
    const invoices = await invoiceModel.find({ patientMobile: mobile }).sort({ createdAt: -1, date: -1 });

    if (invoices.length === 0) {
      return res.status(404).json({ message: "No invoices found for this customer." });
    }

    const latestInvoice = invoices[0];
    
    let rightEye = null;
    let leftEye = null;
    let latestLensSpecs = { type: 'Plain / Frame Only', features: 'None' };

    // 🌟 Search from newest to oldest invoice to grab the nested prescription parameters
    for (const inv of invoices) {
      if (!inv.items || inv.items.length === 0) continue;

      // Find the item that represents prescription wear (EYE_GLASS, POWERED_GLASS, or CONTACT_LENS)
      const itemWithPower = inv.items.find(item => 
        item.category === 'EYE_GLASS' || 
        item.category === 'POWERED_GLASS' || 
        item.category === 'CONTACT_LENS'
      );

      if (itemWithPower) {
        // 🛠️ Grab the prescription values safely directly from the document item instance
        rightEye = itemWithPower.rightEyePower;
        leftEye = itemWithPower.leftEyePower;
        latestLensSpecs = {
          type: itemWithPower.lensType || 'Standard',
          features: itemWithPower.lensFeatures || 'None'
        };
        break; // Found the newest medical record! Break out safely.
      }
    }

    // Map historical ledger items safely for your table rows view
    const history = invoices.map(inv => {
      let itemSummaryText = "No Items Listed";
      if (inv.items && inv.items.length > 0) {
        itemSummaryText = inv.items.map(i => `${i.category.replace('_', ' ')}: ${i.productName}`).join(' + ');
      }
      return {
        date: new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN'),
        invoiceNumber: inv.invoiceNumber,
        details: itemSummaryText,
        totalAmount: `₹${inv.totalAmount}`,
        paymentMode: inv.paymentMode
      };
    });

    const customerProfile = {
      name: latestInvoice.patientName,
      mobile: latestInvoice.patientMobile,
      lastVisit: new Date(latestInvoice.date || latestInvoice.createdAt).toLocaleDateString('en-IN'),
      history: history,
      prescription: {
        // 🌟 Safeguard: Pass formatting values down so your frontend grid fields can bind them instantly
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
// 3. NEWLY ADDED: FETCH ALL BILLS IN FULL FORMAT FOR THE SALES DASHBOARD
// Full URL: http://localhost:4000/api/invoice/all-sales-ledger
// ---------------------------------------------------------------------
invoiceRouter.get('/all-sales-ledger', async (req, res) => {
  try {
    const allInvoices = await invoiceModel.find({}).sort({ createdAt: -1 });
    res.json(allInvoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default invoiceRouter;