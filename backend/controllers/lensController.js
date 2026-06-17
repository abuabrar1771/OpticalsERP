import LensConfig from '../models/lensConfigModel.js';

// Export 1: Update Both Cost and Selling Prices
export const updateLensPrice = async (req, res) => {
  try {
    // 🌟 Destructure both costprice and sellingprice from your new frontend payload form
    const { name, sellingprice, costprice, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Configuration profile identifier label is missing." });
    }

    const updatedConfig = await LensConfig.findOneAndUpdate(
      { name: name.trim() }, 
      { 
        sellingprice: Number(sellingprice || 0), 
        costprice: Number(costprice || 0), 
        category, 
        lastUpdated: Date.now() 
      },
      { new: true, upsert: true, runValidators: true } // Upsert automatically creates the item if it doesn't exist yet!
    );

    return res.status(200).json({ success: true, data: updatedConfig });
  } catch (error) {
    console.error("Lens pricing config sync exception:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Export 2: Get All Configs
export const getAllLensConfigs = async (req, res) => {
  try {
    const configs = await LensConfig.find().sort({ name: 1 });
    return res.status(200).json({ success: true, data: configs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};