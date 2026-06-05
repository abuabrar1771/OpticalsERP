import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const categories = {
  Payment: ["Shop Rent", "Staff Salary", "Electricity Bill", "Telephone & Internet", "Optical Lab Maintenance", "Office Expenses", "Supplier Payment", "Marketing & Ads"],
  Receipt: ["Credit Customer", "Bank Interest", "Optical Insurance Payout", "Scrap/Old Frame Sale", "Commission Received", "Other Income"]
};

export default function AccountingDashboard({ backendUrl, token }) {
  const [activeTab, setActiveTab] = useState("voucher"); // voucher | daybook | pl

  // Voucher Form State
  const [vType, setVType] = useState("Payment");
  const [voucherData, setVoucherData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: categories.Payment[0],
    amount: "", paymentMode: "Cash", receivedByPaidTo: "", referenceNumber: "", notes: ""
  });

  // Credit Customer Autocomplete States
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const customerScrollRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync category state when voucher toggles between Payment vs Receipt
  useEffect(() => {
    setVoucherData(prev => ({ ...prev, category: categories[vType][0], receivedByPaidTo: "" }));
    setCustomerQuery("");
    setCustomerSuggestions([]);
  }, [vType]);

  // Close suggestions dropdown when clicking anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setCustomerSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =====================================================================
  // FIXED LOOKUP PIPELINE: Serializes payload into explicit query parameters
  // =====================================================================
  useEffect(() => {
    if (vType === "Receipt" && voucherData.category === "Credit Customer" && customerQuery.trim().length >= 1) {
      const delayDebounce = setTimeout(async () => {
        try {
          console.log("POS Counter search request fired for:", customerQuery.trim());
          
          const res = await axios.get(`${backendUrl}/api/inventory/search-customer`, {
            headers: { 
              token: token,
              Authorization: `Bearer ${token}` 
            },
            params: { 
              mobileNum: customerQuery.trim() 
            }
          });
          
          console.log("Server response received successfully:", res.data);

          if (res.data.success) {
            // Maps matching rows out of both potential object properties
            const matches = res.data.customerMatches || res.data.history || [];
            setCustomerSuggestions(matches);
            setCustomerActiveIndex(-1);
          } else {
            console.warn("Server processed lookup, but reported operational failure:", res.data.message);
            setCustomerSuggestions([]);
          }
        } catch (err) {
          console.error("CRITICAL EXCEPTION ENCOUNTERED DURING AUTOCOMPLETE NETWORK FETCH:");
          console.error("HTTP Status Code:", err.response?.status);
          console.error("Error Payload Message:", err.response?.data?.message || err.message);
          setCustomerSuggestions([]);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setCustomerSuggestions([]);
    }
  }, [customerQuery, voucherData.category, vType, backendUrl, token]);

  const selectCreditCustomer = (cust) => {
    const formattedTitle = `${cust.patientName.toUpperCase()} (${cust.patientMobile})`;
    
    setVoucherData(prev => ({
      ...prev,
      receivedByPaidTo: formattedTitle
    }));
    
    setCustomerQuery(formattedTitle);
    setCustomerSuggestions([]);
    setCustomerActiveIndex(-1);
    toast.info(`Connected to profile: ${cust.patientName.toUpperCase()}`);
    
    // Auto-focus move down to the Amount input box instantly
    setTimeout(() => {
      const amtInput = document.querySelector('input[name="voucherAmount"]');
      if (amtInput) amtInput.focus();
    }, 50);
  };

  const handleCustomerKeyDown = (e) => {
    if (customerSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerActiveIndex(p => {
        const n = p < customerSuggestions.length - 1 ? p + 1 : p;
        if (customerScrollRef.current && customerScrollRef.current.children[n]) {
          customerScrollRef.current.children[n].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return n;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerActiveIndex(p => {
        const n = p > 0 ? p - 1 : 0;
        if (customerScrollRef.current && customerScrollRef.current.children[n]) {
          customerScrollRef.current.children[n].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return n;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (customerActiveIndex >= 0) {
        selectCreditCustomer(customerSuggestions[customerActiveIndex]);
      } else if (customerSuggestions.length > 0) {
        selectCreditCustomer(customerSuggestions[0]);
      }
    }
  };

  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    if (!voucherData.amount || !voucherData.receivedByPaidTo) {
      toast.error("Please complete the required Amount and Payee/Recipient fields.");
      return;
    }
    try {
      const res = await axios.post(`${backendUrl}/api/accounting/add-voucher`, { type: vType, ...voucherData }, { headers: { token } });
      if (res.data.success) {
        toast.success(res.data.message);
        setVoucherData({
          date: new Date().toISOString().split("T")[0],
          category: categories[vType][0],
          amount: "", paymentMode: "Cash", receivedByPaidTo: "", referenceNumber: "", notes: ""
        });
        setCustomerQuery("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Voucher transmission failure.");
    }
  };

  const fetchDaybook = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/accounting/daybook?date=${daybookDate}`, { headers: { token } });
      if (res.data.success) setDaybookRows(res.data.entries);
    } catch (err) { toast.error("Error loading daybook."); }
  };

  const fetchPLReport = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/accounting/profit-loss?startDate=${plRange.start}&endDate=${plRange.end}`, { headers: { token } });
      if (res.data.success) setPlReport(res.data);
    } catch (err) { toast.error("Error generating P&L evaluation summary metrics."); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      if (e.target.name === "customerSearchField" && customerSuggestions.length > 0) return;
      e.preventDefault();
      const form = e.target.form;
      const index = Array.prototype.indexOf.call(form, e.target);
      if (form && form.elements[index + 1]) form.elements[index + 1].focus();
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans w-full">
      <ToastContainer position="top-right" compact />
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200 overflow-visible">
        
        {/* TAB HOOK BAR LAYOUT SELECTION NAVIGATION */}
        <div className="flex border-b mb-6 gap-2">
          {["voucher", "daybook", "pl"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2.5 px-6 uppercase font-bold text-xs tracking-wide rounded-t-lg transition-all ${activeTab === tab ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {tab === "voucher" ? "💰 Voucher Entry" : tab === "daybook" ? "📑 Daybook Registry" : "📊 Profit & Loss Analyzer"}
            </button>
          ))}
        </div>

        {/* TAB CONTROLLER PANEL A: VOUCHER CONFIGURATOR WORKSPACE */}
        {activeTab === "voucher" && (
          <form onSubmit={handleVoucherSubmit} onKeyDown={handleKeyDown} className="space-y-4 overflow-visible">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Create New Accounting Expense/Income Voucher Line</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Transaction Stream Profile</label>
                <select value={vType} onChange={(e) => setVType(e.target.value)} className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500">
                  <option value="Payment">Outgoing Payment (Expense)</option>
                  <option value="Receipt">Incoming Receipt (Non-Sales Income)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Voucher Date</label>
                <input type="date" value={voucherData.date} onChange={(e) => setVoucherData({...voucherData, date: e.target.value})} className="w-full border rounded p-2 text-sm font-bold outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ledger Category Account</label>
                <select value={voucherData.category} onChange={(e) => setVoucherData({...voucherData, category: e.target.value})} className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500">
                  {categories[vType].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* DYNAMIC CREDIT CUSTOMER AUTOCOMPLETE DROPDOWN CONTAINER */}
            {vType === "Receipt" && voucherData.category === "Credit Customer" && (
              <div ref={dropdownRef} className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 relative z-50 space-y-1 overflow-visible">
                <label className="block text-xs font-black text-blue-900 uppercase">👤 Search Credit Customer Profile (Type Name or Phone Number)</label>
                <input 
                  type="text"
                  name="customerSearchField"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Type parameters (e.g. NAGARAJ, 99999)..."
                  className="w-full bg-white border border-blue-300 rounded px-3 py-2 text-sm font-bold outline-none focus:border-blue-600 uppercase shadow-sm"
                  autoComplete="off"
                />
                
                {/* FLOATING LIST: Higher overlay priority prevents content clipping */}
                {customerSuggestions.length > 0 && (
                  <div ref={customerScrollRef} className="absolute left-4 right-4 bg-white border border-blue-400 rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y divide-gray-100 mt-1 z-50">
                    {customerSuggestions.map((cust, idx) => (
                      <div 
                        key={cust._id || idx} 
                        onClick={() => selectCreditCustomer(cust)}
                        className={`p-3 cursor-pointer flex justify-between items-center text-xs font-bold uppercase transition-colors ${
                          idx === customerActiveIndex ? "bg-blue-600 text-white font-extrabold" : "hover:bg-blue-50 bg-white text-slate-800"
                        }`}
                      >
                        <span>{cust.patientName}</span>
                        <span className="font-mono opacity-75">{cust.patientMobile}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount (₹)</label>
                <input type="number" step="0.01" name="voucherAmount" value={voucherData.amount} onChange={(e) => setVoucherData({...voucherData, amount: e.target.value})} placeholder="0.00" className="w-full border rounded p-2 text-sm font-bold font-mono text-rose-600 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">{vType === "Payment" ? "Paid To Name / Entity Person" : "Received From Depositor"}</label>
                <input 
                  type="text" 
                  value={voucherData.receivedByPaidTo} 
                  onChange={(e) => setVoucherData({...voucherData, receivedByPaidTo: e.target.value})} 
                  readOnly={vType === "Receipt" && voucherData.category === "Credit Customer"}
                  placeholder="e.g., Staff Name or Landlord" 
                  className={`w-full border rounded p-2 text-sm font-bold outline-none uppercase ${vType === "Receipt" && voucherData.category === "Credit Customer" ? "bg-gray-100 text-blue-800 border-blue-300 select-none" : "bg-white focus:border-cyan-500"}`} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Channel Mode</label>
                <select value={voucherData.paymentMode} onChange={(e) => setVoucherData({...voucherData, paymentMode: e.target.value})} className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500">
                  <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ref Transaction No. (UPI ID/Cheque)</label>
                <input type="text" value={voucherData.referenceNumber} onChange={(e) => setVoucherData({...voucherData, referenceNumber: e.target.value})} placeholder="Optional Reference" className="w-full border rounded p-2 text-sm font-mono outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Narration Statement Notes</label>
                <input type="text" value={voucherData.notes} onChange={(e) => setVoucherData({...voucherData, notes: e.target.value})} placeholder="Add bookkeeping description notes..." className="w-full border rounded p-2 text-sm outline-none" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-8 rounded-lg text-xs uppercase tracking-wider shadow">Save Voucher Ledger Transaction 💾</button>
            </div>
          </form>
        )}

        {/* DAYBOOK REGISTRY CHRONICLE VIEW */}
        {activeTab === "daybook" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
              <input type="date" value={daybookDate} onChange={(e) => setDaybookDate(e.target.value)} className="border rounded p-1.5 text-sm font-bold font-mono outline-none" />
              <button onClick={fetchDaybook} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase px-4 py-2 rounded shadow">Query Register Records 🔍</button>
            </div>
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold uppercase"><th className="p-3">Doc No</th><th className="p-3">Particulars / Account</th><th className="p-3">Channel Mode</th><th className="p-3 text-right">Inflow (In)</th><th className="p-3 text-right">Outflow (Out)</th></tr>
                </thead>
                <tbody className="divide-y font-medium text-slate-700">
                  {daybookRows.length === 0 ? <tr><td colSpan="5" className="p-6 text-center italic text-gray-400">No operations records registered for this chronological coordinate.</td></tr> : 
                    daybookRows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50"><td className="p-3 font-mono font-bold">{row.docNum}</td><td className="p-3">{row.particulars}</td><td className="p-3 font-bold text-gray-500">{row.mode}</td><td className="p-3 text-right font-mono text-emerald-600 font-bold">₹{row.inflow.toFixed(2)}</td><td className="p-3 text-right font-mono text-rose-600 font-bold">₹{row.outflow.toFixed(2)}</td></tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SYSTEM RANGE PROFIT & LOSS AUDITOR ANALYZER */}
        {activeTab === "pl" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border">
              <input type="date" value={plRange.start} onChange={(e) => setPlRange({...plRange, start: e.target.value})} className="border rounded p-1.5 text-sm font-mono outline-none" />
              <span className="text-gray-400 font-bold text-xs uppercase">to</span>
              <input type="date" value={plRange.end} onChange={(e) => setPlRange({...plRange, end: e.target.value})} className="border rounded p-1.5 text-sm font-mono outline-none" />
              <button onClick={fetchPLReport} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-5 py-2 rounded shadow">Compile Statement 📈</button>
            </div>

            {plReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
                {/* ACCOUNTING GENERAL LEDGER SUMMARY CARD PANEL */}
                <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg space-y-3.5">
                  <h4 className="text-xs text-slate-400 uppercase font-black tracking-widest border-b border-slate-800 pb-2">Periodic Revenue Performance Summary Ledger</h4>
                  <div className="flex justify-between items-center text-sm"><span>POS Counter Billing Income (+) :</span><span className="font-mono text-emerald-400 font-bold">₹{plReport.summary.tradingIncome.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between items-center text-sm"><span>Other Extra Income Receipts (+) :</span><span className="font-mono text-cyan-400">₹{plReport.summary.otherIncomeReceipts.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between items-center text-sm"><span>Supplier Stock Purchases Outlay (-) :</span><span className="font-mono text-rose-400">₹{plReport.summary.costOfGoodsPurchased.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between items-center text-sm"><span>Other Operating Vouchers Cost (-) :</span><span className="font-mono text-rose-400">₹{plReport.summary.otherOperatingExpenses.toLocaleString("en-IN")}</span></div>
                  <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-wide">Net Operational Yield Profile:</span>
                    <span className={`text-2xl font-mono font-black ${plReport.summary.netProfitOrLoss >= 0 ? "text-emerald-400" : "text-rose-500"}`}>₹{plReport.summary.netProfitOrLoss.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* DETAILED GROUP OPERATING VOUCHERS EXPENSES BREAKDOWN BREAKDOWN CARD PANEL */}
                <div className="border rounded-xl p-5 bg-white shadow-sm space-y-4">
                  <h4 className="text-xs text-gray-500 uppercase font-black tracking-wider border-b pb-2">Voucher Operating Expenses Distribution Matrix</h4>
                  {Object.keys(plReport.expenseBreakdown).length === 0 ? <p className="text-xs italic text-gray-400 text-center py-4">No structural expenses recorded across selected framework.</p> : 
                    Object.entries(plReport.expenseBreakdown).map(([category, amt]) => (
                      <div key={category} className="flex justify-between items-center text-xs border-b pb-1.5 last:border-0">
                        <span className="font-bold text-slate-700">{category}</span>
                        <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">₹{amt.toFixed(2)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}