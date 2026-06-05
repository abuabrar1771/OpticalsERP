import productModel from "../models/productModel.js";
import prescriptionModel from "../models/prescriptionModel.js";
import invoiceModel from "../models/invoiceModel.js"; // 🌟 Added for in-store physical bills
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
// 4. 🚀 ADDED: DUAL LOOKUP PATIENT RESOLVER (PRESCRIPTIONS + INVOICES)
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

    const searchFilter = {
      $or: [
        { patientName: { $regex: escapedSearchStr, $options: "i" } },
        { patientMobile: { $regex: escapedSearchStr, $options: "i" } },
        { patientMobile: { $regex: escapedPhoneVariant, $options: "i" } },
      ],
    };

    // Pull from both collections simultaneously
    const prescriptionMatches = await prescriptionModel.find(searchFilter).lean();
    const invoiceMatches = await invoiceModel.find(searchFilter).lean();

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

    // Parse financial invoice documents (This catches your unclassified sales like NAGARAJ)
    invoiceMatches.forEach((record) => {
      if (record.patientMobile && !trackingSet.has(record.patientMobile)) {
        trackingSet.add(record.patientMobile);
        uniquePatientsMap.push({
          _id: record._id,
          patientName: String(record.patientName || "Unknown Patient").toUpperCase().trim(),
          patientMobile: record.patientMobile,
        });
      }
    });

    return res.json({
      success: true,
      exists: uniquePatientsMap.length > 0,
      patientName: uniquePatientsMap.length > 0 ? uniquePatientsMap[0].patientName : "",
      history: uniquePatientsMap,         // Feeds retail billing search dropdown loops
      customerMatches: uniquePatientsMap, // Feeds accounting vouchers search dropdown loops
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

    // Find all invoices for this mobile number from newest to oldest
    const invoices = await invoiceModel
      .find({ patientMobile: mobile })
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

    // Scan invoices from newest to oldest to find the latest non-empty diopter parameters
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

    // Map the database invoices into a clean frontend history array format
    const history = invoices.map((inv) => {
      let itemSummaryText = "No Items Recorded";
      if (inv.items && inv.items.length > 0) {
        itemSummaryText = inv.items
          .map((i) => `${i.category.replace("_", " ")}: ${i.productName}`)
          .join(" + ");
      }
      return {
        date: new Date(inv.createdAt || inv.date).toLocaleDateString("en-IN"),
        invoiceNumber: inv.invoiceNumber,
        details: itemSummaryText,
        totalAmount: `₹${inv.totalAmount}`,
        paymentMode: inv.paymentMode,
      };
    });

    // Return payload to frontend dashboard interface matrix
    res.json({
      name: latestInvoice.patientName,
      mobile: latestInvoice.patientMobile,
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
// 6. CREATE IN-STORE CUSTOM JOB INVOICE & AUTO-DEDUCT CORES (FIXED MATRIX)
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
    } = req.body;

    const cleanMobile = patientMobile.replace(/\s+/g, "").replace(/[-()]/g, "");
    const fullMobileNum = cleanMobile.startsWith("+91")
      ? cleanMobile
      : `+91${cleanMobile.replace(/^\+?91/, "")}`;
    const generatedInvoiceNum =
      req.body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

    // A. Parse frontend multi-row array or adapt flat item structures instantly
    let processingItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      processingItems = items;
    } else {
      // Safe Fallback adapter transforms flat old structures into a valid item row matrix array
      processingItems = [
        {
          category: req.body.category || "EYE_GLASS",
          subCategory: req.body.subCategory || "Full-Rim",
          frameId: frameId || null,
          frameProduct: frameId || null,
          productName: req.body.productName || "In-Store Item",
          framePrice: Number(framePrice || 0),
          lensType: lensType || "Standard Non-Powered / Plano",
          lensFeatures: req.body.lensFeatures || "None",
          lensPrice: Number(lensPrice || 0),
          itemSubtotal: Number(framePrice || 0) + Number(lensPrice || 0),
          rightEyePower: rightEye || {
            sph: "0.00",
            cyl: "0.00",
            axis: "0",
            add: "0.00",
            pd: "60",
          },
          leftEyePower: leftEye || {
            sph: "0.00",
            cyl: "0.00",
            axis: "0",
            add: "0.00",
            pd: "60",
          },
        },
      ];
    }

    // =====================================================================
    // B. Calculate net billing financials accurately across all submitted grid canvas items
    // =====================================================================
    const grossTotalCalculated = processingItems.reduce((acc, curr) => {
      const fallbackSum =
        Number(curr.framePrice || 0) + Number(curr.lensPrice || 0);
      return acc + (Number(curr.itemSubtotal) || fallbackSum);
    }, 0);

    const discountInput = Number(discount || 0);
    let calculatedDiscountAmount = 0;

    if (
      discountInput === Number(totalAmount) &&
      discountInput > grossTotalCalculated / 2
    ) {
      calculatedDiscountAmount = Math.max(
        0,
        grossTotalCalculated - discountInput,
      );
    } else if (discountInput > 0 && discountInput <= 100) {
      calculatedDiscountAmount = Math.round(
        (grossTotalCalculated * discountInput) / 100,
      );
    } else {
      calculatedDiscountAmount = discountInput;
    }

    const netTotalCalculated =
      Number(totalAmount) ||
      Math.max(0, Math.round(grossTotalCalculated - calculatedDiscountAmount));

    // =====================================================================
    // C. Format incoming properties to align cleanly with your strict sub-document `invoiceItemSchema`
    // =====================================================================
    const dbFormattedItems = processingItems.map((item) => {
      const parsedFramePrice = Number(item.framePrice || 0);
      const parsedLensPrice = Number(item.lensPrice || 0);
      const calculatedItemSubtotal = parsedFramePrice + parsedLensPrice;

      return {
        category: item.category,
        subCategory: item.subCategory || "General",
        frameProduct: item.frameProduct || item.frameId || null,
        productName: item.productName,
        framePrice: parsedFramePrice,
        lensType: item.lensType || "Standard Non-Powered",
        lensFeatures: item.lensFeatures || "None",
        lensPrice: parsedLensPrice,
        itemSubtotal: Number(item.itemSubtotal) || calculatedItemSubtotal,
        rightEyePower: {
          sph: String(item.rightEyePower?.sph || "0.00"),
          cyl: String(item.rightEyePower?.cyl || "0.00"),
          axis: String(item.rightEyePower?.axis || "0"),
          add: String(item.rightEyePower?.add || "0.00"),
          pd: String(item.rightEyePower?.pd || "60"),
        },
        leftEyePower: {
          sph: String(item.leftEyePower?.sph || "0.00"),
          cyl: String(item.leftEyePower?.cyl || "0.00"),
          axis: String(item.leftEyePower?.axis || "0"),
          add: String(item.leftEyePower?.add || "0.00"),
          pd: String(item.leftEyePower?.pd || "60"),
        },
      };
    });

    const newInvoice = new invoiceModel({
      invoiceNumber: generatedInvoiceNum,
      patientName: patientName.toUpperCase(),
      patientMobile: fullMobileNum,
      discount: Math.round(calculatedDiscountAmount),
      totalAmount: netTotalCalculated,
      paymentMode: paymentMode || "Cash",
      items: dbFormattedItems,
    });

    await newInvoice.save();

    const prescriptionLineItem = dbFormattedItems.find(
      (i) =>
        i.category === "EYE_GLASS" ||
        i.category === "POWERED_GLASS" ||
        i.category === "CONTACT_LENS",
    );

    if (prescriptionLineItem) {
      const selectedLensTypeString =
        prescriptionLineItem.lensType || lensType || "Standard Non-Powered";
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

    // F. Auto-Deduct Stock Management Pipeline
    for (const item of dbFormattedItems) {
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
      message: `Invoice ${generatedInvoiceNum} created successfully with item arrays stored!`,
      invoiceNumber: generatedInvoiceNum,
      totalAmount: netTotalCalculated,
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
        unpaidRevenue: 0,
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

    const retailInvoicesToday = await invoiceModel.find({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    financialSummary.totalInvoicesCount += retailInvoicesToday.length;

    retailInvoicesToday.forEach((bill) => {
      const billValue = Number(bill.totalAmount || 0);
      financialSummary.grossRevenueToday += billValue;
      financialSummary.paymentStatusTotals.paidRevenue += billValue;

      const mode = String(bill.paymentMode || "Cash").toLowerCase();
      if (mode === "upi") {
        financialSummary.paymentMethodBreakdown.store_upi += billValue;
      } else if (mode === "card") {
        financialSummary.paymentMethodBreakdown.store_card += billValue;
      } else {
        financialSummary.paymentMethodBreakdown.store_cash += billValue;
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