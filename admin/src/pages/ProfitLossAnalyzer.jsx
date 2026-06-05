import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function ProfitLossAnalyzer({ backendUrl, token }) {
  const [plRange, setPlRange] = useState({ 
    start: new Date().toISOString().split("T")[0], 
    end: new Date().toISOString().split("T")[0] 
  });
  const [plReport, setPlReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPLReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/accounting/profit-loss`, {
        headers: { token, Authorization: `Bearer ${token}` },
        params: { startDate: plRange.start, endDate: plRange.end }
      });
      if (res.data.success) {
        setPlReport(res.data);
        toast.success("Financial evaluation summary ready!");
      }
    } catch (err) {
      console.error("P&L Compile breakdown failure:", err);
      toast.error("Error generating Profit & Loss evaluations statement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <div className="border-b pb-3 mb-4 flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">📊 Date-Range Profit & Loss Statement Analyzer</h3>
        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wide">Live Balances</span>
      </div>

      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase">From Date</label>
            <input type="date" value={plRange.start} onChange={(e) => setPlRange({...plRange, start: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm font-mono outline-none" />
          </div>
          <span className="text-gray-400 font-bold text-xs uppercase pt-4">to</span>
          <div className="space-y-0.5">
            <label className="block text-[10px] font-bold text-gray-500 uppercase">To Date</label>
            <input type="date" value={plRange.end} onChange={(e) => setPlRange({...plRange, end: e.target.value})} className="border border-slate-300 rounded p-1.5 text-sm font-mono outline-none" />
          </div>
        </div>
        <button 
          onClick={fetchPLReport} 
          disabled={loading}
          className="md:mt-4 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs uppercase tracking-wide px-6 py-2.5 rounded-lg shadow dynamic-transition"
        >
          {loading ? "Compiling..." : "Compile Statement 📈"}
        </button>
      </div>

      {plReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          {/* GENERAL LEDGER INCOME/EXPENSE REVENUE SUMMARY */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg space-y-4 border border-slate-950">
            <h4 className="text-xs text-slate-400 uppercase font-black tracking-widest border-b border-slate-800 pb-2">Periodic Revenue Performance Summary</h4>
            <div className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-1">
              <span>POS Counter Billing Income (+) :</span>
              <span className="font-mono text-emerald-400 font-bold">₹{(plReport.summary?.tradingIncome || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-1">
              <span>Other Extra Income Receipts (+) :</span>
              <span className="font-mono text-cyan-400">₹{(plReport.summary?.otherIncomeReceipts || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-1">
              <span>Supplier Stock Purchases Outlay (-) :</span>
              <span className="font-mono text-rose-400">₹{(plReport.summary?.costOfGoodsPurchased || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-slate-800/40 pb-1">
              <span>Other Operating Vouchers Cost (-) :</span>
              <span className="font-mono text-rose-400">₹{(plReport.summary?.otherOperatingExpenses || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
              <span className="font-black text-xs uppercase tracking-wider text-slate-300">Net Operational Yield Profile:</span>
              <span className={`text-2xl font-mono font-black ${ (plReport.summary?.netProfitOrLoss || 0) >= 0 ? "text-emerald-400" : "text-rose-500" }`}>
                ₹{(plReport.summary?.netProfitOrLoss || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* DETAILED GROUP OPERATING VOUCHERS EXPENSES BREAKDOWN */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-4">
            <h4 className="text-xs text-gray-500 uppercase font-black tracking-wider border-b pb-2">Voucher Expenses Distribution Matrix</h4>
            {!plReport.expenseBreakdown || Object.keys(plReport.expenseBreakdown).length === 0 ? (
              <p className="text-xs italic text-gray-400 text-center py-6">No structural voucher expenses recorded across this interval timeline.</p>
            ) : (
              Object.entries(plReport.expenseBreakdown).map(([category, amt]) => (
                <div key={category} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <span className="font-bold text-slate-700 uppercase tracking-wide">{category}</span>
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-100">₹{amt.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-300 rounded-xl p-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50">
          Select date boundaries above and click compilation trigger to audit system balances data.
        </div>
      )}
    </div>
  );
}