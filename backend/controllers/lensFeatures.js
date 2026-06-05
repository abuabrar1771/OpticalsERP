import lensFeaturesModel from "../models/lensFeaturesModel.js";

const addLensFeature = async (req,res) => {
    try {
        const {prdId,name,price} = req.body;

        const lensFeatureExists = await lensFeaturesModel.findOne({prdId})

        if (lensFeatureExists){
            return res.json({
                success:false,
                message:"The Lens Feature Already Exists"
            })
        }
        const featureData = new lensFeaturesModel ({
            prdId,
            name,
            price:Number(price)
        })
        await featureData.save();
        res.json({
            success:true,
            message:"Lens Feature Added Successfully",
            FeatureData:featureData
        })
    } catch (error) {
        console.log(error);
        res.json({
            success:false,
            message:error.message
        })
    }
}
const updateFeature = async (req,res) =>{
    try {
        const { id,prdId, name, price, brand } = req.body;
    const updatedData = await lensFeaturesModel.findByIdAndUpdate(
        id,
      {
        prdId,
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
}
const getAllLensFeatures = async(req,res)=>{
  try {
    const products = await lensFeaturesModel.find({})

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
const deleteFeature = async (req, res) => {
   try {
    const { prdId } = req.body;
    const deletedItem = await lensFeaturesModel.findOneAndDelete({prdId: prdId})

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
export {addLensFeature,updateFeature,deleteFeature,getAllLensFeatures}