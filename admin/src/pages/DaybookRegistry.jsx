import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function DaybookRegistry({ backendUrl, token }) {
  const [daybookDate, setDaybookDate] = useState(new Date().toISOString().split("T")[0]);
  const [daybookRows, setDaybookRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDaybook = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/accounting/daybook`, {
        headers: { token, Authorization: `Bearer ${token}` },
        params: { date: daybookDate }
      });
      if (res.data.success) {
        setDaybookRows(res.data.entries || []);
        toast.success("Daybook ledger updated!");
      }
    } catch (err) {
      console.error("Daybook loading failure:", err);
      toast.error("Failed to load today's daybook logs.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch data whenever the date changes
  useEffect(() => {
    fetchDaybook();
  }, [daybookDate]);

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="border-b pb-3 mb-4 flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">📑 Daily Daybook Registry Chronicle</h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-bold">Audit Mode</span>
      </div>

      <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
        <div className="space-y-0.5">
          <label className="block text-[10px] font-bold text-gray-500 uppercase">Target Operating Date</label>
          <input 
            type="date" 
            value={daybookDate} 
            onChange={(e) => setDaybookDate(e.target.value)} 
            className="border border-slate-300 rounded p-2 text-sm font-bold font-mono outline-none bg-white focus:border-blue-500 shadow-sm" 
          />
        </div>
        <button 
          onClick={fetchDaybook} 
          disabled={loading}
          className="mt-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-400 text-white font-bold text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg shadow dynamic-transition"
        >
          {loading ? "Syncing..." : "Query Register Records 🔍"}
        </button>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white font-bold uppercase select-none">
              <th className="p-3.5 tracking-wide">Doc No</th>
              <th className="p-3.5 tracking-wide">Particulars / Account Element</th>
              <th className="p-3.5 tracking-wide">Channel Mode</th>
              <th className="p-3.5 tracking-wide text-right">Inflow (In)</th>
              <th className="p-3.5 tracking-wide text-right">Outflow (Out)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {daybookRows.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center italic text-gray-400 bg-slate-25 font-bold">
                  No transaction or balance records filed for this chronological date parameter.
                </td>
              </tr>
            ) : (
              daybookRows.map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-slate-900">{row.docNum}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{row.particulars}</td>
                  <td className="p-3.5"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold font-mono text-[10px]">{row.mode}</span></td>
                  <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">₹{(row.inflow || 0).toFixed(2)}</td>
                  <td className="p-3.5 text-right font-mono text-rose-600 font-bold">₹{(row.outflow || 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}