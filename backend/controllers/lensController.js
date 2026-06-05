import LensConfig from '../models/lensConfigModel.js';

// Export 1: Update Price
export const updateLensPrice = async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const updatedConfig = await LensConfig.findOneAndUpdate(
      { name }, 
      { price: Number(price), category, lastUpdated: Date.now() },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, data: updatedConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export 2: Get All Configs (THIS WAS LIKELY MISSING)
export const getAllLensConfigs = async (req, res) => {
  try {
    const configs = await LensConfig.find();
    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};