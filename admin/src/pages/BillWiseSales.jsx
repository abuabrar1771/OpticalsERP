import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  HiOutlineChartBar, 
  HiOutlineReceiptTax, 
  HiOutlineSearch, 
  HiOutlineFilter,
  HiOutlineCalendar,
  HiOutlineCurrencyRupee 
} from 'react-icons/hi';

export default function BillWiseSales({ backendUrl, token }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  
  // 🌟 NEW: Initialize state directly to today's date string (Format: YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch all physical retail invoices from your full sales ledger endpoint on mount
  useEffect(() => {
    const fetchSalesLedger = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/invoice/all-sales-ledger`, {
          headers: { token }
        });
        
        if (res.data && Array.isArray(res.data)) {
          setInvoices(res.data);
        } else if (res.data && Array.isArray(res.data.invoices)) {
          setInvoices(res.data.invoices);
        }
        setLoading(false);
      } catch (err) {
        console.error("Ledger fetch exception error:", err);
        setLoading(false);
      }
    };
    fetchSalesLedger();
  }, [backendUrl, token]);

  // =====================================================================
  // DYNAMIC DATE SELECTION FILTER PIPELINE (RUNS BEFORE SUMMARY CALCULATIONS)
  // =====================================================================
  const dateFilteredInvoices = invoices.filter(inv => {
    if (!selectedDate) return true; // If cleared, fallback to show full historical database

    const invoiceDateStamp = inv.createdAt || inv.date;
    if (!invoiceDateStamp) return false;

    // Standardize comparison strings to matching YYYY-MM-DD structures
    const formattedInvoiceDate = new Date(invoiceDateStamp).toISOString().split('T')[0];
    return formattedInvoiceDate === selectedDate;
  });

  // =====================================================================
  // ADAPTIVE FINANCIAL METRICS COUNTERS (USES DATE-FILTERED DATA MATRIX)
  // =====================================================================
  const totalBillsCount = dateFilteredInvoices.length;
  
  // 1. Accumulate total net cash collected at the terminal counters for target range
  const totalNetRevenue = dateFilteredInvoices.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0);

  // 2. Safely parse through dataset to normalize discount tracking card metrics
  const totalDiscountsGiven = dateFilteredInvoices.reduce((acc, curr) => {
    const savedDiscount = Number(curr.discount || 0);
    const savedNet = Number(curr.totalAmount || 0);

    // If discount field matches the total bill, skip legacy corrupted data to prevent inflation
    if (savedDiscount === savedNet && savedDiscount > 0) {
      return acc + 0;
    }
    return acc + savedDiscount;
  }, 0);

  // 3. Absolute True Gross Value across store lifecycle operations
  const totalGrossRevenue = totalNetRevenue + totalDiscountsGiven;

  // 4. Calculate overall shop store discount rate average
  const overallDiscountPercentage = totalGrossRevenue > 0 
    ? ((totalDiscountsGiven / totalGrossRevenue) * 100).toFixed(1) 
    : "0.0";

  // Filter pipeline by search text query string and payment drop modes
  const finalFilteredInvoices = dateFilteredInvoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patientMobile?.includes(searchTerm);

    const matchesPayment = 
      paymentFilter === 'ALL' || 
      inv.paymentMode?.toUpperCase() === paymentFilter.toUpperCase();

    return matchesSearch && matchesPayment;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20 font-medium text-gray-500 gap-2">
        <HiOutlineChartBar className="w-6 h-6 animate-pulse text-blue-600" />
        <span>Compiling Store Sales Matrix...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6 border border-gray-100 my-6">
      
      {/* HEADER TITLE WITH HEROICON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-3 border-b-2 border-gray-100">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <HiOutlineChartBar className="w-7 h-7 text-blue-600 shrink-0" />
          <span>In-Store Sales Ledger (Bill-Wise Breakdown)</span>
        </h2>
        
        {/* 🌟 DATE SELECTION CONTROL CONTAINER WITH DEFAULT TODAY */}
        <div className="flex items-center gap-2 bg-slate-50 border p-2 rounded-lg shadow-sm w-full sm:w-auto">
          <HiOutlineCalendar className="w-4 h-4 text-blue-600 shrink-0" />
          <label className="text-xs font-bold uppercase text-gray-600 whitespace-nowrap">Filter Ledger Date:</label>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="bg-white border rounded px-2.5 py-1 text-xs font-mono font-bold text-blue-900 outline-none focus:border-blue-500 cursor-pointer"
          />
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate('')}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded font-bold transition-colors shadow-sm"
              title="Clear to view All-Time sales history"
            >
              Clear (All-Time)
            </button>
          )}
        </div>
      </div>

      {/* TOP SUMMARY METRICS BANNER GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Bill Volume Count */}
        <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl shadow-sm flex items-start gap-2">
          <div className="p-2.5 rounded-lg bg-blue-500 text-white shadow-sm mt-0.5 shrink-0">
            <HiOutlineReceiptTax className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-[11px] text-blue-800 block uppercase tracking-wider font-bold">
              {selectedDate ? "Target Day Invoices" : "All-Time Invoices"}
            </strong>
            <span className="text-xl font-mono font-black text-blue-950 block mt-0.5">{totalBillsCount} Orders</span>
          </div>
        </div>

        {/* Card 2: Cumulative Original Sales Value */}
        <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl shadow-sm flex items-start gap-2">
          <div className="p-2.5 rounded-lg bg-gray-600 text-white shadow-sm mt-0.5 shrink-0">
            <HiOutlineCurrencyRupee className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-[11px] text-gray-700 block uppercase tracking-wider font-bold">
              {selectedDate ? "Gross Sales (Selected Date)" : "Total Gross Sales"}
            </strong>
            <span className="text-xl font-mono font-black text-gray-950 block mt-0.5">₹{Number(totalGrossRevenue).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 3: Deducted Discount Ledger Totals */}
        <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl shadow-sm flex items-start gap-2">
          <div className="p-2.5 rounded-lg bg-amber-500 text-white shadow-sm mt-0.5 shrink-0">
            <HiOutlineCurrencyRupee className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-[11px] text-amber-800 block uppercase tracking-wider font-bold">Total Discounts ({overallDiscountPercentage}%)</strong>
            <span className="text-xl font-mono font-black text-amber-950 block mt-0.5">₹{Number(totalDiscountsGiven).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 4: True Final Net Received Revenues */}
        <div className="bg-slate-900 border border-slate-950 p-4 rounded-xl shadow-sm text-white flex items-start gap-2">
          <div className="p-2.5 rounded-lg bg-emerald-500 text-slate-950 shadow-sm mt-0.5 shrink-0">
            <HiOutlineCurrencyRupee className="w-5 h-5" />
          </div>
          <div>
            <strong className="text-[11px] text-slate-400 block uppercase tracking-wider font-bold">
              {selectedDate ? "Net Cash (Selected Date)" : "All-Time Net Cash"}
            </strong>
            <span className="text-xl font-mono font-black text-emerald-400 block mt-0.5">₹{Number(totalNetRevenue).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND CONTROL DROPDOWN FILTERS */}
      <div className="bg-slate-50 p-4 border border-gray-200 rounded-lg mb-6 flex flex-col md:flex-row gap-4 items-center">
        {/* Search Field */}
        <div className="w-full md:flex-1 relative">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
            <HiOutlineSearch className="w-3.5 h-3.5 text-gray-400" />
            <span>Search Customer Profile / Invoice No.</span>
          </label>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Name, INV number, or Phone Line..."
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        
        {/* Settlement Type Selector Dropdown */}
        <div className="w-full md:w-64">
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
            <HiOutlineFilter className="w-3.5 h-3.5 text-gray-400" />
            <span>Settlement Channel</span>
          </label>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-bold shadow-sm outline-none cursor-pointer focus:border-blue-500"
          >
            <option value="ALL">Show All Invoices</option>
            <option value="CASH">Cash Settlements</option>
            <option value="UPI">Digital UPI Strings</option>
            <option value="CARD">Credit-Debit Token Swipes</option>
          </select>
        </div>
      </div>

      {/* DATA MATRIX REPORT TABLE CONTAINER */}
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-800 text-white font-bold uppercase border-b border-gray-300 text-[11px] tracking-wide">
              <th className="p-3">Transaction Date</th>
              <th className="p-3">Invoice ID Reference</th>
              <th className="p-3">Client Particulars</th>
              <th className="p-3">Settlement Mode</th>
              <th className="p-3 text-right">Gross Subtotal</th>
              <th className="p-3 text-right">Deducted Discount</th>
              <th className="p-3 text-right">Settled Net Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-700">
            {finalFilteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-12 text-gray-400 font-bold italic bg-gray-50">
                  No matching records for the selected date. Click "Clear (All-Time)" to view full historical data.
                </td>
              </tr>
            ) : (
              finalFilteredInvoices.map((invoice, idx) => {
                const parsedNetPrice = Number(invoice.totalAmount || 0);
                const parsedDiscountPrice = Number(invoice.discount || 0);
                
                let trueCalculatedGrossRow = parsedNetPrice + parsedDiscountPrice;
                let finalDiscountRenderValue = parsedDiscountPrice;

                if (parsedDiscountPrice === parsedNetPrice && parsedDiscountPrice > 0) {
                  trueCalculatedGrossRow = parsedNetPrice; 
                  finalDiscountRenderValue = 0;
                }

                const rowDiscountPercentage = trueCalculatedGrossRow > 0
                  ? ((finalDiscountRenderValue / trueCalculatedGrossRow) * 100).toFixed(0)
                  : 0;

                return (
                  <tr key={invoice._id || idx} className="hover:bg-slate-50 transition-colors">
                    {/* Column 1: Date */}
                    <td className="p-3 font-mono text-xs text-gray-500">
                      {invoice.createdAt 
                        ? new Date(invoice.createdAt).toLocaleDateString('en-IN') 
                        : new Date(invoice.date).toLocaleDateString('en-IN')
                      }
                    </td>
                    
                    {/* Column 2: Invoice No */}
                    <td className="p-3 font-bold text-slate-900 tracking-wide font-mono text-xs">
                      {invoice.invoiceNumber || 'N/A'}
                    </td>
                    
                    {/* Column 3: Client Info */}
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 uppercase text-xs">{invoice.patientName}</div>
                      <div className="text-[11px] text-gray-400 font-mono mt-0.5">{invoice.patientMobile}</div>
                    </td>
                    
                    {/* Column 4: Payment Badges */}
                    <td className="p-3 align-middle">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                        invoice.paymentMode === 'Cash' ? 'bg-amber-100 text-amber-800' :
                        invoice.paymentMode === 'UPI' ? 'bg-cyan-100 text-cyan-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {invoice.paymentMode || 'Cash'}
                      </span>
                    </td>
                    
                    {/* Column 5: Gross Subtotal Display */}
                    <td className="p-3 text-right font-mono text-slate-500 font-medium">
                      ₹{Number(trueCalculatedGrossRow).toFixed(2)}
                    </td>
                    
                    {/* Column 6: Deducted Discount with Dynamic Percentage Badge */}
                    <td className="p-3 text-right font-mono text-rose-600 font-bold">
                      <div className="flex items-center justify-end gap-1.5">
                        {Number(finalDiscountRenderValue) > 0 && (
                          <span className="inline-block bg-rose-50 text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-rose-100">
                            {rowDiscountPercentage}% off
                          </span>
                        )}
                        <span>-₹{Number(finalDiscountRenderValue).toFixed(2)}</span>
                      </div>
                    </td>
                    
                    {/* Column 7: Settled Net Amount Display */}
                    <td className="p-3 text-right font-mono font-black text-slate-950 text-sm bg-slate-50/40">
                      ₹{Number(parsedNetPrice).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}