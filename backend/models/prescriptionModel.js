import mongoose from "mongoose";

// 👁️ Sub-document structure for individual eye metrics calculations
const eyePowerSchema = new mongoose.Schema({
  sph: { type: String, default: "0.00" },  // Spherical (e.g. -2.50, +1.25)
  cyl: { type: String, default: "0.00" },  // Cylindrical (for astigmatism corrections)
  axis: { type: String, default: "0" },     // Axis orientation angle degree (0 to 180)
  add: { type: String, default: "0.00" },  // Near-vision reading addition power scale
  pd: { type: String, default: "" }        // Pupillary Distance measurement string
});

// 📋 Master collection blueprint for persistent patient records mapping
const prescriptionSchema = new mongoose.Schema({
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: false 
  },
  patientName: { 
    type: String, 
    required: true 
  },
  patientMobile: { 
    type: String, 
    required: true // Will align with your system's unified +91 normalized tracking rules
  },
  rightEye: eyePowerSchema,
  leftEye: eyePowerSchema,
  lensType: { 
    type: String, 
    enum: ['Single Vision', 'Bifocal', 'Progressive', 'Zero Power'], 
    required: true 
  },
  doctorName: { 
    type: String, 
    default: "Self / In-Store" 
  },
  dateExamined: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  minimize: false // Ensures empty/default fields are preserved as object leaves in MongoDB documents
});

// Safe model export configuration context layer check
const prescriptionModel = mongoose.models.prescription || mongoose.model("prescription", prescriptionSchema);

export default prescriptionModel;