import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function LowStockAlerts({ backendUrl, token }) {
  const [standardAlerts, setStandardAlerts] = useState([]);
  const [variantAlerts, setVariantAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/inventory/low-stock-alerts`, {
        headers: { token }
      });
      if (res.data.success) {
        setStandardAlerts(res.data.standardItems || []);
        setVariantAlerts(res.data.variantItems || []);
      }
    } catch (err) {
      toast.error("Failed to fetch shop inventory warning matrix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans w-full">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">⚠️ Warehouse Critical Stock Metrics</h2>
            <p className="text-xs text-gray-500">Real-time alerts for depleted frames and prescription matrix lines.</p>
          </div>
          <button onClick={fetchAlerts} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase px-4 py-2 rounded shadow">
            Refresh Monitor 🔄
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-gray-400 italic">Scanning database inventory tracks...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUMN A: STANDARD ITEMS (FRAMES, SUNGLASSES) */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider mb-3 border-b pb-2 flex justify-between">
                <span>👓 Depleted Base Frames & Accessories</span>
                <span className="bg-rose-100 text-rose-700 px-1.5 rounded">{standardAlerts.length} Alerts</span>
              </h3>
              
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase"><th className="p-2">SKU / Item</th><th className="p-2 text-center">In Stock</th><th className="p-2 text-center">Alert Limit</th></tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {standardAlerts.length === 0 ? <tr><td colSpan="3" className="p-4 text-center italic text-gray-400">All frames within stable inventory parameters.</td></tr> :
                      standardAlerts.map(item => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="p-2"><span className="font-bold block">{item.brand} - {item.name}</span><span className="font-mono text-[10px] text-gray-400">SKU: {item.sku} ({item.category})</span></td>
                          <td className="p-2 text-center font-mono font-black text-sm text-rose-600 bg-rose-50/40">{item.stock} Units</td>
                          <td className="p-2 text-center font-mono text-gray-400">{item.minStockAlert}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

            {/* COLUMN B: VARIANT ITEMS (LENSES, CONTACTS POWER RATINGS) */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-200">
              <h3 className="text-xs font-black text-amber-600 uppercase tracking-wider mb-3 border-b pb-2 flex justify-between">
                <span>🔬 Depleted Prescription Power Matrices</span>
                <span className="bg-amber-100 text-amber-700 px-1.5 rounded">{variantAlerts.length} Alerts</span>
              </h3>
              
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase"><th className="p-2">Prescription Line Definition</th><th className="p-2 text-center">Count</th></tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {variantAlerts.length === 0 ? <tr><td colSpan="2" className="p-4 text-center italic text-gray-400">Prescription matrix storage parameters safe.</td></tr> :
                      variantAlerts.map((v, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-2"><span className="font-bold block">{v.name}</span><span className="font-mono text-[10px] text-cyan-700 bg-cyan-50 px-1 rounded">{v.powerSpecs}</span><p className="font-mono text-[9px] text-gray-400 mt-0.5">Parent SKU: {v.parentSku}</p></td>
                          <td className="p-2 text-center font-mono font-black text-sm text-amber-600 bg-amber-50/40">{v.stock} Left</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}