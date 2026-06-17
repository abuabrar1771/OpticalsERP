import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const LensConfig = () => {
  const [configMode, setConfigMode] = useState('TYPE'); // 'TYPE' or 'FEATURE'
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sellingprice: '',
    costprice: '',
    category: 'LENS_TYPE'
  });

  // Available Options
  const lensTypes = ["Single Vision", "Bifocal", "Progressive", "Trifocal", "Multifocal"];
  const lensFeatures = [
    "Scratch Resistant", 
    "Anti-Reflection", 
    "UV Protection", 
    "Blue Filter", 
    "Dust and Water Resistant", 
    "Auto Cool"
  ];

  // Update category when toggle changes and reset numerical weights
  useEffect(() => {
    setFormData({ 
      name: '', 
      sellingprice: '', 
      costprice: '', 
      category: configMode === 'TYPE' ? 'LENS_TYPE' : 'LENS_FEATURE' 
    });
  }, [configMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sanity markup check warning to catch accidental losses
    if (Number(formData.costprice) > Number(formData.sellingprice)) {
      if (!window.confirm("⚠️ Warning: Cost price is higher than the Selling price. Proceed anyway?")) {
        return;
      }
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/api/lens/update-price', formData);
      if (response.data.success) {
        toast.success(`🎉 ${formData.name} accounting configuration updated!`);
        setFormData({ ...formData, name: '', sellingprice: '', costprice: '' });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate live inline gross margin for admin preview speed metrics
  const calculatedMargin = formData.sellingprice && formData.costprice
    ? Number(formData.sellingprice) - Number(formData.costprice)
    : 0;

  return (
    <div className="p-4 sm:p-8 bg-slate-50 h-fit min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Optical Lens Matrix Configurator</h2>

        {/* Toggle Switch */}
        <div className="flex p-1 bg-slate-200 rounded-xl mb-8 w-fit mx-auto select-none">
          <button
            type="button"
            onClick={() => setConfigMode('TYPE')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${configMode === 'TYPE' ? 'bg-white shadow-md text-cyan-600' : 'text-slate-600'}`}
          >
            Lens Structures / Types
          </button>
          <button
            type="button"
            onClick={() => setConfigMode('FEATURE')}
            className={`px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${configMode === 'FEATURE' ? 'bg-white shadow-md text-cyan-600' : 'text-slate-600'}`}
          >
            Treatments / Features
          </button>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          
          {/* Selection Dropdown */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-2 tracking-wide">
              Select target {configMode === 'TYPE' ? 'Lens Type' : 'Lens Feature'} variant profile
            </label>
            <select
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm font-bold bg-slate-50"
            >
              <option value="">-- Choose Option Blueprint --</option>
              {(configMode === 'TYPE' ? lensTypes : lensFeatures).map(item => (
                <option key={item} value={item}>{item.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* DUAL COSTING PRICING ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Cost Price Field */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-wide">
                Landing Cost Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  name="costprice"
                  value={formData.costprice}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-mono font-bold text-rose-700 bg-rose-50/10"
                />
              </div>
            </div>

            {/* Selling Price Field */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-2 tracking-wide">
                Standard Selling Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  name="sellingprice"
                  value={formData.sellingprice}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-mono font-black text-emerald-700 bg-emerald-50/10"
                />
              </div>
            </div>

          </div>

          {/* 📊 LIVE RUNTIME MARGIN WATCH HUD */}
          {formData.sellingprice && formData.costprice && (
            <div className={`p-3 rounded-xl border flex justify-between items-center font-mono text-xs font-bold transition-all ${calculatedMargin >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <span>INLINE GROSS MARGIN METRIC VALUE:</span>
              <span className="font-black">
                {calculatedMargin >= 0 ? '+' : ''}₹{calculatedMargin.toFixed(2)} 
                ({((calculatedMargin / Number(formData.sellingprice)) * 100).toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Descriptive Information Context */}
          <p className="text-[11px] text-slate-400 italic text-center select-none">
            {configMode === 'TYPE' 
              ? "Base structural configurations establish core prescriptive index rates." 
              : "Feature adjustments record supplementary item treatment cost deltas."}
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all disabled:bg-slate-400 shadow-md active:scale-[0.99]"
          >
            {loading ? 'Committing Ledger Changes...' : `Update Matrix Record Values`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LensConfig;