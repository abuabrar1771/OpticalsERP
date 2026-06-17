import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { currencySymbol } from '../App';

export default function ReceiptVoucher({ backendUrl, token }) {
  // Mode Controller State: 'invoice' (Old Concept) or 'income' (Accounting Receipt Voucher Concept)
  const [voucherMode, setVoucherMode] = useState('invoice'); 

  // Concept 1: Invoice Lookup States
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Concept 2: General Income Accounting States
  const [incomeType, setIncomeType] = useState('Commission Income');
  const [creditAccountName, setCreditAccountName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [narration, setNarration] = useState('');

  // Universal States
  const [settlementChannel, setSettlementChannel] = useState('Cash');
  const [isSubmitting, setIsProcessing] = useState(false);

  const dropdownContainerRef = useRef(null);
  const customerScrollRef = useRef(null);

  // Close lookup dropdown overlay
  useEffect(() => {
    const handleOutsideClickClose = (e) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClickClose);
    return () => document.removeEventListener("mousedown", handleOutsideClickClose);
  }, []);

  // Debounce hook monitor matching Concept 1 rules
  useEffect(() => {
    if (voucherMode !== 'invoice') return;
    const delayDebounceFn = setTimeout(async () => {
      const query = customerSearchInput.trim();
      
      if (query.length >= 1 && !query.includes('(')) {
        try {
          const response = await axios.get(
            `${backendUrl}/api/invoice/pending-invoice-lookup?mobile=${encodeURIComponent(query)}`,
            { headers: { token } }
          );

          if (response.data.success && Array.isArray(response.data.invoices)) {
            setCustomerSuggestions(response.data.invoices);
            setCustomerActiveIndex(-1);
            setIsDropdownOpen(true);
          } else {
            setCustomerSuggestions([]);
          }
        } catch (err) {
          console.error("Autocomplete search error:", err);
          setCustomerSuggestions([]);
        }
      } else if (query.length === 0) {
        setCustomerSuggestions([]);
        setActiveInvoice(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchInput, backendUrl, token, voucherMode]);

  const handleCustomerKeyDown = (e) => {
    if (customerSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerActiveIndex(p => {
        const next = Math.min(p + 1, customerSuggestions.length - 1);
        if (customerScrollRef.current && customerScrollRef.current.children[next]) {
          customerScrollRef.current.children[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerActiveIndex(p => {
        const next = Math.max(p - 1, 0);
        if (customerScrollRef.current && customerScrollRef.current.children[next]) {
          customerScrollRef.current.children[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetIdx = customerActiveIndex >= 0 ? customerActiveIndex : 0;
      if (customerSuggestions[targetIdx]) {
        selectCustomerProfile(customerSuggestions[targetIdx]);
      }
    }
  };

  const selectCustomerProfile = (invoice) => {
    setActiveInvoice(invoice);
    setCustomerSearchInput(`${invoice.patientName} (${invoice.patientMobile})`.toUpperCase());
    setCustomerSuggestions([]);
    setIsDropdownOpen(false);
    toast.success("Outstanding balance invoice linked.");
  };

  // Unified router request fire submission pipeline
  const processReceiptSettle = async () => {
    setIsProcessing(true);

    try {
      let requestPayload = {};
      let targetEndpointId = "general-voucher-post";

      if (voucherMode === 'invoice') {
        if (!activeInvoice) return;
        targetEndpointId = activeInvoice._id;
        requestPayload = { 
          voucherType: 'Customer Settle',
          finalPaymentMode: settlementChannel 
        };
      } else {
        if (!creditAccountName || !incomeAmount) {
          toast.error("Please provide account reference descriptor and amount metrics.");
          setIsProcessing(false);
          return;
        }
        requestPayload = {
          voucherType: incomeType,
          finalPaymentMode: settlementChannel,
          amountReceived: Number(incomeAmount),
          creditAccountName: creditAccountName.toUpperCase(),
          narration: narration
        };
      }

      const response = await axios.post(
        `${backendUrl}/api/invoice/settle-balance/${targetEndpointId}`,
        requestPayload,
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success("🎉 TRANSACTION CAPTURED SUCCESSFULLY!");
        setActiveInvoice(response.data.invoice);
        
        // Reset income ledger properties if in general accounting view
        if (voucherMode === 'income') {
          setCreditAccountName('');
          setIncomeAmount('');
          setNarration('');
        }
        triggerThermalHardwarePrint(response.data.invoice);
      } else {
        toast.error(response.data.message || "Database execution failure.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network interface connection failure processing ledger entries.");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerThermalHardwarePrint = (printData) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    const displayVoucherHeader = printData.voucherType === 'Customer Settle' ? 'CUSTOMER BALANCE RECEIPT' : 'GENERAL INCOME VOUCHER';

    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher - ${printData.invoiceNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 76mm; margin: 0; padding: 2mm; font-size: 12px; line-height: 1.4; color: #000; background: #fff; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; width: 100%; }
            .grid-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            .grid-table th, .grid-table td { font-size: 11px; padding: 2px 0; vertical-align: top; }
            .footer-msg { font-size: 10px; margin-top: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 class="font-bold" style="font-size: 16px; margin: 0 0 2px 0;">OPTICAL ERP</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: bold; text-decoration: underline;">${displayVoucherHeader}</p>
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div><strong>Voucher/Ref No:</strong> ${printData.invoiceNumber}</div>
            <div><strong>Credit Account:</strong> ${printData.patientName}</div>
            ${printData.patientMobile !== 'N/A' ? `<div><strong>Mobile Contact:</strong> ${printData.patientMobile}</div>` : ''}
            <div><strong>Payment Status:</strong> ${printData.status.toUpperCase()}</div>
          </div>
          <div class="divider"></div>
          <table class="grid-table">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th class="font-bold">Transaction Description Ledger</th>
                <th class="text-right font-bold" style="width: 25%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="font-bold">${printData.voucherType === 'Customer Settle' ? 'Outstanding Account Settlement' : 'Office Secondary Profit Allocation'}</span></td>
                <td class="text-right">₹${printData.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div class="divider"></div>
          <div style="font-size: 12px; padding-left: 15mm;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: green;"><span>Total Collected:</span><span>₹${printData.totalAmount}</span></div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px dashed #000; margin-top: 2px;"><span>Remaining Due:</span><span>₹0.00</span></div>
          </div>
          ${printData.narration ? `<div style="font-size: 10px; margin-top: 4px; font-style: italic;">Note: ${printData.narration}</div>` : ''}
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <div><strong>Received Into:</strong> ${printData.paymentMode || 'Cash'} Account</div>
            <div><strong>Timestamp:</strong> ${new Date(printData.createdAt).toLocaleString('en-IN')}</div>
          </div>
          <div class="footer-msg">
            <p class="font-bold" style="margin: 0;">Daybook Transaction Logged Successfully!</p>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isCleared = activeInvoice && (activeInvoice.status?.trim() === 'Paid' || Number(activeInvoice.balanceDue) === 0);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-slate-300 shadow-md rounded-lg p-4 sm:p-6 font-sans text-slate-800">
      
      {/* VOUCHER CONCEPT COMPONENT TOGGLE TABS BAR */}
      <div className="flex bg-slate-100 p-1 rounded-lg gap-1 mb-5 select-none">
        <button
          type="button"
          onClick={() => { setVoucherMode('invoice'); setActiveInvoice(null); }}
          className={`flex-1 py-2 text-xs font-black uppercase rounded-md tracking-wider transition-all ${
            voucherMode === 'invoice' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          🔍 Customer Balance Settle
        </button>
        <button
          type="button"
          onClick={() => { setVoucherMode('income'); setActiveInvoice(null); }}
          className={`flex-1 py-2 text-xs font-black uppercase rounded-md tracking-wider transition-all ${
            voucherMode === 'income' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          💰 Other Income Receipt Voucher
        </button>
      </div>

      {/* DYNAMIC VIEW FOR CONCEPT 1: INVOICE SETTLEMENT MODE */}
      {voucherMode === 'invoice' && (
        <div ref={dropdownContainerRef} className="relative mb-6">
          <label className="block text-[10px] sm:text-xs font-bold text-slate-600 uppercase mb-1">
            🔍 Search Unpaid Sales Invoice (Name, Phone or Inv No)
          </label>
          <input
            type="text"
            value={customerSearchInput}
            onChange={(e) => {
              setCustomerSearchInput(e.target.value.toUpperCase());
              setIsDropdownOpen(true);
              if (!e.target.value) setActiveInvoice(null);
            }}
            onKeyDown={handleCustomerKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="ENTER DETAILS FOR OUTSTANDING BALANCES..."
            className="w-full p-2.5 border border-blue-300 rounded-lg font-bold text-sm tracking-wide bg-white uppercase outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />

          {isDropdownOpen && customerSuggestions.length > 0 && (
            <div 
              ref={customerScrollRef} 
              className="absolute left-0 right-0 mt-1 bg-white border border-blue-400 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100"
            >
              {customerSuggestions.map((inv, idx) => (
                <div 
                  key={inv._id} 
                  onClick={() => selectCustomerProfile(inv)} 
                  className={`p-3 cursor-pointer flex justify-between items-center transition-all ${
                    idx === customerActiveIndex ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 bg-white text-slate-800'
                  }`}
                >
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-slate-900">{inv.patientName}</p>
                    <p className="font-mono text-[11px] text-slate-500 font-bold mt-0.5">📱 Mobile: {inv.patientMobile}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      📅 Date: {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wide block mb-1">
                      {inv.invoiceNumber}
                    </span>
                    <div className="text-[10px] space-y-0.5 font-bold font-mono text-slate-600">
                      <p>Grand Total: {currencySymbol}{inv.totalAmount}</p>
                      <p className="text-emerald-600">Advance Paid: {currencySymbol}{inv.advancePaid}</p>
                      <p className="text-rose-600 text-xs border-t pt-0.5 mt-0.5 font-black">Balance Due: {currencySymbol}{inv.balanceDue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC VIEW FOR CONCEPT 2: ACCOUNTING SYSTEM GENERAL INCOME MODE */}
      {voucherMode === 'income' && (
        <div className="bg-slate-50 border rounded-xl p-4 mb-6 space-y-4 shadow-inner animate-fade-in">
          <p className="text-[11px] font-black uppercase text-blue-600 tracking-wider">🏢 Office Independent Daybook Voucher Logging Input</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">Source Stream Type</label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
                className="w-full p-2 border bg-white border-slate-300 font-bold text-xs rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Commission Income">🔬 LAB LENS COMMISSION INC</option>
                <option value="Fitting Charge">🛠️ CUSTOM GLAZING / FITTING CHARGE</option>
                <option value="Indirect Income">📦 MISC SCRAP / FRAMES REPAIR FEE</option>
                <option value="Other Revenue">🏥 DOCTOR REFERRAL CREDIT ALLOCATION</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">Credit Ledger/Source Descriptor</label>
              <input
                type="text"
                value={creditAccountName}
                onChange={(e) => setCreditAccountName(e.target.value)}
                placeholder="E.G., ESSILOR LAB, CARL ZEISS, DR. SHARMA"
                className="w-full p-2 border bg-white border-slate-300 font-bold text-xs uppercase rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">Amount Received (₹)</label>
              <input
                type="number"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                placeholder="ENTER VALUE IN ₹..."
                className="w-full p-2 border bg-white border-slate-300 font-mono font-bold text-xs rounded-lg prescribe-input outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">Voucher Narration / Transaction Notes</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="ADD OPTIONAL AUDIT LOG REMARKS OR TRANSACTION REFERENCE CODES..."
                className="w-full p-2 border bg-white border-slate-300 font-bold text-xs rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW LAYOUT AREA: Dynamic Context Blocks Mapping */}
      {voucherMode === 'invoice' && activeInvoice && (
        <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in">
          <div className="flex justify-between items-start border-b border-blue-100 pb-3">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider ${
                isCleared ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
              }`}>
                Invoice Status: {activeInvoice.status}
              </span>
              <h3 className="text-md font-black uppercase text-slate-900 mt-2">
                👤 Patient Name: {activeInvoice.patientName}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500">Invoice Number: {activeInvoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Billing Date</span>
              <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border">
                {new Date(activeInvoice.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </span>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-3 space-y-2 text-xs">
            <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Item Details</p>
            {activeInvoice.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b last:border-0 pb-1.5 last:pb-0 pt-1">
                <div>
                  <p className="font-black text-slate-800 uppercase">{item.itemName || 'Optical Wear Item'}</p>
                </div>
                <span className="font-mono font-bold text-slate-700">₹{item.total || item.price || activeInvoice.totalAmount}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white p-3.5 rounded-lg grid grid-cols-3 gap-2 text-center select-none shadow-md">
            <div>
              <span className="text-[12px] font-bold text-slate-400 block uppercase">Grand Total</span>
              <span className="text-base font-mono font-black">₹{activeInvoice.totalAmount}</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[12px] font-bold text-slate-400 block uppercase">Paid Advance</span>
              <span className="text-base font-mono font-black text-emerald-400">₹{activeInvoice.advancePaid}</span>
            </div>
            <div>
              <span className="text-[12px] font-bold text-slate-300 block uppercase">Balance Amount</span>
              <span className={`text-base font-mono font-black ${!isCleared ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                ₹{activeInvoice.balanceDue}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED TRANSACTION SUBMISSION TRIGGER ACTIONS BAR CONTROLS */}
      {(voucherMode === 'income' || (voucherMode === 'invoice' && activeInvoice)) && (
        <div className="mt-5 pt-3 border-t border-slate-200">
          {!isCleared || voucherMode === 'income' ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  💳 Debit Target Asset Account
                </label>
                <select
                  value={settlementChannel}
                  onChange={(e) => setSettlementChannel(e.target.value)}
                  className="w-full p-2 border bg-white border-slate-300 font-bold text-xs rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">💵 CASH ACCOUNT REGISTER</option>
                  <option value="Card">💳 CREDIT / DEBIT CARD BANK LEDGER</option>
                  <option value="UPI">📱 DIGITAL UPI POS CURRENT ACCOUNT</option>
                </select>
              </div>
              <div className="sm:col-span-6">
                <button
                  type="button"
                  onClick={processReceiptSettle}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow transition-all duration-150 transform active:scale-95"
                >
                  {isSubmitting ? "Writing Transaction Entry..." : `Commit Voucher & Fire Thermal Print 🖨️`}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                🎉 This sales invoice is completely balanced and closed under state: Paid!
              </p>
              <button
                type="button"
                onClick={() => triggerThermalHardwarePrint(activeInvoice)}
                className="mx-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase rounded-lg font-mono flex items-center justify-center gap-1.5"
              >
                🖨️ Print Receipt Duplicate Copies
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}