import purchaseModel from "../models/purchaseModel.js";
import productModel from "../models/productModel.js";
import supplierModel from "../models/supplierModel.js";
import mongoose from "mongoose";

/**
 * @route   POST /api/purchase/add-bill
 * @desc    Log a new purchase invoice, dynamically handle supplier indexing, and adjust warehouse product stock metrics
 * @access  Protected (Requires Token verification middleware)
 */
export const createPurchaseEntry = async (req, res) => {
  // Establish an isolated database session block to execute an atomic transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      supplierName, 
      supplierInvoiceNumber, 
      purchaseDate, 
      items, 
      paymentStatus, 
      notes,
      // Extra supplier attributes for on-the-fly profiling
      gstinTaxId,
      phone,
      mobile,
      email,
      street,
      area,
      city,
      state,
      bankName,
      accountNumber,
      ifscCode
    } = req.body;

    // 1. Validation Safeguards
    if (!supplierName || !supplierInvoiceNumber) {
      return res.status(400).json({ success: false, message: "Missing required header information: Supplier Identity or Invoice Number." });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Purchase item grid cannot be empty." });
    }

    // 2. Prevent Duplicate Billing Processing Logs
    const existingBill = await purchaseModel.findOne({ supplierInvoiceNumber }).session(session);
    if (existingBill) {
      return res.status(400).json({ success: false, message: "This Supplier Invoice Number has already been processed!" });
    }

    // 3. 🚀 AUTOMATIC SUPPLIER RESOLUTION / IN-LINE CREATION
    const formattedSupplierName = supplierName.trim().toUpperCase();
    let supplier = await supplierModel.findOne({ supplierName: formattedSupplierName }).session(session);

    if (!supplier) {
      // If the vendor profile isn't found in the database, instantiate it automatically matching your schema rules
      supplier = new supplierModel({
        supplierName: formattedSupplierName,
        gstinTaxId: gstinTaxId ? gstinTaxId.trim().toUpperCase() : "",
        phone: phone ? phone.trim() : "",
        mobile: mobile ? mobile.trim() : "",
        email: email ? email.trim().toLowerCase() : "",
        street: street ? street.trim() : "",
        area: area ? area.trim() : "",
        city: city ? city.trim() : "",
        state: state ? state.trim() : "",
        bankName: bankName ? bankName.trim() : "",
        accountNumber: accountNumber ? accountNumber.trim() : "",
        ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : "",
        status: "Active"
      });
      await supplier.save({ session });
    } else {
      // Self-Healing Logic: Update missing GST registration token data if newly discovered on this specific invoice sheet
      if (!supplier.gstinTaxId && gstinTaxId) {
        supplier.gstinTaxId = gstinTaxId.trim().toUpperCase();
        await supplier.save({ session });
      }
    }

    // 4. INVOICE COMPUTATION CYCLE
    let calculatedGrossTotal = 0;
    const formattedItems = [];

    for (const item of items) {
      const qty = Number(item.qtyReceived || 0);
      const purchasePrice = Number(item.purchasePricePerUnit || 0);
      const cgstPercent = Number(item.cgst || 0);
      const sgstPercent = Number(item.sgst || 0);

      if (qty <= 0 || purchasePrice <= 0) {
        throw new Error(`Invalid line calculations detected for SKU: ${item.sku || 'Unknown'}. Check Qty and Prices.`);
      }

      // Compute precise row financials incorporating the localized tax system layers
      const baseCost = qty * purchasePrice;
      const totalTaxPercent = cgstPercent + sgstPercent;
      const taxAmount = baseCost * (totalTaxPercent / 100);
      const itemSubtotal = baseCost + taxAmount;
      
      calculatedGrossTotal += itemSubtotal;

      formattedItems.push({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        qtyReceived: qty,
        purchasePricePerUnit: purchasePrice,
        sellingPricePerUnit: Number(item.sellingPricePerUnit || 0),
        cgst: cgstPercent,
        sgst: sgstPercent,
        itemSubtotal: Number(itemSubtotal.toFixed(2)),
        variantSpecs: item.variantSpecs || null // Retained specifically for prescriptive index parameters
      });
    }

    // 5. STAGE & SAVE THE INVOICE BALANCES LEDGER LOG
    const newPurchase = new purchaseModel({
      supplierId: supplier._id, // Establishes strong multi-collection relation tracking indices
      supplierName: supplier.supplierName,
      supplierInvoiceNumber,
      purchaseDate: purchaseDate || new Date(),
      items: formattedItems,
      grossTotal: Number(calculatedGrossTotal.toFixed(2)),
      paymentStatus: paymentStatus || "Paid",
      notes
    });
    await newPurchase.save({ session });

    // 6. 🚀 INTELLIGENT COMPREHENSIVE STOCK REPLICATOR LOOP
    for (const item of formattedItems) {
      
      // OPTION A: Prescription Lens Matrices Logic Matrix Route
      if (item.variantSpecs && (item.variantSpecs.sphere || item.variantSpecs.cylinder)) {
        
        // Target accurate placement parameters inside the multi-variant subdocument storage block array
        const updatedProduct = await productModel.findOneAndUpdate(
          { 
            _id: item.productId, 
            "variants.specifications.sphere": item.variantSpecs.sphere,
            "variants.specifications.cylinder": item.variantSpecs.cylinder
          },
          { 
            $inc: { "variants.$.stock": item.qtyReceived }, // Increments exact index point in internal sub-array match
            $set: { price: item.sellingPricePerUnit }       // Forces parent base shelf price validation check updates
          },
          { session, new: true }
        );

        // EDGE CASE FALLBACK: If parent glass design asset tracks successfully but this exact sphere combination isn't in variants collection array yet
        if (!updatedProduct) {
          await productModel.findByIdAndUpdate(
            item.productId, 
            {
              $push: { 
                variants: {
                  sku: item.sku,
                  stock: item.qtyReceived,
                  specifications: {
                    sphere: item.variantSpecs.sphere,
                    cylinder: item.variantSpecs.cylinder,
                    axis: item.variantSpecs.axis || "",
                    baseCurve: item.variantSpecs.baseCurve || "",
                    diameter: item.variantSpecs.diameter || "",
                    addition: item.variantSpecs.addition || ""
                  }
                }
              },
              $set: { price: item.sellingPricePerUnit }
            }, 
            { session }
          );
        }

      } else {
        // OPTION B: Standard Base Inventory Category Paths (Frames, Shades, Accessories)
        const updatedStandard = await productModel.findByIdAndUpdate(
          item.productId, 
          {
            $inc: { stock: item.qtyReceived },         // Direct top-level collection count scalar modification
            $set: { price: item.sellingPricePerUnit }   // Refresh the latest retail configuration settings profile
          }, 
          { session, new: true }
        );

        if (!updatedStandard) {
          throw new Error(`Product mapping broken. Core Database catalog asset reference target not found for Product ID: ${item.productId}`);
        }
      }
    }

    // Lock and commit all relational steps simultaneously across all 3 databases collections (Suppliers, Products, Purchases)
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `Purchase invoice logged and mapped successfully! ${formattedItems.length} lines indexed, supplier record confirmed, and operational parameters applied.`
    });

  } catch (error) {
    // If a collision occurs at any point during operations, clear out all intermediate tasks safely to preserve transactional stability
    await session.abortTransaction();
    session.endSession();
    
    console.error("Critical System Level Purchase Intake Interruption Error:", error);
    return res.status(500).json({ success: false, message: "Purchase ledger commitment failure exception triggered.", error: error.message });
  }
};