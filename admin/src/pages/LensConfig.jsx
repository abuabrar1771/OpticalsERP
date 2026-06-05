import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const LensConfig = () => {
  const [configMode, setConfigMode] = useState('TYPE'); // 'TYPE' or 'FEATURE'
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
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

  // Update category when toggle changes
  useEffect(() => {
    setFormData({ name: '', price: '', category: configMode === 'TYPE' ? 'LENS_TYPE' : 'LENS_FEATURE' });
  }, [configMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await axios.post('http://localhost:4000/api/lens/update-price', formData);
      if (response.data.success) {
        toast.success(`${formData.name} updated successfully!`);
        setFormData({ ...formData, name: '', price: '' });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 h-fit">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Lens Price Configuration</h2>

        {/* Toggle Switch */}
        <div className="flex p-1 bg-slate-200 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setConfigMode('TYPE')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${configMode === 'TYPE' ? 'bg-white shadow-md text-cyan-600' : 'text-slate-600'}`}
          >
            Lens Types
          </button>
          <button
            onClick={() => setConfigMode('FEATURE')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${configMode === 'FEATURE' ? 'bg-white shadow-md text-cyan-600' : 'text-slate-600'}`}
          >
            Lens Features
          </button>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-6">
            
            {/* Selection Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Select {configMode === 'TYPE' ? 'Lens Type' : 'Lens Feature'}
              </label>
              <select
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
              >
                <option value="">-- Choose Option --</option>
                {(configMode === 'TYPE' ? lensTypes : lensFeatures).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* Price Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {configMode === 'TYPE' ? 'Base Price (₹)' : 'Add-on Price (₹)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400">₹</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  className="w-full p-3 pl-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400 italic">
                {configMode === 'TYPE' 
                  ? "This is the starting price for the lens structure." 
                  : "This amount will be added to the base price when selected."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold text-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-400"
            >
              {loading ? 'Updating...' : `Save ${configMode === 'TYPE' ? 'Type' : 'Feature'} Price`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LensConfig;