import productModel from "../models/productModel.js";
import { v2 as cloudinary } from "cloudinary";

// 🌟 HELPER FUNCTION: Safely uploads raw memory buffers to Cloudinary if your disk path falls back
const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      },
    );
    stream.end(fileBuffer);
  });
};

const getNextSku = async (req, res) => {
  try {
    const lastProduct = await productModel.findOne().sort({ createdAt: -1 });

    if (!lastProduct) {
      return res.json({ success: true, sku: "SO-0001" });
    }

    const lastSku = lastProduct.sku;
    const lastNumber = parseInt(lastSku.split("-")[1]) || 0;

    const nextNumber = lastNumber + 1;
    const autoSKU = `SO-${nextNumber.toString().padStart(4, "0")}`;

    return res.json({ success: true, sku: autoSKU });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const addProduct = async (req, res) => {
  try {
    // 1. Unpack basic top-level elements out of the body parsed by Multer
    // 🌟 ADDED: cgst and sgst extracted from req.body
    const {
      name,
      description,
      price,
      category,
      subCategory,
      stock,
      minStockAlert,
      brand,
      currency,
      sku,
      cgst,
      sgst,
    } = req.body;

    // 🌟 FIX 1: Safely parse JSON strings sent from the updated frontend form structure with strict fallbacks
    let specifications = {};
    let metadata = {};
    let variants = [];

    try {
      specifications =
        typeof req.body.specifications === "string"
          ? JSON.parse(req.body.specifications)
          : req.body.specifications || {};
      metadata =
        typeof req.body.metadata === "string"
          ? JSON.parse(req.body.metadata)
          : req.body.metadata || {};
      variants =
        typeof req.body.variants === "string"
          ? JSON.parse(req.body.variants)
          : req.body.variants || [];
    } catch (jsonError) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid nested form tracking string packets received.",
        });
    }

    // 2. Extract files uploaded via Multer safely with index existence checks
    const imageFiles = [
      req.files?.image1 ? req.files.image1[0] : null,
      req.files?.image2 ? req.files.image2[0] : null,
      req.files?.image3 ? req.files.image3[0] : null,
      req.files?.image4 ? req.files.image4[0] : null,
      req.files?.image5 ? req.files.image5[0] : null,
    ].filter((item) => item !== null);

    // 🌟 FIX 2: Hybrid cloud storage resolution (Handles physical paths AND virtual memory blocks flawlessly)
    let imagesUrl = await Promise.all(
      imageFiles.map(async (item) => {
        if (item.path) {
          // Destined for local disk setups
          let result = await cloudinary.uploader.upload(item.path, {
            resource_type: "image",
          });
          return result.secure_url;
        } else if (item.buffer) {
          // Destined for RAM memory configurations
          return await streamUpload(item.buffer);
        } else {
          throw new Error("Uploaded picture structural state is unreadable.");
        }
      }),
    );

    // 3. Sanitize physical structural dimensions manually
    if (specifications.dimensions) {
      const { lensWidth, bridgeWidth, templeLength } =
        specifications.dimensions;
      specifications.dimensions = {
        lensWidth: lensWidth ? Number(lensWidth) : undefined,
        bridgeWidth: bridgeWidth ? Number(bridgeWidth) : undefined,
        templeLength: templeLength ? Number(templeLength) : undefined,
      };
    }

    const isPrescriptionCategory =
      category === "Lenses" || category === "Contact Lenses";

    // 4. Sanitize variation array metrics securely
    const cleanVariants = Array.isArray(variants)
      ? variants.map((v, idx) => ({
          sku: v.sku || `${sku}-V${idx + 1}`,
          stock: v.stock ? Number(v.stock) : 0,
          specifications: v.specifications || {},
        }))
      : [];

    // 5. Structure payload to match your exact Mongoose Schema requirements
    const productData = {
      sku,
      name,
      brand,
      category,
      subCategory,
      description,
      price: Number(price) || 0,
      currency: currency || "INR",
      images: imagesUrl,
      // 🌟 SAVED: Dynamically parsed and safely casted numerical tax values
      cgst: Number(cgst) || 0,
      sgst: Number(sgst) || 0,
      stock: isPrescriptionCategory ? 0 : Number(stock) || 0,
      minStockAlert: minStockAlert ? Number(minStockAlert) : 3,
      variants: cleanVariants,
      specifications,
      metadata: {
        gender: metadata.gender || "Unisex",
        warranty: metadata.warranty || "No Warranty",
        bestseller:
          metadata.bestseller === true || metadata.bestseller === "true",
        newArrival:
          metadata.newArrival === true || metadata.newArrival === "true",
      },
    };

    const product = new productModel(productData);
    await product.save();

    return res
      .status(201)
      .json({ success: true, message: "Product Added Successfully", sku });
  } catch (error) {
    console.error("Backend Save Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: `Database storage failed: ${error.message}`,
      });
  }
};

// Product list
const totalProductList = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Single Product
const updateProduct = async (req, res) => {
  try {
    const { id, ...updates } = req.body;

    const finalUpdate = {};
    for (const key in updates) {
      if (
        typeof updates[key] === "object" &&
        updates[key] !== null &&
        !Array.isArray(updates[key])
      ) {
        for (const nestedKey in updates[key]) {
          finalUpdate[`${key}.${nestedKey}`] = updates[key][nestedKey];
        }
      } else {
        finalUpdate[key] = updates[key];
      }
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      id, // Uses your original 'id' variable context matching your controller signature
      {
        $inc: { stock: Number(qty) }, // Safely increments stock counts without overwriting history
        $set: { ...finalUpdate, price: Number(sRate) }, // Merges all finalUpdate parameters + new sRate pricing
      },
      {
        returnDocument: "after", // Fixes the Mongoose deprecation warning cleanly
        runValidators: true, // Keeps your original schema-level validation rules active
      },
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }

    return res.json({
      success: true,
      message: "Updated Successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Product
const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);
    return res.json({ success: true, message: "Product removed Successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single product
const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.body;
    const product = await productModel.findById(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }
    return res.json({ success: true, ProductData: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// 🌟 ADD THIS COMPREHENSIVE ENDPOINT TO THE BOTTOM OF YOUR PRODUCT CONTROLLER FILE:
export const addOpeningStockBatch = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Voucher entry matrix is empty." });
    }

    // Process each grid row sent by your frontend setup layout engine
    for (const item of items) {
      const { productId, qty, sRate } = item;

      // Atomically calculate and increment stock counters using modern native Mongoose/Mongo flags
      await productModel.findByIdAndUpdate(
        productId,
        {
          $inc: { stock: Number(qty) },  // Safely increments current stock counts
          $set: { price: Number(sRate) } // Updates Master base selling rate configuration matching entry
        },
        { returnDocument: 'after', runValidators: true } // Clears deprecation warnings cleanly
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: "Opening stock quantities initialized inside master directory tables successfully!" 
    });

  } catch (error) {
    console.error("Opening stock batch entry processing exception error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  addProduct,
  totalProductList,
  updateProduct,
  removeProduct,
  getSingleProduct,
  getNextSku,

};
