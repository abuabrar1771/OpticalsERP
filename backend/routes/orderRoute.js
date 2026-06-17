import express from 'express';
import CounterOrderModel from '../models/CounterOrder.js'; 
// import productModel from '../models/product.js'; // 🌟 Commented out temporarily to bypass crash

const orderRouter = express.Router();

// -------------------------------------------------------------------------
// 1. CREATE INITIAL COUNTER ORDER INVOICE WITH ADVANCE DEPOSIT
// -------------------------------------------------------------------------
orderRouter.post('/create-invoice', async (req, res) => {
  try {
    const {
      invoiceNumber,
      patientName,
      patientMobile,
      itemName,
      frameProduct,
      qty,
      price,
      lensType,
      lensPrice,
      lensFeatures,
      lensFeaturePrice,
      totalAmount,
      advancePaid,
      balanceDue,
      rightEyePower,
      leftEyePower
    } = req.body;

    if (!patientName || !patientMobile || !itemName) {
      return res.status(400).json({ success: false, message: "Missing baseline order attributes." });
    }

    // Construct and Save the Counter Order Document
    const newOrder = new CounterOrderModel({
      invoiceNumber,
      patientName,
      patientMobile,
      item: {
        name: itemName,
        frameProduct: frameProduct || null,
        qty: Number(qty),
        price: Number(price)
      },
      lensConfig: {
        type: lensType || "",
        price: Number(lensPrice || 0),
        features: lensFeatures || "None",
        featurePrice: Number(lensFeaturePrice || 0)
      },
      prescription: rightEyePower ? {
        rightEye: rightEyePower,
        leftEye: leftEyePower
      } : null,
      billing: {
        totalAmount,
        advancePaid: Number(advancePaid || 0),
        balanceDue: Number(balanceDue || 0)
      },
      status: 'Pending' // Explicitly fallback to initial queue status state
    });

    await newOrder.save();

    /* 🌟 COMMENTED OUT INVENTORY STEP TEMPORARILY TO BYPASS CRASH
    if (frameProduct) {
      const product = await productModel.findById(frameProduct);
      if (product) {
        if (product.stock < Number(qty)) {
          return res.status(400).json({ success: false, message: `Insufficient inventory.` });
        }
        product.stock -= Number(qty);
        await product.save();
      }
    }
    */
    
    return res.status(201).json({ 
      success: true, 
      message: "Counter booking record synchronized successfully!",
      order: newOrder
    });

  } catch (error) {
    console.error("MERN architecture storage processing fault:", error);
    return res.status(500).json({ success: false, message: "Database write error." });
  }
});

// -------------------------------------------------------------------------
// 2. LOOKUP ACTIVE PENDING JOBS BY PHONE FILTER
// -------------------------------------------------------------------------
orderRouter.get('/pending', async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number search filter parameter required." });
    }

    // Look for the newest matching invoice profile that is NOT completed/delivered yet
    const order = await CounterOrderModel.findOne({
      patientMobile: mobile.trim(),
      status: { $ne: 'Delivered' }
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.json({ success: false, message: "No active pending orders located for this mobile configuration." });
    }

    return res.json({ success: true, order });
  } catch (error) {
    console.error("Pending lookup lifecycle crash:", error);
    return res.status(500).json({ success: false, message: "Database lookup processing fault." });
  }
});

// -------------------------------------------------------------------------
// 3. COMPLETE DELIVERY COLLECTION HANDOVER LIFE CYCLE STEP
// -------------------------------------------------------------------------
orderRouter.post('/deliver-order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMode } = req.body; // Captured selection option: "Cash", "UPI / Online", "Card"

    const order = await CounterOrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Counter order profile record not found." });
    }

    if (order.status === 'Delivered') {
      return res.status(400).json({ success: false, message: "Halted! This invoice balance sheet is already closed and delivered." });
    }

    const finalCollectionAmount = order.billing.balanceDue;

    // Move final collection into accumulated pools, clear out due metric, change production status
    order.billing.advancePaid += finalCollectionAmount;
    order.billing.balanceDue = 0;
    order.status = 'Delivered';
    
    // Track final settlement method selection if needed
    order.paymentMode = paymentMode || "Cash";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status marked as Delivered and balance settled successfully!",
      order
    });
  } catch (error) {
    console.error("Delivery finalization processing exception:", error);
    return res.status(500).json({ success: false, message: "Database write failure during order delivery update." });
  }
});

export default orderRouter;