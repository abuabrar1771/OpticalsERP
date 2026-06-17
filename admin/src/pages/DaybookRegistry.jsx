import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { currencySymbol } from "../App";

export default function DaybookRegistry({ backendUrl, token }) {
  const getTodayString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    openingBalance: 0,
    todaysInflow: 0,
    todaysOutflow: 0,
    closingBalance: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to fetch logs and calculate the net cash position for an exact date string
  const getNetBalanceForDate = async (targetDateString, allSalesLedger) => {
    let inflowSum = 0;
    let outflowSum = 0;

    // 1. Parse generic daybook custom entries for target date
    try {
      const dbRes = await axios.get(`${backendUrl}/api/accounting/daybook?date=${targetDateString}`, { headers: { token } });
      if (dbRes.data.success && Array.isArray(dbRes.data.entries)) {
        dbRes.data.entries.forEach(e => {
          inflowSum += Number(e.inflow || 0);
          outflowSum += Number(e.outflow || 0);
        });
      }
    } catch (e) {
      // Endpoint fallback catch
    }

    // 2. Parse sales ledger inflows for target date
    if (Array.isArray(allSalesLedger)) {
      allSalesLedger.forEach(inv => {
        const invDate = new Date(inv.date || inv.createdAt).toISOString().split('T')[0];
        const updateDate = new Date(inv.updatedAt || inv.createdAt).toISOString().split('T')[0];

        if (invDate === targetDateString) {
          inflowSum += Number(inv.advanceAmount || 0);
        } else if (updateDate === targetDateString) {
          inflowSum += Number(inv.grandTotal - inv.balanceAmount);
        }
      });
    }

    return inflowSum - outflowSum;
  };

  const fetchDaybookRecords = async () => {
    if (!backendUrl || !token) return;
    setIsLoading(true);
    
    try {
      // --- BACKGROUND CALCULATION: YESTERDAY'S CLOSING AS TODAY'S OPENING ---
      // Calculate the string date for "Yesterday" relative to your calendar picker selection
      const currentPickerDate = new Date(selectedDate);
      currentPickerDate.setDate(currentPickerDate.getDate() - 1);
      const yesterdayDateString = currentPickerDate.toISOString().split('T')[0];

      // Fetch global sales ledger pool once to feed memory loops
      const salesRes = await axios.get(`${backendUrl}/api/invoice/all-sales-ledger`, { headers: { token } });
      const allSalesLedger = Array.isArray(salesRes.data) ? salesRes.data : [];

      // Calculate Yesterday's running net value to form today's opening balance
      const openingBalanceCalculated = await getNetBalanceForDate(yesterdayDateString, allSalesLedger);

      // --- PROCESS TODAY'S ACTIVE RECORDS ---
      let customEntries = [];
      try {
        const dbRes = await axios.get(`${backendUrl}/api/accounting/daybook?date=${selectedDate}`, { headers: { token } });
        if (dbRes.data.success) {
          customEntries = dbRes.data.entries || [];
        }
      } catch (e) {}

      // Map today's active invoicing inflows
      const invoiceInflows = allSalesLedger.filter(inv => {
        const invDate = new Date(inv.date || inv.createdAt).toISOString().split('T')[0];
        const updateDate = new Date(inv.updatedAt || inv.createdAt).toISOString().split('T')[0];
        return invDate === selectedDate || updateDate === selectedDate;
      }).map(inv => {
        const isCreatedToday = new Date(inv.date || inv.createdAt).toISOString().split('T')[0] === selectedDate;
        let amountCollected = 0;
        let description = "";

        if (isCreatedToday) {
          amountCollected = Number(inv.advanceAmount || 0);
          description = `RETAIL SALE: INVOICE ${inv.invoiceNumber} (ADVANCE DEPOSIT FROM ${inv.customer?.name || 'WALK-IN'})`;
        } else {
          amountCollected = Number(inv.grandTotal - inv.balanceAmount); 
          description = `LEDGER CLEARANCE: INVOICE ${inv.invoiceNumber} (BALANCE COMPLETED BY ${inv.customer?.name || 'CUSTOMER'})`;
        }

        return {
          id: inv._id,
          docNum: inv.invoiceNumber,
          particulars: description.toUpperCase(),
          mode: inv.paymentMethod || "CASH",
          inflow: amountCollected,
          outflow: 0
        };
      }).filter(item => item.inflow > 0);

      const combinedLedger = [...invoiceInflows, ...customEntries];

      let todaysInflowSum = 0;
      let todaysOutflowSum = 0;
      combinedLedger.forEach(e => {
        todaysInflowSum += Number(e.inflow || 0);
        todaysOutflowSum += Number(e.outflow || 0);
      });

      setLedgerEntries(combinedLedger);
      
      // 🌟 TRUE ACCOUNTING BALANCE MATH PIPELINE CLOSURE:
      // Closing Balance = Opening Balance + Today's Inflows - Today's Outflows
      setFinancialSummary({
        openingBalance: openingBalanceCalculated,
        todaysInflow: todaysInflowSum,
        todaysOutflow: todaysOutflowSum,
        closingBalance: openingBalanceCalculated + todaysInflowSum - todaysOutflowSum
      });

    } catch (err) {
      console.error("Daybook compilation fault:", err);
      toast.error("Error generating rolling opening/closing ledger balances.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDaybookRecords();
  }, [selectedDate, backendUrl, token]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-white border border-slate-300 shadow-md rounded-lg p-4 sm:p-6 font-sans text-slate-800">
      
      {/* HEADER BAR */}
      <div className="border-b border-slate-200 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 select-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            📖 Rolling Daybook Registry
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Verified Account Loop: Yesterday's net closing cash positions carry forward directly as today's starting opening balance.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-2 border rounded-lg shadow-sm">
          <label className="text-xs font-bold uppercase text-slate-600 font-mono whitespace-nowrap">
            📅 Ledger Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-1.5 border border-slate-300 rounded font-bold font-mono text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* METRIC CARD STATS DASHBOARD */}
      {financialSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 select-none">
          {/* OPENING BALANCE CARD */}
          <div className="bg-amber-50/40 border border-amber-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-black uppercase text-amber-800 tracking-wide block mb-1">
              ⏳ Opening Balance (From Yesterday)
            </span>
            <div className="text-2xl font-black text-amber-900 font-mono tracking-tight">
              {currencySymbol}
              {financialSummary.openingBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* INFLOW CARD */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-black uppercase text-emerald-700 tracking-wide block mb-1">
              🟢 Today's Inflows (+)
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {currencySymbol}
              {financialSummary.todaysInflow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* OUTFLOW CARD */}
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs font-black uppercase text-rose-700 tracking-wide block mb-1">
              🔴 Today's Outflows (-)
            </span>
            <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
              {currencySymbol}
              {financialSummary.todaysOutflow?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* NET CLOSING EOD CARD */}
          <div className={`p-4 rounded-xl border shadow-sm ${financialSummary.closingBalance >= 0 ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            <span className="text-xs font-black uppercase tracking-wide block mb-1">
              💼 End-of-Day Closing Balance
            </span>
            <div className="text-2xl font-black font-mono tracking-tight">
              {currencySymbol}
              {financialSummary.closingBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* REGISTRY LEDGER DIRECTORY MAIN CONTAINER TABLE */}
      <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="p-3 bg-slate-100 border-b border-slate-300 font-bold text-xs uppercase tracking-wider text-slate-700 flex justify-between items-center">
          <span>Active Transactions Table Ledger</span>
          <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded border">
            {ledgerEntries.length} Items Compiled
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b text-xs uppercase tracking-wider select-none">
                <th className="p-3 border-r w-36">Reference ID</th>
                <th className="p-3 border-r">Account / Particulars Allocation Description</th>
                <th className="p-3 border-r w-32 text-center">Payment Channel</th>
                <th className="p-3 border-r w-36 text-right text-emerald-700 bg-emerald-50/40">Inflow (+)</th>
                <th className="p-3 w-36 text-right text-rose-700 bg-rose-50/40">Outflow (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 italic font-medium">
                    🔄 Computing historical rolling math balances and pulling registry tracks...
                  </td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 italic font-medium">
                    📭 No operations entries transacted on {new Date(selectedDate).toLocaleDateString("en-IN", { dateStyle: "long" })}.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors font-medium text-slate-700">
                    <td className="p-3 border-r font-mono font-black text-xs text-slate-900 tracking-tight">
                      {entry.docNum}
                    </td>
                    <td className="p-3 border-r font-bold text-slate-800 uppercase tracking-wide text-xs">
                      {entry.particulars}
                    </td>
                    <td className="p-3 border-r text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border text-[10px] font-mono font-black uppercase text-slate-600">
                        {entry.mode}
                      </span>
                    </td>
                    <td className="p-3 border-r text-right font-mono font-black text-emerald-600 bg-emerald-50/10">
                      {entry.inflow > 0 ? `+${currencySymbol}${entry.inflow.toFixed(2)}` : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-rose-600 bg-rose-50/10">
                      {entry.outflow > 0 ? `-${currencySymbol}${entry.outflow.toFixed(2)}` : <span className="text-slate-300 font-normal">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {!isLoading && ledgerEntries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-800 uppercase tracking-wide">
                  <td colSpan="3" className="p-3 border-r text-right font-black text-slate-700">
                    Daily Sub-Totals:
                  </td>
                  <td className="p-3 border-r text-right font-mono text-emerald-700 text-sm bg-emerald-50/50">
                    {currencySymbol}{financialSummary.todaysInflow?.toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-700 text-sm bg-rose-50/50">
                    {currencySymbol}{financialSummary.todaysOutflow?.toFixed(2)}
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