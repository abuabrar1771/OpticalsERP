import lensTypeModel from "../models/lensTypeModel.js";

const addLensType = async (req, res) => {
  try {
    const { name, price, brand } = req.body;

    const lensTypeExists = await lensTypeModel.findOne({ name });

    if (lensTypeExists) {
      return res.json({
        success: false,
        message: "The Lens Type already Exists",
      });
    }
    const lensData = new lensTypeModel({
      name,
      price: Number(price),
      brand,
    });
    await lensData.save();

    res.json({
      success: true,
      message: "Lens Type data Stored successfully",
      itemdata:lensData
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
const updateLensType = async (req, res) => {
  try {
    const { id, name, price, brand } = req.body;
    const updatedData = await lensTypeModel.findByIdAndUpdate(
        id,
      {
      name,
      price,
      brand,
    },
    { new: true 

    });
    if (!updatedData) {
      res.json({
        success: false,
        message: "Lens Type not Found",
      });
    }
    res.json({
      success: true,
      message: "Updated Successfully",
      product: updatedData,
    });
  } catch (error) {
    console.log(error);
    res.json({
        success:false,
        message:error.message
    })
  }
};
const getAllLensType = async(req,res)=>{
  try {
    const products = await lensTypeModel.find({})

    res.json({
      success:true,
      products
    })
  } catch (error) {
    console.log(error)
    res.json({
      success:false,
      message:error.message
    })
  }
};
const deleteLensType = async (req, res) => {
   try {
    const deletedItem = await lensTypeModel.findByIdAndDelete(req.body.id)

    res.json({
      success:true,
      message: "LensType removed Successfully",
      DeletedItem:deletedItem
    })
  } catch (error) {
     console.log(error)
    res.json({
      success:false,
      message:error.message
    })
  }
};
export { addLensType, updateLensType, deleteLensType,getAllLensType };
