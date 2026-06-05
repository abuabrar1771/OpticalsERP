import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true }, // Top-level SKU for base products
    name: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true }, // e.g., 'Frames', 'Lenses', 'Contact Lenses', 'Accessories'
    subCategory: { type: String },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    images: [{ type: String, required: true }],
    sgst:{type:Number,required:true},
    cgst:{type:Number,required:true},
    
    // --- INVENTORY UPGRADES ---
    // Top-level stock used for standard items (Frames, Sunglasses, Accessories)
    stock: { type: Number, required: true, default: 0 }, 
    minStockAlert: { type: Number, default: 3 }, // Alert admin when stock falls below this number

    // Dynamic Matrix for Lenses & Contact Lenses
    // If a category is 'Lenses', stock will be tracked inside this array instead!
    variants: [{
        sku: { type: String }, // Variant-specific SKU (e.g., BRAND-SPH-CYL)
        stock: { type: Number, default: 0 },
        specifications: {
            sphere: { type: String },     // SPH (e.g., "-2.50")
            cylinder: { type: String },   // CYL (e.g., "-1.25")
            axis: { type: String },       // AXIS (e.g., "180")
            baseCurve: { type: String },  // BC (mainly for contacts)
            diameter: { type: String },   // DIA
            addition: { type: String },   // ADD (for progressives)
        }
    }],
    // --------------------------

    specifications: {
        shape: { type: String }, // Removed 'required: true' so lenses can bypass this
        material: { type: String }, 
        size: { type: String }, 
        color: { type: String }, 
        dimensions: {
            lensWidth: { type: Number },
            bridgeWidth: { type: Number },
            templeLength: { type: Number },
        }
    },
    metadata: {
        gender: { type: String, required: true },
        warranty: { type: String, required: true },
        bestseller: { type: Boolean, default: false },
        newArrival: { type: Boolean, default: false },
    }
}, { 
    timestamps: true,
    minimize: false 
});

const productModel = mongoose.models.product || mongoose.model("product", productSchema, "products");

export default productModel;