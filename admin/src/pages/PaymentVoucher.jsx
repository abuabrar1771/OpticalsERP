import React, { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const expenseCategories = [
  "Shop Rent", 
  "Staff Salary", 
  "Electricity Bill", 
  "Telephone & Internet", 
  "Optical Lab Maintenance", 
  "Office Expenses", 
  "Supplier Payment", 
  "Marketing & Ads"
];

export default function PaymentVoucher({ backendUrl, token }) {
  const [voucherData, setVoucherData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: expenseCategories[0],
    amount: "", 
    paymentMode: "Cash", 
    receivedByPaidTo: "", 
    referenceNumber: "", 
    notes: ""
  });

  const formRef = useRef(null);

  // 🌟 Form Keyboard Focus Router Matrix
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      // Allow the standard submit action if the user is explicitly focusing on the save button
      if (e.target.type === "submit") return; 
      
      // Stop the form from submitting prematurely on intermediate fields
      e.preventDefault(); 

      // Gather all focusable form fields in exact reading order layout
      const elements = Array.from(
        formRef.current.querySelectorAll("input:not([disabled]):not([readonly]), select, button[type='submit']")
      );
      
      const currentIndex = elements.indexOf(e.target);
      if (currentIndex >= 0 && currentIndex < elements.length - 1) {
        elements[currentIndex + 1].focus(); // Advance focus straight to the next line item
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!voucherData.amount || !voucherData.receivedByPaidTo) {
      toast.error("Please complete the required Amount and Paid To fields.");
      return;
    }
    try {
      const res = await axios.post(`${backendUrl}/api/accounting/add-voucher`, { type: "Payment", ...voucherData }, { headers: { token } });
      if (res.data.success) {
        toast.success(res.data.message || "Expense Voucher Saved Successfully! 💾");
        setVoucherData({
          date: new Date().toISOString().split("T")[0], 
          category: expenseCategories[0],
          amount: "", 
          paymentMode: "Cash", 
          receivedByPaidTo: "", 
          referenceNumber: "", 
          notes: ""
        });
        
        // Reset focus back to the Date field for the next entry loop
        setTimeout(() => {
          const firstInput = formRef.current.querySelector("input[type='date']");
          if (firstInput) firstInput.focus();
        }, 50);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Voucher transmission failure.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-md border border-gray-200">
      <h3 className="text-sm font-black text-rose-800 uppercase tracking-wider mb-4 border-b pb-2">💰 Outgoing Payment (Expense Voucher Entry)</h3>
      
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Voucher Date</label>
            <input 
              type="date" 
              value={voucherData.date} 
              onChange={(e) => setVoucherData({...voucherData, date: e.target.value})} 
              className="w-full border rounded p-2 text-sm font-bold font-mono outline-none focus:border-cyan-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ledger Category Account</label>
            <select 
              value={voucherData.category} 
              onChange={(e) => setVoucherData({...voucherData, category: e.target.value})} 
              className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500"
            >
              {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Channel Mode</label>
            <select 
              value={voucherData.paymentMode} 
              onChange={(e) => setVoucherData({...voucherData, paymentMode: e.target.value})} 
              className="w-full border rounded p-2 text-sm font-bold bg-white outline-none focus:border-cyan-500"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Amount Paid Out (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              value={voucherData.amount} 
              onChange={(e) => setVoucherData({...voucherData, amount: e.target.value})} 
              placeholder="0.00" 
              className="w-full border rounded p-2 text-sm font-bold font-mono text-rose-600 outline-none focus:border-cyan-500" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Paid To Name / Beneficiary Entity</label>
            <input 
              type="text" 
              value={voucherData.receivedByPaidTo} 
              onChange={(e) => setVoucherData({...voucherData, receivedByPaidTo: e.target.value})} 
              placeholder="e.g. Landlord Name, Staff Name, or Supplier Company" 
              className="w-full border rounded p-2 text-sm font-bold uppercase outline-none focus:border-cyan-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Ref Transaction No. (UPI/Chq)</label>
            <input 
              type="text" 
              value={voucherData.referenceNumber} 
              onChange={(e) => setVoucherData({...voucherData, referenceNumber: e.target.value})} 
              placeholder="Optional Reference" 
              className="w-full border rounded p-2 text-sm font-mono outline-none focus:border-cyan-500" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Narration Statement Notes</label>
            <input 
              type="text" 
              value={voucherData.notes} 
              onChange={(e) => setVoucherData({...voucherData, notes: e.target.value})} 
              placeholder="Add bookkeeping description notes..." 
              className="w-full border rounded p-2 text-sm outline-none focus:border-cyan-500" 
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            className="bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 px-8 rounded-lg text-xs uppercase tracking-wider shadow outline-none focus:ring-2 focus:ring-rose-500"
          >
            Save Expense Transaction 💾
          </button>
        </div>
      </form>
    </div>
  );
}