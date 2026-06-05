import productModel from "../models/productModel.js";

/**
 * Automatically loops through purchased items and decrements stock records
 * @param {Array} items - Array of purchased objects, e.g., [{ productId, quantity, isVariant, variantSku }]
 */
export const deductInventoryStock = async (items) => {
  try {
    if (!items || items.length === 0) return { success: false, message: "No items provided for stock deduction." };

    // Process all items concurrently
    const operations = items.map(async (item) => {
      const { productId, quantity, isVariant, variantSku } = item;
      const deductionAmount = Number(quantity || 1);

      // 1. If it's a standard frame or accessory (Not a lens power variant matrix cell)
      if (!isVariant) {
        return productModel.findByIdAndUpdate(
          productId,
          { $inc: { stock: -deductionAmount } },
          { new: true }
        );
      }

      // 2. If it is a specialized custom eye power lens variant matrix cell
      if (isVariant && variantSku) {
        return productModel.findOneAndUpdate(
          { _id: productId, "variants.sku": variantSku },
          { $inc: { "variants.$.stock": -deductionAmount } },
          { new: true }
        );
      }
    });

    await Promise.all(operations);
    console.log(`📦 Inventory Update: Successfully deducted stock metrics for ${items.length} items.`);
    return { success: true };
  } catch (error) {
    console.error("🚨 Critical Error updating inventory stock on checkout:", error.message);
    // Log failure securely, but avoid throwing an unhandled exception to prevent breaking the payment route response lifecycle
    return { success: false, error: error.message };
  }
};