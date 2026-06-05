import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddInStoreOrder = ({ backendUrl }) => {
  // Patient Details State
  const [patientName, setPatientName] = useState('');
  const [patientMobile, setPatientMobile] = useState('');
  const [doctorName, setDoctorName] = useState('In-Store Optometrist');
  const [lensType, setLensType] = useState('Single Vision');

  // Physical Inventory Linking State
  const [frameSku, setFrameSku] = useState('');
  const [lensProductSku, setLensProductSku] = useState(''); // To locate the Lens family in DB

  // Eye Power Matrix States (Matching your unified backend schema fields exactly)
  const [rightEye, setRightEye] = useState({ sph: '0.00', cyl: '0.00', axis: '0', add: '0.00', pd: '' });
  const [leftEye, setLeftEye] = useState({ sph: '0.00', cyl: '0.00', axis: '0', add: '0.00', pd: '' });

  const handlePowerChange = (eye, field, value) => {
    if (eye === 'right') {
      setRightEye(prev => ({ ...prev, [field]: value }));
    } else {
      setLeftEye(prev => ({ ...prev, [field]: value }));
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      // 1. Save Prescription Record to Database
      const prescriptionResponse = await axios.post(`${backendUrl}/api/inventory/save-prescription`, {
        patientName,
        patientMobile,
        doctorName,
        lensType,
        rightEye,
        leftEye
      });

      if (!prescriptionResponse.data.success) {
        toast.error(prescriptionResponse.data.message);
        return;
      }

      // 2. Trigger Frame Stock Deduction if a SKU was selected
      if (frameSku) {
        // We look up the product by SKU or ID first in your real app, passing -1 adjustment
        await axios.post(`${backendUrl}/api/inventory/update-stock`, {
          productId: frameSku, // Pass frame Mongo ID or adjust backend to look up via SKU
          adjustmentAmount: -1,
          isVariant: false
        });
      }

      // 3. Trigger Lens Variant Stock Matrix Deduction (2 lenses used for the pair)
      if (lensProductSku) {
        // Right eye lens matrix deduction
        const variantSkuRight = `${lensProductSku}-SPH${rightEye.sph}-CYL${rightEye.cyl}`;
        await axios.post(`${backendUrl}/api/inventory/update-stock`, {
          productId: lensProductSku,
          adjustmentAmount: -1,
          isVariant: true,
          variantSku: variantSkuRight
        });

        // Left eye lens matrix deduction (Only if powers are different, or run a second -1 deduction)
        const variantSkuLeft = `${lensProductSku}-SPH${leftEye.sph}-CYL${leftEye.cyl}`;
        await axios.post(`${backendUrl}/api/inventory/update-stock`, {
          productId: lensProductSku,
          adjustmentAmount: -1,
          isVariant: true,
          variantSku: variantSkuLeft
        });
      }

      toast.success("In-Store Job Created! Stock updated safely.");
      
      // Reset Form Fields
      setPatientName('');
      setPatientMobile('');
      setFrameSku('');
      setLensProductSku('');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Internal Connection Error");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-5xl mx-auto mt-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wider text-gray-800 border-b pb-3">
        👓 New In-Store Prescription & Custom Job Entry
      </h2>
      
      <form onSubmit={onSubmitHandler} className="space-y-6">
        {/* Row 1: Patient Basic Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Patient Name</label>
            <input type="text" required value={patientName} onChange={(e)=>setPatientName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black outline-none" placeholder="John Doe"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Mobile Number</label>
            <input type="tel" required value={patientMobile} onChange={(e)=>setPatientMobile(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black outline-none" placeholder="9876543210"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Prescribing Consultant / Dr.</label>
            <input type="text" value={doctorName} onChange={(e)=>setDoctorName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black outline-none"/>
          </div>
        </div>

        {/* Row 2: Lens Configurations & Material Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Lens Type Category</label>
            <select value={lensType} onChange={(e)=>setLensType(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none">
              <option value="Single Vision">Single Vision</option>
              <option value="Bifocal">Bifocal</option>
              <option value="Progressive">Progressive</option>
              <option value="Zero Power">Zero Power</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Selected Frame Asset ID/Product ID</label>
            <input type="text" value={frameSku} onChange={(e)=>setFrameSku(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black outline-none" placeholder="Enter Product MongoDB _id"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Selected Lens Family ID</label>
            <input type="text" value={lensProductSku} onChange={(e)=>setLensProductSku(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-black outline-none" placeholder="Enter Lens MongoDB _id"/>
          </div>
        </div>

        {/* 👁️ THE OPTICAL REFRACTION GRID PANEL 👁️ */}
        <div className="overflow-x-auto border rounded border-gray-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                <th className="p-3">Eye Track</th>
                <th className="p-3">Spherical (SPH)</th>
                <th className="p-3">Cylindrical (CYL)</th>
                <th className="p-3">Axis (AXIS)</th>
                <th className="p-3">Addition (ADD)</th>
                <th className="p-3">Pupillary Distance (PD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {/* Right Eye Matrix Inputs */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-cyan-700 uppercase tracking-wide">Right Eye (OD)</td>
                <td className="p-2"><input type="text" value={rightEye.sph} onChange={(e)=>handlePowerChange('right','sph',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={rightEye.cyl} onChange={(e)=>handlePowerChange('right','cyl',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={rightEye.axis} onChange={(e)=>handlePowerChange('right','axis',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={rightEye.add} onChange={(e)=>handlePowerChange('right','add',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={rightEye.pd} onChange={(e)=>handlePowerChange('right','pd',e.target.value)} className="w-24 border p-1 rounded text-center" placeholder="62mm"/></td>
              </tr>
              {/* Left Eye Matrix Inputs */}
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-purple-700 uppercase tracking-wide">Left Eye (OS)</td>
                <td className="p-2"><input type="text" value={leftEye.sph} onChange={(e)=>handlePowerChange('left','sph',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={leftEye.cyl} onChange={(e)=>handlePowerChange('left','cyl',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={leftEye.axis} onChange={(e)=>handlePowerChange('left','axis',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={leftEye.add} onChange={(e)=>handlePowerChange('left','add',e.target.value)} className="w-24 border p-1 rounded text-center"/></td>
                <td className="p-2"><input type="text" value={leftEye.pd} onChange={(e)=>handlePowerChange('left','pd',e.target.value)} className="w-24 border p-1 rounded text-center" placeholder="62mm"/></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Submit Execution Button */}
        <button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 px-4 rounded shadow uppercase tracking-wider text-xs transition-transform active:scale-[0.99]">
          Process Custom Shop Job & Book Order
        </button>
      </form>
    </div>
  );
};

export default AddInStoreOrder;