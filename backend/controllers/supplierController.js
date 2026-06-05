import supplierModel from "../models/supplierModel.js";

// 1. ADD A NEW SUPPLIER MANUALLY
export const addSupplier = async (req, res) => {
  try {
    const { supplierName, gstinTaxId, phone, mobile, email, street, area, city, state, bankName, accountNumber, ifscCode } = req.body;

    if (!supplierName) {
      return res.status(400).json({ success: false, message: "Supplier Name is required." });
    }

    const formattedName = supplierName.trim().toUpperCase();

    // Check if supplier already exists
    const existingSupplier = await supplierModel.findOne({ supplierName: formattedName });
    if (existingSupplier) {
      return res.status(400).json({ success: false, message: "A supplier with this name already exists." });
    }

    const newSupplier = new supplierModel({
      supplierName: formattedName,
      gstinTaxId: gstinTaxId?.toUpperCase(),
      phone, mobile, email, street, area, city, state, bankName, accountNumber,
      ifscCode: ifscCode?.toUpperCase()
    });

    await newSupplier.save();
    res.status(201).json({ success: true, message: "Supplier registered successfully!", supplier: newSupplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET ALL SUPPLIERS (For a Master List Table)
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierModel.find({}).sort({ supplierName: 1 });
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. LIVE SEARCH FOR FRONTEND INVOICE AUTOCOMPLETE
export const searchSuppliers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, suppliers: [] });
    }

    // Searches names containing the characters typed, case-insensitive
    const suppliers = await supplierModel.find({
      status: "Active",
      supplierName: { $regex: query, $options: "i" }
    })
    .limit(10);

    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};