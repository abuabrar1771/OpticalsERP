import userModel from "../models/userModels.js";
import orderModel from "../models/OrderModel.js";
import productModel from "../models/productModel.js"; // 🌟 Added import for stock lookup
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize with your keys (Keep Secret Key in your backend .env!)
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------------------------------------------------------------------
// 🌟 UNIFIED STOCK DEDUCTION ENGINE HELPER
// ---------------------------------------------------------------------
// Loops through items, checking if they are a standard base model or nested matrix variant
const deductInventoryStock = async (items) => {
  try {
    if (!items || items.length === 0) return;

    const operations = items.map(async (item) => {
      // Extract target properties. Fallback to item._id if productId isn't explicitly passed
      const productId = item.productId || item._id; 
      const deductionAmount = Number(item.quantity || 1);

      if (!productId) return;

      if (!item.isVariant) {
        // Option A: Deduct stock from a standard physical item (Frames, Sunglasses, Accessories)
        await productModel.findByIdAndUpdate(
          productId,
          { $inc: { stock: -deductionAmount } }
        );
      } else if (item.isVariant && item.variantSku) {
        // Option B: Deduct stock from a specialized lens/contact matrix entry matching variantSku
        await productModel.findOneAndUpdate(
          { _id: productId, "variants.sku": item.variantSku },
          { $inc: { "variants.$.stock": -deductionAmount } }
        );
      }
    });

    await Promise.all(operations);
    console.log(`📦 Inventory updated: Successfully deducted quantities for ${items.length} items.`);
  } catch (error) {
    // Log to console, but don't crash payment routes if an unexpected inventory calculation mismatch happens
    console.error("🚨 Critical inventory reduction alert error:", error.message);
  }
};

// Helper function to sanitize items and remove invalid string IDs (like "0")
const sanitizeOrderItems = (itemsArray) => {
  if (!itemsArray) return [];
  return itemsArray.map(item => {
    const cleanItem = { ...item };
    // If _id exists but isn't a valid 24-character hex MongoDB ID, delete it
    if (cleanItem._id && cleanItem._id.length !== 24) {
      delete cleanItem._id;
    }
    return cleanItem;
  });
};

// 1. Place Order via COD
const placeOrder = async (req, res) => {
  try {
    const userId = req.body.userId || req.userId; 
    const { address, items, amount } = req.body; 

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized access. User identity missing." });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    let rawItems = items && items.length > 0 ? items : user.cartData;

    if (!rawItems || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cannot place order: Cart data is empty." });
    }

    // ─── FIX: SANITIZE ITEMS BEFORE PASSING TO MONGOOSE ───
    const sanitizedItems = sanitizeOrderItems(rawItems);

    const order = new orderModel({
      userId,
      items: sanitizedItems, 
      amount: amount, 
      address,
      paymentMethod: req.body.paymentMethod || "cod",
      payment: req.body.paymentMethod === "cod" ? false : true,
      status: "Processing", 
      date: Date.now()
    });

    await order.save();

    // 🌟 TRIGGER AUTOMATIC INVENTORY DEDUCTION (COD FLOW)
    await deductInventoryStock(sanitizedItems);

    // Wipe out data from DB user profile cart
    await userModel.findByIdAndUpdate(userId, { cartData: {} }); 

    return res.status(200).json({ 
      success: true, 
      message: "Order processed successfully!", 
      order 
    });

  } catch (error) {
    console.error("Order System Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get User Orders for Customer Profile Tracker
const getUserOrders = async (req, res) => {
    try {
        const userId = req.body.userId || req.userId; 

        console.log("Fetching orders for User ID:", userId);

        const orders = await orderModel.find({ userId });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error("Error in getUserOrders:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. List All Orders for Admin Panel
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({}).sort({ createdAt: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error("Error in listOrders controller:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve orders", error: error.message });
    }
};

// 4. Update Order Status from Admin Dropdown Selection Menu
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        await orderModel.findByIdAndUpdate(orderId, { status });
        res.status(200).json({ success: true, message: `Order status successfully updated to "${status}"` });
    } catch (error) {
        console.error("Error in updateStatus controller:", error);
        res.status(500).json({ success: false, message: "Failed to update order status", error: error.message });
    }
};

// 5. Create Order for Razorpay Checkout
const placeOrderRazorpay = async (req, res) => {
  try {
    const { amount } = req.body; 

    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Verify Online Payment Signature and Formally Save Transaction
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    
    const userId = req.body.userId || req.userId;

    if (!userId) {
       return res.status(401).json({ success: false, message: "User identity missing." });
    }

    // 1. Verify Razorpay Signature legitimacy
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      
      // ─── FIX: SANITIZE ITEMS HERE TOO BEFORE SAVING ONLINE ORDER ───
      const sanitizedOnlineItems = sanitizeOrderItems(orderData.items);

      // 2. Signature matches! Create your database order entry
      const newOrder = new orderModel({
        userId: userId, 
        items: sanitizedOnlineItems, 
        address: orderData.address,
        amount: orderData.amount, 
        paidAmount: orderData.amount, 
        paymentMethod: "Online (UPI / Cards)",
        payment: true, 
        status: "Processing",
        date: Date.now()
      });

      // 3. Save the document instance to MongoDB
      await newOrder.save();

      // 🌟 TRIGGER AUTOMATIC INVENTORY DEDUCTION (RAZORPAY FLOW)
      // Only runs once payment signature has been cryptographically confirmed!
      await deductInventoryStock(sanitizedOnlineItems);

      // 4. Clear user shopping cart collection
      await userModel.findByIdAndUpdate(userId, { cartData: {} });

      res.json({ success: true, message: "Payment verified and order placed successfully!" });
    } else {
      res.status(400).json({ success: false, message: "Payment verification failed. Security mismatch." });
    }
  } catch (error) {
    console.error("Razorpay Verification Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export { placeOrder, getUserOrders, listOrders, updateStatus, placeOrderRazorpay, verifyRazorpay };