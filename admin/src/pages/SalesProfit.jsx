import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// Hardcoded inline safe definition to avoid relative path tracking bugs
const currencySymbol = "₹";

export default function SalesProfitReport({ backendUrl, token }) {
  const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  // State Management
  const [fromDate, setFromDate] = useState(getTodayString());
  const [toDate, setToDate] = useState(getTodayString());
  const [profitRecords, setProfitRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Accumulated Multi-Breakdown Totals Container
  const [summaryTotals, setSummaryTotals] = useState({
    totalSalesRevenue: 0,
    totalFrameCosts: 0,
    totalLensTypeCosts: 0,
    totalLensFeatureCosts: 0,
    totalCombinedCosts: 0,
    totalProfitVolume: 0,
    netProfitPercentage: 0,
  });

  const fetchSalesProfitData = async () => {
    if (!backendUrl || !token) return;
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/invoice/reports/sales-profit-range?from=${fromDate}&to=${toDate}`,
        { headers: { token } }
      );

      if (response.data.success) {
        const records = response.data.bills || [];
        setProfitRecords(records);

        // Reset accumulation metrics
        let sumSales = 0;
        let sumFrames = 0;
        let sumLensTypes = 0;
        let sumLensFeatures = 0;
        let sumTotalCosts = 0;
        let sumProfit = 0;

        records.forEach((bill) => {
          sumSales += Number(bill.billAmount || 0);
          sumFrames += Number(bill.frameCostTotal || 0);
          sumLensTypes += Number(bill.lensTypeCostTotal || 0);
          sumLensFeatures += Number(bill.lensFeatureCostTotal || 0);
          sumTotalCosts += Number(bill.totalBillCost || 0);
          sumProfit += Number(bill.profitAmount || 0);
        });

        const compositePercentage = sumSales > 0 ? (sumProfit / sumSales) * 100 : 0;

        setSummaryTotals({
          totalSalesRevenue: sumSales,
          totalFrameCosts: sumFrames,
          totalLensTypeCosts: sumLensTypes,
          totalLensFeatureCosts: sumLensFeatures,
          totalCombinedCosts: sumTotalCosts,
          totalProfitVolume: sumProfit,
          netProfitPercentage: Number(compositePercentage.toFixed(4)),
        });
      } else {
        toast.error(response.data.message || "Failed to process target ledger matrices.");
      }
    } catch (err) {
      console.error("Profit extraction failure:", err);
      toast.error("Error communicating with data cluster nodes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesProfitData();
  }, [fromDate, toDate, backendUrl, token]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-white border border-slate-300 shadow-md rounded-lg p-4 sm:p-6 font-sans text-slate-800">
      
      {/* 🏛️ HEADER BLOCK */}
      <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 select-none">
        <h1 className="text-xl font-black tracking-widest uppercase text-slate-900">
          SUPER OPTICALS
        </h1>
        <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-tight mt-0.5">
          Admin Workspace • Cost Separation Profit Analyzer Matrix
        </p>
        <div className="mt-3 inline-block bg-slate-100 border border-slate-300 px-4 py-1 rounded-md text-xs font-black text-slate-800 uppercase font-mono">
          Billwise Summary from {new Date(fromDate).toLocaleDateString("en-IN")} to {new Date(toDate).toLocaleDateString("en-IN")}
        </div>
      </div>

      {/* 📅 FILTER PANEL */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="text-xs font-black uppercase text-slate-500 font-mono tracking-wider">
          📊 Scope Parameters
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-2 py-1 border rounded-lg shadow-inner">
            <label className="text-[10px] font-black uppercase text-slate-500 font-mono">From:</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-1 font-bold font-mono text-xs text-slate-800 outline-none" />
          </div>
          <div className="flex items-center gap-2 bg-white px-2 py-1 border rounded-lg shadow-inner">
            <label className="text-[10px] font-black uppercase text-slate-500 font-mono">To:</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-1 font-bold font-mono text-xs text-slate-800 outline-none" />
          </div>
          <button onClick={fetchSalesProfitData} className="bg-slate-800 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-md shadow transition-all">
            🔄 Refresh Registry
          </button>
        </div>
      </div>

      {/* 📊 ITEMIZED BREAKDOWN MATRIX TABLE */}
      <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left font-mono text-xs">
            <thead>
              <tr className="bg-slate-800 text-slate-200 border-b border-slate-900 font-bold uppercase tracking-wider text-[10px] select-none">
                <th className="p-3 border-r border-slate-700 text-center w-12">SNo</th>
                <th className="p-3 border-r border-slate-700 w-28">Bill No</th>
                <th className="p-3 border-r border-slate-700 w-44">Customer Name</th>
                <th className="p-3 border-r border-slate-700 text-right bg-slate-900/20">Frame Cost</th>
                <th className="p-3 border-r border-slate-700 text-right bg-slate-900/20">Lens Cost</th>
                <th className="p-3 border-r border-slate-700 text-right bg-slate-900/20">Feature Cost</th>
                <th className="p-3 border-r border-slate-700 text-right font-black text-amber-300">Total Cost</th>
                <th className="p-3 border-r border-slate-700 text-right font-black text-cyan-300">Bill Total</th>
                <th className="p-3 border-r border-slate-700 text-right font-black text-emerald-300">Net Profit</th>
                <th className="p-3 text-right text-slate-300">% Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 font-bold italic text-sm uppercase">
                    🔄 Deconstructing components and resolving individual line pricing logs...
                  </td>
                </tr>
              ) : profitRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-slate-400 font-bold italic text-sm uppercase">
                    📭 No unique bill transactions logged inside this partition.
                  </td>
                </tr>
              ) : (
                profitRecords.map((bill, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 border-r text-center font-bold bg-slate-50 text-slate-400">{index + 1}</td>
                    <td className="p-2.5 border-r font-black text-slate-900 uppercase">{bill.billNumber}</td>
                    <td className="p-2.5 border-r font-bold uppercase text-slate-800 truncate max-w-[150px]">{bill.customerName}</td>
                    <td className="p-2.5 border-r text-right text-slate-600 bg-slate-50/50">
                      {currencySymbol}{bill.frameCostTotal?.toFixed(2)}
                    </td>
                    <td className="p-2.5 border-r text-right text-slate-600 bg-slate-50/50">
                      {currencySymbol}{bill.lensTypeCostTotal?.toFixed(2)}
                    </td>
                    <td className="p-2.5 border-r text-right text-slate-600 bg-slate-50/50">
                      {currencySymbol}{bill.lensFeatureCostTotal?.toFixed(2)}
                    </td>
                    <td className="p-2.5 border-r text-right font-bold text-amber-700 bg-amber-50/10">
                      {currencySymbol}{bill.totalBillCost?.toFixed(2)}
                    </td>
                    <td className="p-2.5 border-r text-right font-black text-slate-900 bg-slate-50/30">
                      {currencySymbol}{bill.billAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`p-2.5 border-r text-right font-black ${bill.profitAmount >= 0 ? 'text-emerald-600 bg-emerald-50/10' : 'text-rose-600 bg-rose-50/10'}`}>
                      {bill.profitAmount >= 0 ? '+' : ''}{currencySymbol}{bill.profitAmount?.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-black text-cyan-700">
                      {bill.profitPercentage?.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* 🎯 SEPARATED COMPOSITE MATRIX TOTALS FOOTER ROW */}
            {!isLoading && profitRecords.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-slate-900 uppercase text-[10px] tracking-tight">
                  <td colSpan="3" className="p-3 border-r border-slate-300 text-right text-slate-800 font-black text-xs">
                    Cumulative Totals:
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-bold text-slate-700 bg-slate-200/40">
                    {currencySymbol}{summaryTotals.totalFrameCosts?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-bold text-slate-700 bg-slate-200/40">
                    {currencySymbol}{summaryTotals.totalLensTypeCosts?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-bold text-slate-700 bg-slate-200/40">
                    {currencySymbol}{summaryTotals.totalLensFeatureCosts?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-black text-amber-900 bg-amber-100/50">
                    {currencySymbol}{summaryTotals.totalCombinedCosts?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-black text-slate-950 text-xs bg-slate-200">
                    {currencySymbol}{summaryTotals.totalSalesRevenue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 border-r border-slate-300 text-right font-black text-emerald-700 text-xs bg-emerald-100/60">
                    {currencySymbol}{summaryTotals.totalProfitVolume?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-right font-black text-cyan-800 text-xs bg-cyan-100/60">
                    {summaryTotals.netProfitPercentage?.toFixed(4)}%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}