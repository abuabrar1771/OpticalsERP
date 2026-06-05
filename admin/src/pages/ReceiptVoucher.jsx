import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const incomeCategories = [
  "Credit Customer", "Bank Interest", "Optical Insurance Payout", 
  "Scrap/Old Frame Sale", "Commission Received", "Other Income"
];

export default function ReceiptVoucher({ backendUrl, token }) {
  const [voucherData, setVoucherData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: incomeCategories[0],
    amount: "", paymentMode: "Cash", receivedByPaidTo: "", referenceNumber: "", notes: ""
  });

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  
  const dropdownRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setCustomerSuggestions([]);
        setActiveSuggestionIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (voucherData.category === "Credit Customer" && customerQuery.trim().length >= 1) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await axios.get(`${backendUrl}/api/inventory/search-customer`, {
            headers: { token, Authorization: `Bearer ${token}` },
            params: { mobileNum: customerQuery.trim() }
          });
          if (res.data.success) {
            setCustomerSuggestions(res.data.customerMatches || res.data.history || []);
            setActiveSuggestionIndex(-1);
          }
        } catch (err) {
          setCustomerSuggestions([]);
          setActiveSuggestionIndex(-1);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setCustomerSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  }, [customerQuery, voucherData.category, backendUrl, token]);

  const selectCreditCustomer = (cust) => {
    const formattedTitle = `${cust.patientName.toUpperCase()} (${cust.patientMobile})`;
    setVoucherData(prev => ({ ...prev, receivedByPaidTo: formattedTitle }));
    setCustomerQuery(formattedTitle);
    setCustomerSuggestions([]);
    setActiveSuggestionIndex(-1);
    toast.info(`Connected to profile: ${cust.patientName.toUpperCase()}`);

    setTimeout(() => {
      const amountInput = document.querySelector('input[name="receiptAmount"]');
      if (amountInput) amountInput.focus();
    }, 50);
  };

  // 🌟 Master Form Keyboard Matrix Router
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      // 1. If dropdown suggestions are active, let the specific customer engine handle it
      if (customerSuggestions.length > 0) return;

      // 2. Safely allow normal submit behavior if focus is already on the final CTA button
      if (e.target.type === "submit") return;

      // 3. Prevent default carriage form submission
      e.preventDefault();

      // Find all focusable interactive inputs within this form workspace
      const elements = Array.from(
        formRef.current.querySelectorAll("input:not([disabled]):not([readonly]), select, button[type='submit']")
      );
      
      const currentIndex = elements.indexOf(e.target);
      if (currentIndex >= 0 && currentIndex < elements.length - 1) {
        elements[currentIndex + 1].focus(); // Leap focus ahead cleanly
      }
    }
  };

  const handleCustomerKeyDown = (e) => {
    if (customerSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) => {
        const nextIndex = prevIndex < customerSuggestions.length - 1 ? prevIndex + 1 : prevIndex;
        if (scrollContainerRef.current && scrollContainerRef.current.children[nextIndex]) {
          scrollContainerRef.current.children[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        return nextIndex;
      });
    } 
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prevIndex) => {
        const nextIndex = prevIndex > 0 ? prevIndex - 1 : 0;
        if (scrollContainerRef.current && scrollContainerRef.current.children[nextIndex]) {
          scrollContainerRef.current.children[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        return nextIndex;
      });
    } 
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && customerSuggestions[activeSuggestionIndex]) {
        selectCreditCustomer(customerSuggestions[activeSuggestionIndex]);
      } else if (customerSuggestions.length > 0) {
        selectCreditCustomer(customerSuggestions[0]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!voucherData.amount || !voucherData.receivedByPaidTo) {
      toast.error("Please complete the required Amount and Remitter fields.");
      return;
    }
    try {
      const res = await axios.post(`${backendUrl}/api/accounting/add-voucher`, { type: "Receipt", ...voucherData }, { headers: { token } });
      if (res.data.success) {
        toast.success(res.data.message || "Receipt Voucher Logged! 📥");
        setVoucherData({
          date: new Date().toISOString().split("T")[0], category: incomeCategories[0],
          amount: "", paymentMode: "Cash", receivedByPaidTo: "", referenceNumber: "", notes: ""
        });
        setCustomerQuery("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Voucher transmission failure.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200 overflow-visible">
      <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-4 border-b pb-2">📥 Incoming Receipt (Income / Collections Entry)</h3>
      
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Voucher Date</label>
            <input type="date" value={voucherData.date} onChange={(e) => setVoucherData({...voucherData, date: e.target.value})} className="w-full border rounded p-2 text-sm font-bold font-mono outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Income Account</label>
            <select value={voucherData.category} onChange={(e) => { setVoucherData({...voucherData, category: e.target.value, receivedByPaidTo: ""}); setCustomerQuery(""); }} className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500">
              {incomeCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Payment Mode</label>
            <select value={voucherData.paymentMode} onChange={(e) => setVoucherData({...voucherData, paymentMode: e.target.value})} className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500">
              <option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option>
            </select>
          </div>
        </div>

        {voucherData.category === "Credit Customer" && (
          <div ref={dropdownRef} className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 relative z-50 space-y-1">
            <label className="block text-xs font-black text-blue-900 uppercase">👤 Search Credit Customer Profile (Type Name or Mobile No.)</label>
            <input 
              type="text" 
              value={customerQuery} 
              onChange={(e) => setCustomerQuery(e.target.value)} 
              onKeyDown={handleCustomerKeyDown} 
              placeholder="Type customer search parameters..." 
              className="w-full bg-white border border-blue-300 rounded px-3 py-2 text-sm font-bold uppercase shadow-sm outline-none focus:border-blue-500" 
              autoComplete="off" 
            />
            
            {customerSuggestions.length > 0 && (
              <div ref={scrollContainerRef} className="absolute left-4 right-4 bg-white border border-blue-400 rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y divide-gray-100 mt-1 z-50">
                {customerSuggestions.map((cust, idx) => (
                  <div 
                    key={cust._id || idx} 
                    onClick={() => selectCreditCustomer(cust)} 
                    className={`p-3 cursor-pointer flex justify-between items-center text-xs font-bold uppercase transition-all duration-100 ${
                      idx === activeSuggestionIndex ? "bg-blue-600 text-white font-extrabold translate-x-1" : "hover:bg-blue-50 text-slate-800 bg-white"
                    }`}
                  >
                    <span>{cust.patientName}</span>
                    <span className="font-mono opacity-80">{cust.patientMobile}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount Received (₹)</label>
            <input type="number" step="0.01" name="receiptAmount" value={voucherData.amount} onChange={(e) => setVoucherData({...voucherData, amount: e.target.value})} placeholder="0.00" className="w-full border rounded p-2 text-sm font-bold font-mono text-emerald-600 outline-none focus:border-cyan-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Received From / Depositor Remitter</label>
            <input 
              type="text" 
              value={voucherData.receivedByPaidTo} 
              onChange={(e) => setVoucherData({...voucherData, receivedByPaidTo: e.target.value})} 
              readOnly={voucherData.category === "Credit Customer"} 
              placeholder="Depositor Reference Name" 
              className={`w-full border rounded p-2 text-sm font-bold uppercase outline-none ${voucherData.category === "Credit Customer" ? "bg-gray-100 text-blue-800 border-blue-300" : "bg-white focus:border-cyan-500"}`} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ref Transaction No. (UPI ID/Chq)</label>
            <input type="text" value={voucherData.referenceNumber} onChange={(e) => setVoucherData({...voucherData, referenceNumber: e.target.value})} placeholder="Optional Reference" className="w-full border rounded p-2 text-sm font-mono outline-none focus:border-cyan-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Narration Statement Notes</label>
            <input type="text" value={voucherData.notes} onChange={(e) => setVoucherData({...voucherData, notes: e.target.value})} placeholder="Add bookkeeping description details notes..." className="w-full border rounded p-2 text-sm outline-none focus:border-cyan-500" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-8 rounded-lg text-xs uppercase tracking-wider shadow outline-none focus:ring-2 focus:ring-emerald-500">Save Receipt Transaction 📥</button>
        </div>
      </form>
    </div>
  );
}