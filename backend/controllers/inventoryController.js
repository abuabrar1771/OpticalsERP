import productModel from "../models/productModel.js";
import prescriptionModel from "../models/prescriptionModel.js";
import counterSalesInvoiceModel from "../models/counterSalesInvoiceModel.js"; // 🌟 Upgraded to use your new counterSalesInvoice collection
import mongoose from "mongoose";

// Helper function to safely fetch the order model context dynamically
const getOrderModel = () => {
  return mongoose.models.order || mongoose.connection.model("order");
};

// ---------------------------------------------------------------------
// 1. LIVE INVENTORY MANAGER (FOR BOTH FRAMES & COMPLEX POWER VARIANTS)
// ---------------------------------------------------------------------
export const updateProductStock = async (req, res) => {
  try {
    const { productId, adjustmentAmount, isVariant, variantSku } = req.body;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.json({
        success: false,
        message: "Optical product asset not found.",
      });
    }

    if (isVariant && variantSku) {
      const variantIndex = product.variants.findIndex(
        (v) => v.sku === variantSku,
      );
      if (variantIndex === -1) {
        return res.json({
          success: false,
          message: "Specified eye power matrix SKU variant not found.",
        });
      }

      const currentStock = product.variants[variantIndex].stock || 0;
      product.variants[variantIndex].stock = Math.max(
        0,
        currentStock + Number(adjustmentAmount),
      );
    } else {
      const currentStock = product.stock || 0;
      product.stock = Math.max(0, currentStock + Number(adjustmentAmount));
    }

    await product.save();
    return res.json({
      success: true,
      message: "Inventory stock levels adjusted successfully.",
      product,
    });
  } catch (error) {
    console.error("Stock Mutation Exception:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 2. LOW INVENTORY TRACKING ENGINE (WARNING SYSTEM)
// ---------------------------------------------------------------------
export const getLowStockInventory = async (req, res) => {
  try {
    const lowStockAlerts = await productModel
      .find({
        $or: [
          {
            category: { $ne: "Lenses" },
            $expr: { $lte: ["$stock", "$minStockAlert"] },
          },
          {
            category: "Lenses",
            "variants.stock": { $lte: 2 },
          },
        ],
      })
      .select("sku name brand category stock minStockAlert variants");

    return res.json({ success: true, products: lowStockAlerts });
  } catch (error) {
    console.error("Inventory Fetch Error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 3. SECURE PATIENT EYE POWER ENTRY
// ---------------------------------------------------------------------
export const savePatientPrescription = async (req, res) => {
  try {
    const {
      customerId,
      patientName,
      patientMobile,
      rightEye,
      leftEye,
      lensType,
      doctorName,
    } = req.body;

    if (!lensType) {
      return res.json({
        success: false,
        message: "Lens type parameter is required to validate patient prescription.",
      });
    }

    const cleanMobile = patientMobile.replace(/\s+/g, "").replace(/[-()]/g, "");
    const fullMobileNum = cleanMobile.startsWith("+91")
      ? cleanMobile
      : `+91${cleanMobile.replace(/^\+?91/, "")}`;

    const newPrescription = new prescriptionModel({
      customerId: customerId || null,
      patientName,
      patientMobile: fullMobileNum,
      rightEye: {
        sph: rightEye?.sph || "0.00",
        cyl: rightEye?.cyl || "0.00",
        axis: rightEye?.axis || "0",
        add: rightEye?.add || "0.00",
        pd: rightEye?.pd || "",
      },
      leftEye: {
        sph: leftEye?.sph || "0.00",
        cyl: leftEye?.cyl || "0.00",
        axis: leftEye?.axis || "0",
        add: leftEye?.add || "0.00",
        pd: leftEye?.pd || "",
      },
      lensType,
      doctorName: doctorName || "Self / In-Store",
    });

    await newPrescription.save();
    return res.json({
      success: true,
      message: "Patient vision profile logged successfully under secure index record hooks.",
    });
  } catch (error) {
    console.error("Prescription Entry Mutation Failure:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 4. DUAL LOOKUP PATIENT RESOLVER (PRESCRIPTIONS + COUNTER INVOICES)
// ---------------------------------------------------------------------
export const searchCustomerByMobile = async (req, res) => {
  try {
    const { mobileNum } = req.query;
    if (!mobileNum) {
      return res.json({
        success: false,
        message: "Search criteria query input is required.",
      });
    }

    const searchStr = mobileNum.trim();
    const escapedSearchStr = searchStr.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    const cleanMobile = searchStr.replace(/\s+/g, "").replace(/[-()]/g, "");
    const formattedPhoneVariant = cleanMobile.startsWith("+91") ? cleanMobile : `+91${cleanMobile.replace(/^\+?91/, "")}`;
    const escapedPhoneVariant = formattedPhoneVariant.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    const searchFilterPrescription = {
      $or: [
        { patientName: { $regex: escapedSearchStr, $options: "i" } },
        { patientMobile: { $regex: escapedSearchStr, $options: "i" } },
        { patientMobile: { $regex: escapedPhoneVariant, $options: "i" } },
      ],
    };

    // Adapted to reflect counterSalesInvoice schema fields: customer.name and customer.phone
    const searchFilterCounterInvoice = {
      $or: [
        { "customer.name": { $regex: escapedSearchStr, $options: "i" } },
        { "customer.phone": { $regex: escapedSearchStr, $options: "i" } },
        { "customer.phone": { $regex: escapedPhoneVariant, $options: "i" } },
      ],
    };

    // Pull from both collections simultaneously
    const prescriptionMatches = await prescriptionModel.find(searchFilterPrescription).lean();
    const invoiceMatches = await counterSalesInvoiceModel.find(searchFilterCounterInvoice).lean();

    const uniquePatientsMap = [];
    const trackingSet = new Set();

    // Parse clinical prescriptions data records
    prescriptionMatches.forEach((record) => {
      if (record.patientMobile && !trackingSet.has(record.patientMobile)) {
        trackingSet.add(record.patientMobile);
        uniquePatientsMap.push({
          _id: record._id,
          patientName: String(record.patientName).toUpperCase().trim(),
          patientMobile: record.patientMobile,
        });
      }
    });

    // Parse counter invoice documents
    invoiceMatches.forEach((record) => {
      const phone = record.customer?.phone;
      const name = record.customer?.name;
      if (phone && !trackingSet.has(phone)) {
        trackingSet.add(phone);
        uniquePatientsMap.push({
          _id: record._id,
          patientName: String(name || "Unknown Patient").toUpperCase().trim(),
          patientMobile: phone,
        });
      }
    });

    return res.json({
      success: true,
      exists: uniquePatientsMap.length > 0,
      patientName: uniquePatientsMap.length > 0 ? uniquePatientsMap[0].patientName : "",
      history: uniquePatientsMap,         
      customerMatches: uniquePatientsMap, 
    });

  } catch (error) {
    console.error("Customer Lookup Exception:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 4.5 GET COMPILED CUSTOMER HISTORY & PROFILE RECORDS FOR DASHBOARD
// ---------------------------------------------------------------------
export const getCustomerProfileByMobile = async (req, res) => {
  try {
    const { mobile } = req.params;

    // Find all counter invoices for this mobile number from newest to oldest
    const invoices = await counterSalesInvoiceModel
      .find({ "customer.phone": mobile })
      .sort({ createdAt: -1 });

    if (invoices.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No transaction records matching this phone number.",
        });
    }

    const latestInvoice = invoices[0];
    let rightEye = null;
    let leftEye = null;
    let latestLensSpecs = { type: "Plain / Frame Only", features: "None" };

    // Scan invoices from newest to oldest to find the latest prescription values inside items array
    for (const inv of invoices) {
      if (!inv.items || inv.items.length === 0) continue;

      const itemWithPower = inv.items.find(
        (item) =>
          (item.rightEyePower &&
            (item.rightEyePower.sph ||
              item.rightEyePower.cyl ||
              item.rightEyePower.axis)) ||
          (item.leftEyePower &&
            (item.leftEyePower.sph ||
              item.leftEyePower.cyl ||
              item.leftEyePower.axis)),
      );

      if (itemWithPower) {
        rightEye = itemWithPower.rightEyePower;
        leftEye = itemWithPower.leftEyePower;
        latestLensSpecs = {
          type: itemWithPower.lensType || "Standard",
          features: itemWithPower.lensFeatures || "None",
        };
        break;
      }
    }

    // Map the database counter invoices into a clean frontend history format
    const history = invoices.map((inv) => {
      let itemSummaryText = "No Items Recorded";
      if (inv.items && inv.items.length > 0) {
        itemSummaryText = inv.items
          .map((i) => `${i.itemName} (Qty: ${i.quantity})`)
          .join(" + ");
      }
      return {
        date: new Date(inv.createdAt || inv.date).toLocaleDateString("en-IN"),
        invoiceNumber: inv.invoiceNumber,
        details: itemSummaryText,
        totalAmount: `₹${inv.grandTotal}`,
        advanceAmount: `₹${inv.advanceAmount || 0}`,
        balanceDue: `₹${inv.balanceAmount || 0}`,
        paymentMode: inv.paymentMethod,
        status: inv.status
      };
    });

    res.json({
      name: latestInvoice.customer?.name,
      mobile: latestInvoice.customer?.phone,
      lastVisit: new Date(
        latestInvoice.createdAt || latestInvoice.date,
      ).toLocaleDateString("en-IN"),
      history: history,
      prescription: {
        od: rightEye
          ? {
              ...rightEye,
              lens: `${latestLensSpecs.type} (${latestLensSpecs.features})`,
            }
          : null,
        os: leftEye
          ? {
              ...leftEye,
              lens: `${latestLensSpecs.type} (${latestLensSpecs.features})`,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("Profile history aggregation fault:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------------------------------------------------------------
// 6. CREATE IN-STORE COUNTER SALES INVOICE & AUTO-DEDUCT CORES
// ---------------------------------------------------------------------
export const createInStoreInvoice = async (req, res) => {
  try {
    const {
      patientName,
      patientMobile,
      lensType,
      frameId,
      lensId,
      rightEye,
      leftEye,
      framePrice,
      lensPrice,
      discount,
      paymentMode,
      items,
      totalAmount,
      advanceAmount, // 🌟 Received directly from frontend request body
    } = req.body;

    const cleanMobile = patientMobile.replace(/\s+/g, "").replace(/[-()]/g, "");
    const fullMobileNum = cleanMobile.startsWith("+91")
      ? cleanMobile
      : `+91${cleanMobile.replace(/^\+?91/, "")}`;
      
    const generatedInvoiceNum =
      req.body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

    let processingItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      // Maps complex client items to structure matching counterSalesInvoice schema rules
      processingItems = items.map(item => ({
        itemName: item.productName || item.itemName || "Counter Item",
        quantity: Number(item.quantity || 1),
        price: Number(item.framePrice || item.price || 0),
        taxRate: Number(item.taxRate || 0),
        total: Number(item.itemSubtotal || item.total || 0),
        // Preservation of optometry specific payloads for side-car prescription triggers
        category: item.category || "EYE_GLASS",
        frameProduct: item.frameProduct || item.frameId || null,
        lensType: item.lensType || "Standard Non-Powered",
        lensFeatures: item.lensFeatures || "None",
        lensPrice: Number(item.lensPrice || 0),
        rightEyePower: item.rightEyePower || rightEye,
        leftEyePower: item.leftEyePower || leftEye
      }));
    } else {
      // Safe Fallback adapter transforms standard flat structures into array structures
      const parsedFramePrice = Number(framePrice || 0);
      const parsedLensPrice = Number(lensPrice || 0);
      const combinedPrice = parsedFramePrice + parsedLensPrice;

      processingItems = [
        {
          itemName: req.body.productName || "In-Store Item",
          quantity: 1,
          price: combinedPrice,
          taxRate: 0,
          total: combinedPrice,
          category: req.body.category || "EYE_GLASS",
          frameProduct: frameId || null,
          lensType: lensType || "Standard Non-Powered / Plano",
          lensFeatures: req.body.lensFeatures || "None",
          lensPrice: parsedLensPrice,
          rightEyePower: rightEye || { sph: "0.00", cyl: "0.00", axis: "0", add: "0.00", pd: "60" },
          leftEyePower: leftEye || { sph: "0.00", cyl: "0.00", axis: "0", add: "0.00", pd: "60" },
        },
      ];
    }

    // Calculations based on processed grid fields
    const grossTotalCalculated = processingItems.reduce((acc, curr) => acc + curr.total, 0);
    const discountInput = Number(discount || 0);
    let calculatedDiscountAmount = 0;

    if (discountInput === Number(totalAmount) && discountInput > grossTotalCalculated / 2) {
      calculatedDiscountAmount = Math.max(0, grossTotalCalculated - discountInput);
    } else if (discountInput > 0 && discountInput <= 100) {
      calculatedDiscountAmount = Math.round((grossTotalCalculated * discountInput) / 100);
    } else {
      calculatedDiscountAmount = discountInput;
    }

    const netGrandTotal = Number(totalAmount) || Math.max(0, Math.round(grossTotalCalculated - calculatedDiscountAmount));

    // Constructing document according to counterSalesInvoice specification rules
    const newInvoice = new counterSalesInvoiceModel({
      invoiceNumber: generatedInvoiceNum,
      customer: {
        name: patientName.toUpperCase(),
        phone: fullMobileNum,
      },
      items: processingItems,
      subTotal: grossTotalCalculated,
      taxAmount: processingItems.reduce((acc, curr) => acc + (curr.total * (curr.taxRate / 100)), 0),
      grandTotal: netGrandTotal,
      paymentMethod: paymentMode || "Cash",
      advanceAmount: Number(advanceAmount || 0), 
      // NOTE: balanceAmount and status status hooks manage themselves via your schema's pre-save hook automatically!
    });

    await newInvoice.save();

    // Auto-save clinical prescription profiles when valid optical inventory records match
    const prescriptionLineItem = processingItems.find(
      (i) =>
        i.category === "EYE_GLASS" ||
        i.category === "POWERED_GLASS" ||
        i.category === "CONTACT_LENS",
    );

    if (prescriptionLineItem) {
      const selectedLensTypeString = prescriptionLineItem.lensType || lensType || "Standard Non-Powered";
      const newPrescription = new prescriptionModel({
        patientName: patientName.toUpperCase(),
        patientMobile: fullMobileNum,
        lensType: selectedLensTypeString,
        rightEye: prescriptionLineItem.rightEyePower,
        leftEye: prescriptionLineItem.leftEyePower,
        doctorName: "In-Store Optometrist",
      });
      await newPrescription.save();
    }

    // Auto-Deduct Stock Pipeline
    for (const item of processingItems) {
      const activeFrameId = item.frameProduct;
      if (activeFrameId && mongoose.Types.ObjectId.isValid(activeFrameId)) {
        await productModel.findByIdAndUpdate(activeFrameId, {
          $inc: { stock: -1 },
        });
      }

      const activeLensId = lensId;
      const activeRightEye = item.rightEyePower;
      const activeLeftEye = item.leftEyePower;

      if (
        activeLensId &&
        mongoose.Types.ObjectId.isValid(activeLensId) &&
        activeRightEye &&
        activeLeftEye
      ) {
        await productModel.findOneAndUpdate(
          {
            _id: activeLensId,
            "variants.specifications.sphere": activeRightEye.sph,
            "variants.specifications.cylinder": activeRightEye.cyl,
          },
          { $inc: { "variants.$.stock": -1 } },
        );
        await productModel.findOneAndUpdate(
          {
            _id: activeLensId,
            "variants.specifications.sphere": activeLeftEye.sph,
            "variants.specifications.cylinder": activeLeftEye.cyl,
          },
          { $inc: { "variants.$.stock": -1 } },
        );
      }
    }

    return res.json({
      success: true,
      message: `Invoice ${generatedInvoiceNum} created successfully under counter logs!`,
      invoiceNumber: generatedInvoiceNum,
      grandTotal: netGrandTotal,
      advanceAmount: newInvoice.advanceAmount,
      balanceDue: newInvoice.balanceAmount,
      status: newInvoice.status
    });
  } catch (error) {
    console.error("Retail Invoicing Processing Fault:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 7. METRIC DRIVEN DAILY INVOICE & CASH ACCOUNTING DATA
// ---------------------------------------------------------------------
export const getDailyAccountingMetrics = async (req, res) => {
  try {
    const Order = getOrderModel();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const prescriptionsTodayCount = await prescriptionModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    let financialSummary = {
      totalInvoicesCount: 0,
      grossRevenueToday: 0,
      paymentMethodBreakdown: {
        cod: 0,
        stripe: 0,
        razorpay: 0,
        store_cash: 0,
        store_upi: 0,
        store_card: 0,
      },
      paymentStatusTotals: {
        paidRevenue: 0,
        unpaidRevenue: 0, // Outlines balances remaining to collect
      },
      prescriptionsFiledToday: prescriptionsTodayCount,
    };

    if (Order) {
      const activeInvoicesToday = await Order.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      });

      financialSummary.totalInvoicesCount += activeInvoicesToday.length;

      activeInvoicesToday.forEach((invoice) => {
        const orderValue = Number(invoice.amount || invoice.totalAmount || 0);
        financialSummary.grossRevenueToday += orderValue;

        if (
          invoice.payment === true ||
          invoice.paymentStatus === "Paid" ||
          invoice.status === "Delivered"
        ) {
          financialSummary.paymentStatusTotals.paidRevenue += orderValue;
        } else {
          financialSummary.paymentStatusTotals.unpaidRevenue += orderValue;
        }

        const method = String(
          invoice.paymentMethod || invoice.method || "cod",
        ).toLowerCase();
        if (method.includes("stripe")) {
          financialSummary.paymentMethodBreakdown.stripe += orderValue;
        } else if (method.includes("razorpay")) {
          financialSummary.paymentMethodBreakdown.razorpay += orderValue;
        } else {
          financialSummary.paymentMethodBreakdown.cod += orderValue;
        }
      });
    }

    // Query counter sales collections for today's data metrics 
    const retailInvoicesToday = await counterSalesInvoiceModel.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    financialSummary.totalInvoicesCount += retailInvoicesToday.length;

    retailInvoicesToday.forEach((bill) => {
      const grandTotalValue = Number(bill.grandTotal || 0);
      const advanceCollected = Number(bill.advanceAmount || 0);
      const remainingBalance = Number(bill.balanceAmount || 0);

      // Total daily billing expectations
      financialSummary.grossRevenueToday += grandTotalValue;
      
      // Actual cash-in-hand collected goes to paid status; credit goes to unpaid status
      financialSummary.paymentStatusTotals.paidRevenue += advanceCollected;
      financialSummary.paymentStatusTotals.unpaidRevenue += remainingBalance;

      const mode = String(bill.paymentMethod || "Cash").toLowerCase();
      if (mode === "upi") {
        financialSummary.paymentMethodBreakdown.store_upi += advanceCollected;
      } else if (mode === "card") {
        financialSummary.paymentMethodBreakdown.store_card += advanceCollected;
      } else {
        financialSummary.paymentMethodBreakdown.store_cash += advanceCollected;
      }
    });

    return res.json({
      success: true,
      metrics: financialSummary,
    });
  } catch (error) {
    console.error("Financial Data Aggregation Failure:", error);
    return res.json({ success: false, message: error.message });
  }
};

// ---------------------------------------------------------------------
// 9. MASTER LIVE AUTOCOMPLETE SEARCH
// ---------------------------------------------------------------------
export const searchProductsAutocomplete = async (req, res) => {
  try {
    const { query, category } = req.query;
    if (!query) {
      return res.json({ success: true, products: [] });
    }

    const searchFilter = {
      $and: [
        {
          $or: [
            { brand: { $regex: query, $options: "i" } },
            { name: { $regex: query, $options: "i" } },
            { sku: { $regex: query, $options: "i" } },
            { "specifications.color": { $regex: query, $options: "i" } },
            { "specifications.shape": { $regex: query, $options: "i" } },
          ],
        },
      ],
    };

    if (category) {
      if (category === "Lenses") {
        searchFilter.$and.push({ category: "Lenses" });
      } else {
        searchFilter.$and.push({ category: { $ne: "Lenses" } });
      }
    }

    const matchingProducts = await productModel.find(searchFilter).limit(8);
    return res.json({ success: true, products: matchingProducts });
  } catch (error) {
    console.error("Master autocomplete lookup breakdown:", error);
    return res.json({ success: false, message: error.message });
  }
};