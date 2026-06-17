import mongoose from 'mongoose';

const lensConfigSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  sellingprice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  costprice: {
    type: Number,
    required: true,
    min: 0
  },
  category  : { 
    type: String, 
    required: true, 
    enum: ['LENS_TYPE', 'LENS_FEATURE'],
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

// Using export default for ES6 modules
const LensConfigModel = mongoose.model('LensConfig', lensConfigSchema);
export default LensConfigModel;