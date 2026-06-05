import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { HiOutlineDocumentAdd, HiOutlineTrash, HiPlus, HiSearch } from "react-icons/hi";

export default function PurchaseEntry({ backendUrl, token }) {
  // Master Supplier Search Fields
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierIndex, setSupplierIndex] = useState(-1);

  // Explicit State for New Supplier Registration Details
  const [newSupplierData, setNewSupplierData] = useState({
    gstinTaxId: "", mobile: "", phone: "", email: "",
    street: "", area: "", city: "", state: "",
    bankName: "", accountNumber: "", ifscCode: ""
  });

  const [invoiceNum, setInvoiceNum] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Grid Canvas State
  const [purchaseItems, setPurchaseItems] = useState([]);

  // Workspace Item States
  const [productSearch, setProductSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productIndex, setProductIndex] = useState(-1);
  
  const [qty, setQty] = useState(1);
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  // Dynamic Prescription Specifications Matrix States
  const [sphere, setSphere] = useState("");
  const [cylinder, setCylinder] = useState("");
  const [axis, setAxis] = useState("");

  // DOM Container References
  const supplierScrollRef = useRef(null);
  const productScrollRef = useRef(null);

  // Handle nested input updates safely
  const handleNewSupplierChange = (e) => {
    const { name, value } = e.target;
    setNewSupplierData(prev => ({ ...prev, [name]: value }));
  };

  // 🔄 LIVE SUPPLIER AUTOCOMPLETE FETCHER
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const query = supplierSearch.trim();
      if (query.length >= 2 && !selectedSupplier) {
        try {
          const res = await axios.get(`${backendUrl}/api/suppliers/search?query=${query}`, {
            headers: { token }
          });
          if (res.data.success) {
            setSupplierSuggestions(res.data.suppliers || []);
            setSupplierIndex(-1);
          }
        } catch (err) {
          console.error("Supplier catalog check error", err);
        }
      } else {
        setSupplierSuggestions([]);
        setSupplierIndex(-1);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [supplierSearch, selectedSupplier, backendUrl, token]);

  // Live Autocomplete Catalog Fetcher (Products)
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const query = productSearch.trim();
      if (query.length >= 2 && !selectedProduct) {
        try {
          const res = await axios.get(`${backendUrl}/api/inventory/search-products?query=${query}`, {
            headers: { token }
          });
          if (res.data.success) {
            setSuggestions(res.data.products || []);
            setProductIndex(-1);
          }
        } catch (err) {
          console.error("Catalog check error", err);
        }
      } else {
        setSuggestions([]);
        setProductIndex(-1);
      }
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [productSearch, selectedProduct, backendUrl, token]);

  // ⌨️ GLOBAL ENTER NAVIGATION CONTROLLER
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.target.name === "supplierSearchInput" && supplierSuggestions.length > 0) return;
      if (e.target.name === "productSearchInput" && suggestions.length > 0) return;
      if (e.target.id === "addBtnRow") return;

      e.preventDefault();
      const nextFieldName = e.target.getAttribute("data-next");
      if (nextFieldName) {
        const nextElement = document.querySelector(`[name="${nextFieldName}"]`);
        if (nextElement) {
          nextElement.focus();
          if (nextElement.select) nextElement.select(); 
        }
      }
    }
  };

  // ⌨️ KEYBOARD MENU LISTENER FOR SUPPLIER
  const handleSupplierKeyDown = (e) => {
    if (supplierSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSupplierIndex((prev) => {
        const nextIdx = prev < supplierSuggestions.length - 1 ? prev + 1 : prev;
        scrollSuggestionIntoView(supplierScrollRef, nextIdx);
        return nextIdx;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSupplierIndex((prev) => {
        const nextIdx = prev > 0 ? prev - 1 : 0;
        scrollSuggestionIntoView(supplierScrollRef, nextIdx);
        return nextIdx;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (supplierIndex >= 0 && supplierIndex < supplierSuggestions.length) {
        selectSupplierItem(supplierSuggestions[supplierIndex]);
      } else if (supplierSuggestions.length > 0) {
        selectSupplierItem(supplierSuggestions[0]); 
      }
      
      setTimeout(() => {
        const nextEl = document.querySelector('[name="invoiceNum"]');
        if (nextEl) nextEl.focus();
      }, 50);
    }
  };

  // ⌨️ KEYBOARD MENU LISTENER FOR PRODUCT
  const handleProductKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setProductIndex((prev) => {
        const nextIdx = prev < suggestions.length - 1 ? prev + 1 : prev;
        scrollSuggestionIntoView(productScrollRef, nextIdx);
        return nextIdx;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setProductIndex((prev) => {
        const nextIdx = prev > 0 ? prev - 1 : 0;
        scrollSuggestionIntoView(productScrollRef, nextIdx);
        return nextIdx;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const matchedProduct = productIndex >= 0 ? suggestions[productIndex] : suggestions[0];
      selectCatalogItem(matchedProduct);

      setTimeout(() => {
        const isLens = ["Lenses", "Contact Lenses"].includes(matchedProduct.category);
        const targetFieldName = isLens ? "sphere" : "qtyReceived";
        const nextEl = document.querySelector(`[name="${targetFieldName}"]`);
        if (nextEl) {
          nextEl.focus();
          if (nextEl.select) nextEl.select();
        }
      }, 50);
    }
  };

  const scrollSuggestionIntoView = (containerRef, index) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const childRow = container.children[index];
    if (childRow) {
      childRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const selectSupplierItem = (sup) => {
    setSelectedSupplier(sup);
    setSupplierSearch(sup.supplierName);
    setSupplierSuggestions([]);
    setSupplierIndex(-1);
  };

  const selectCatalogItem = (prod) => {
    setSelectedProduct(prod);
    setProductSearch(`${prod.brand} - ${prod.name} (${prod.sku})`);
    setSellingPrice(prod.price || "");
    setSuggestions([]);
    setProductIndex(-1);
  };

  const getLineFinancials = (qtyVal, costPriceVal, cgstRate, sgstRate) => {
    const qtyCount = Number(qtyVal || 0);
    const unitPrice = Number(costPriceVal || 0);
    const baseAmount = qtyCount * unitPrice;
    const cgstAmt = baseAmount * (Number(cgstRate || 0) / 100);
    const sgstAmt = baseAmount * (Number(sgstRate || 0) / 100);
    return { cgstAmt, sgstAmt, subtotal: baseAmount + cgstAmt + sgstAmt };
  };

  const handleAddItemToLedger = (e) => {
    if (e) e.preventDefault();
    if (!selectedProduct) {
      toast.warn("Please look up and pick a true product asset from the database list.");
      return;
    }
    if (!costPrice || Number(costPrice) <= 0) {
      toast.warn("Please enter a valid purchase unit cost price.");
      return;
    }

    const isPrescriptionCategory = ["Lenses", "Contact Lenses"].includes(selectedProduct.category);
    if (isPrescriptionCategory && !sphere.trim()) {
      toast.warn("Prescription lines require at minimum an SPH metric assignment.");
      return;
    }

    const { cgstAmt, sgstAmt, subtotal } = getLineFinancials(qty, costPrice, selectedProduct.cgst, selectedProduct.sgst);

    const newItem = {
      gridId: Date.now() + Math.random().toString(36).substring(2, 5),
      productId: selectedProduct._id,
      sku: isPrescriptionCategory ? `${selectedProduct.sku}-${sphere}-${cylinder}`.replace(/[^a-zA-Z0-9-_]/g, '') : selectedProduct.sku,
      productName: isPrescriptionCategory ? `${selectedProduct.brand} - ${selectedProduct.name} [SPH: ${sphere} | CYL: ${cylinder || "0.00"}]` : `${selectedProduct.brand} - ${selectedProduct.name}`,
      qtyReceived: Number(qty),
      purchasePricePerUnit: Number(costPrice),
      sellingPricePerUnit: Number(sellingPrice || selectedProduct.price),
      cgst: selectedProduct.cgst || 0,
      sgst: selectedProduct.sgst || 0,
      cgstCalculatedAmount: cgstAmt,
      sgstCalculatedAmount: sgstAmt,
      itemSubtotal: subtotal,
      variantSpecs: isPrescriptionCategory ? { sphere, cylinder, axis } : null
    };

    setPurchaseItems([...purchaseItems, newItem]);
    
    setProductSearch("");
    setSelectedProduct(null);
    setQty(1);
    setCostPrice("");
    setSellingPrice("");
    setSphere("");
    setCylinder("");
    setAxis("");
    toast.success("Row committed to current invoice layout.");

    setTimeout(() => {
      const prodSearchInput = document.querySelector('[name="productSearchInput"]');
      if (prodSearchInput) prodSearchInput.focus();
    }, 50);
  };

  const getInvoiceSummary = () => {
    const rawTotal = purchaseItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
    const roundedTotal = Math.round(rawTotal);
    return { rawTotal, roundedTotal, roundOffAdjustment: roundedTotal - rawTotal };
  };

  const summary = getInvoiceSummary();

  const handleFinalSubmitBill = async () => {
    if ((!selectedSupplier && !supplierSearch.trim()) || !invoiceNum) {
      toast.error("Please fill out Supplier Identity and Invoice numbers.");
      return;
    }
    if (purchaseItems.length === 0) {
      toast.error("The purchase line workspace is completely empty.");
      return;
    }

    const loadId = toast.loading("Processing supplier stock intake...");
    try {
      const payload = {
        supplierName: selectedSupplier ? selectedSupplier.supplierName : supplierSearch.trim().toUpperCase(),
        supplierId: selectedSupplier ? selectedSupplier._id : null,
        supplierInvoiceNumber: invoiceNum,
        purchaseDate,
        notes,
        items: purchaseItems,
        grossTotal: summary.roundedTotal, 
        roundOff: Number(summary.roundOffAdjustment.toFixed(2)),
        ...(!selectedSupplier ? newSupplierData : {})
      };

      const res = await axios.post(`${backendUrl}/api/purchase/add-bill`, payload, { headers: { token } });
      toast.dismiss(loadId);

      if (res.data.success) {
        toast.success("Purchase bill logged successfully!");
        setPurchaseItems([]);
        setSupplierSearch("");
        setSelectedSupplier(null);
        setInvoiceNum("");
        setNotes("");
        setNewSupplierData({
          gstinTaxId: "", mobile: "", phone: "", email: "",
          street: "", area: "", city: "", state: "",
          bankName: "", accountNumber: "", ifscCode: ""
        });
      } else {
        toast.error(res.data.message || "An error occurred.");
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error(err.response?.data?.message || "Transmission fault.");
    }
  };

  return (
    <div className="p-2 sm:p-4 bg-slate-50 min-h-screen font-sans w-full" onKeyDown={handleFormKeyDown}>
      <ToastContainer position="top-right" compact />
      <div className="max-w-6xl mx-auto bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-200">
        
        <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-800 mb-4 sm:mb-6 pb-3 border-b flex items-center gap-2 uppercase tracking-wide">
          <HiOutlineDocumentAdd className="w-5 h-5 text-cyan-600 shrink-0" />
          <span>Purchase Stock Intake</span>
        </h2>

        {/* STEP 1: SUPPLIER BANNER */}
        <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-gray-200 mb-4 sm:mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Supplier / Vendor Lookup</label>
              <input 
                type="text" 
                name="supplierSearchInput"
                value={supplierSearch} 
                onChange={(e) => { setSupplierSearch(e.target.value); if(selectedSupplier) setSelectedSupplier(null); }}
                onKeyDown={handleSupplierKeyDown}
                data-next="invoiceNum"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white font-bold tracking-wide outline-none focus:border-cyan-500 uppercase"
                placeholder="Type supplier name..."
                autoComplete="off"
              />

              {supplierSuggestions.length > 0 && (
                <div ref={supplierScrollRef} className="absolute left-0 right-0 top-full mt-1 bg-white border border-cyan-300 rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y z-50">
                  {supplierSuggestions.map((s, idx) => (
                    <div 
                      key={s._id} 
                      onClick={() => selectSupplierItem(s)}
                      className={`p-2.5 cursor-pointer text-xs flex justify-between items-center font-bold uppercase transition-colors ${
                        idx === supplierIndex ? "bg-cyan-100 text-cyan-900 border-l-4 border-cyan-600" : "hover:bg-cyan-50 text-slate-900"
                      }`}
                    >
                      <span>{s.supplierName}</span>
                      {s.gstinTaxId && <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 py-0.5 rounded">GST: {s.gstinTaxId}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Invoice Number</label>
              <input 
                type="text" 
                name="invoiceNum"
                value={invoiceNum} 
                onChange={(e) => setInvoiceNum(e.target.value)}
                data-next="purchaseDate"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white font-mono font-bold tracking-wide outline-none focus:border-cyan-500"
                placeholder="PUR-2026-9874"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Booking Date</label>
              <input 
                type="date" 
                name="purchaseDate"
                value={purchaseDate} 
                onChange={(e) => setPurchaseDate(e.target.value)}
                data-next={!selectedSupplier ? "gstinTaxId" : "productSearchInput"}
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white font-mono font-bold outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* DYNAMIC NEW SUPPLIER INPUT FORM PROFILE */}
          {!selectedSupplier && supplierSearch.trim().length >= 2 && (
            <div className="p-3 sm:p-4 bg-amber-50/40 rounded-lg border border-dashed border-amber-300 space-y-3">
              <span className="text-[10px] sm:text-[11px] font-black text-amber-900 uppercase block tracking-wider border-b border-amber-200 pb-1">🌟 New Supplier Registration</span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">GSTIN / Tax ID</label>
                  <input type="text" name="gstinTaxId" data-next="mobile" value={newSupplierData.gstinTaxId} onChange={handleNewSupplierChange} placeholder="GSTIN" className="w-full border border-amber-200 rounded p-1.5 text-xs uppercase bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Mobile Phone</label>
                  <input type="text" name="mobile" data-next="phone" value={newSupplierData.mobile} onChange={handleNewSupplierChange} placeholder="Mobile" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Landline</label>
                  <input type="text" name="phone" data-next="email" value={newSupplierData.phone} onChange={handleNewSupplierChange} placeholder="Phone" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Email Address</label>
                  <input type="text" name="email" data-next="street" value={newSupplierData.email} onChange={handleNewSupplierChange} placeholder="Email" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Street</label>
                  <input type="text" name="street" data-next="area" value={newSupplierData.street} onChange={handleNewSupplierChange} placeholder="Street" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Area</label>
                  <input type="text" name="area" data-next="city" value={newSupplierData.area} onChange={handleNewSupplierChange} placeholder="Area" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">City</label>
                  <input type="text" name="city" data-next="state" value={newSupplierData.city} onChange={handleNewSupplierChange} placeholder="City" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">State</label>
                  <input type="text" name="state" data-next="bankName" value={newSupplierData.state} onChange={handleNewSupplierChange} placeholder="State" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 border-t pt-2 border-amber-200">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Bank Name</label>
                  <input type="text" name="bankName" data-next="accountNumber" value={newSupplierData.bankName} onChange={handleNewSupplierChange} placeholder="Bank Name" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">Account Number</label>
                  <input type="text" name="accountNumber" data-next="ifscCode" value={newSupplierData.accountNumber} onChange={handleNewSupplierChange} placeholder="Account No" className="w-full border border-amber-200 rounded p-1.5 text-xs bg-white outline-none focus:border-cyan-500" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-[9px] sm:text-[10px] font-bold text-amber-900 uppercase mb-0.5">IFSC Code</label>
                  <input type="text" name="ifscCode" data-next="productSearchInput" value={newSupplierData.ifscCode} onChange={handleNewSupplierChange} placeholder="IFSC Code" className="w-full border border-amber-200 rounded p-1.5 text-xs uppercase bg-white outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: SEARCH CATALOG & PRODUCT WORKSPACE */}
        <div className="bg-cyan-50/40 p-3 sm:p-4 rounded-xl border border-cyan-100 mb-4 sm:mb-6 relative">
          <span className="text-[11px] sm:text-xs font-black text-cyan-900 block mb-2 sm:mb-3 uppercase tracking-wide">⚙️ Active Item Intake Workspace</span>
          
          <div className="space-y-3">
            {/* Redesigned grid to natively adapt to single column formats on smartphones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="lg:col-span-5 relative">
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center gap-1">
                  <HiSearch className="text-cyan-600" /> Search Stock Product / SKU
                </label>
                <input 
                  type="text"
                  name="productSearchInput"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); if(selectedProduct) setSelectedProduct(null); }}
                  onKeyDown={handleProductKeyDown}
                  placeholder="Type product name or SKU..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm outline-none font-medium focus:border-cyan-500 uppercase"
                  autoComplete="off"
                />

                {suggestions.length > 0 && (
                  <div ref={productScrollRef} className="absolute left-0 right-0 top-full mt-1 bg-white border border-cyan-300 rounded-lg shadow-2xl max-h-48 overflow-y-auto divide-y z-50">
                    {suggestions.map((p, idx) => (
                      <div 
                        key={p._id} 
                        onClick={() => selectCatalogItem(p)}
                        className={`p-2.5 cursor-pointer text-xs flex justify-between items-center transition-colors ${
                          idx === productIndex ? "bg-cyan-100 text-cyan-900 border-l-4 border-cyan-600" : "hover:bg-cyan-50 text-slate-900"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{p.brand} - {p.name}</p>
                          <p className="text-[10px] font-mono text-gray-400">SKU: {p.sku} | Stock: {p.stock} units</p>
                        </div>
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">₹{p.price}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Intake Qty</label>
                <input 
                  type="number" 
                  name="qtyReceived"
                  min="1"
                  value={qty} 
                  onChange={(e) => setQty(e.target.value)}
                  data-next="purchasePricePerUnit"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Unit Cost (CP)</label>
                <input 
                  type="number" 
                  name="purchasePricePerUnit"
                  value={costPrice} 
                  onChange={(e) => setCostPrice(e.target.value)}
                  data-next="sellingPricePerUnit"
                  placeholder="Cost Price"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm font-mono font-bold text-rose-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-gray-600 uppercase mb-1">Retail Price (MRP)</label>
                <input 
                  type="number" 
                  name="sellingPricePerUnit"
                  value={sellingPrice} 
                  onChange={(e) => setSellingPrice(e.target.value)}
                  data-next="addBtnRow" 
                  placeholder="MRP Price"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm font-mono font-bold text-emerald-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <button
                  type="button"
                  id="addBtnRow"
                  name="addBtnRow"
                  onClick={handleAddItemToLedger}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded text-xs uppercase shadow flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <HiPlus className="w-4 h-4 shrink-0" />
                  <span className="lg:hidden">Add Item</span>
                </button>
              </div>
            </div>

            {/* EYE GLASS PRESCRIPTION FIELDS ROW OVERLAY */}
            {selectedProduct && ["Lenses", "Contact Lenses"].includes(selectedProduct.category) && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-white rounded-lg border border-cyan-200 shadow-inner">
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-cyan-800 uppercase mb-0.5">Sphere (SPH)</label>
                  <input type="text" name="sphere" data-next="cylinder" value={sphere} onChange={(e) => setSphere(e.target.value)} placeholder="-2.50" className="w-full bg-slate-50 border p-1.5 rounded text-xs font-mono font-bold outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-cyan-800 uppercase mb-0.5">Cylinder (CYL)</label>
                  <input type="text" name="cylinder" data-next="axis" value={cylinder} onChange={(e) => setCylinder(e.target.value)} placeholder="-0.75" className="w-full bg-slate-50 border p-1.5 rounded text-xs font-mono font-bold outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-cyan-800 uppercase mb-0.5">Axis (AXIS)</label>
                  <input type="text" name="axis" data-next="qtyReceived" value={axis} onChange={(e) => setAxis(e.target.value)} placeholder="180" className="w-full bg-slate-50 border p-1.5 rounded text-xs font-mono font-bold outline-none focus:bg-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: LIVE LEDGER MANIFEST GRID TABLE */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4 sm:mb-6">
          <div className="bg-slate-800 text-white text-[10px] sm:text-xs font-bold p-3 uppercase tracking-wider">
            📋 Staged Manifest Items ({purchaseItems.length})
          </div>
          
          {/* Isolation wrapper lets your client safely swipe side-to-side without resizing calculations */}
          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse text-left text-xs min-w-[850px]">
              <thead>
                <tr className="bg-slate-100 border-b font-bold text-slate-700 uppercase text-[11px]">
                  <th className="p-3">SKU Ref</th>
                  <th className="p-3">Product Description</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Cost Price</th>
                  <th className="p-3 text-right">Retail MRP</th>
                  <th className="p-3 text-right">Tax Details</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center p-8 font-medium text-gray-400 italic bg-slate-50/50">
                      No purchase items added to the manifest grid canvas yet.
                    </td>
                  </tr>
                ) : (
                  purchaseItems.map((item) => (
                    <tr key={item.gridId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{item.sku}</td>
                      <td className="p-3 font-medium uppercase text-gray-700 max-w-xs truncate">{item.productName}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700 bg-blue-50/10">{item.qtyReceived} Units</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">₹{item.purchasePricePerUnit.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">₹{item.sellingPricePerUnit.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-gray-600">
                        <div className="text-[9px] text-gray-400">C:{item.cgst}%|S:{item.sgst}%</div>
                        <div className="font-bold text-slate-700">+₹{(item.cgstCalculatedAmount + item.sgstCalculatedAmount).toFixed(2)}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-950 bg-slate-50/40">₹{item.itemSubtotal.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPurchaseItems(purchaseItems.filter(i => i.gridId !== item.gridId))}
                          className="text-red-500 hover:text-white hover:bg-red-500 border border-red-100 p-1 rounded transition-colors"
                        >
                          <HiOutlineTrash className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STEP 4: NOTES AND FINAL SUMMARY PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end pt-4 border-t">
          <div className="md:col-span-2">
            <label className="block text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Internal manifest Notes</label>
            <input 
              type="text"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add transportation info or warehouse records..."
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs sm:text-sm outline-none focus:bg-white focus:border-cyan-500"
            />
          </div>
          
          <div className="bg-slate-950 text-white rounded-xl p-4 shadow-xl space-y-2 border border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>Subtotal:</span>
              <span className="font-mono">₹{summary.rawTotal.toFixed(2)}</span>
            </div>
            
            {summary.roundOffAdjustment !== 0 && (
              <div className="flex justify-between items-center text-xs text-amber-400 font-medium">
                <span>Round Off Adjustment:</span>
                <span className="font-mono font-bold">
                  {summary.roundOffAdjustment > 0 ? "+" : ""}
                  ₹{summary.roundOffAdjustment.toFixed(2)}
                </span>
              </div>
            )}
            
            <div className="border-t border-slate-800 pt-2 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Cost Payable</span>
                <span className="text-base sm:text-xl font-mono font-black text-emerald-400">₹{summary.roundedTotal.toLocaleString("en-IN")}</span>
              </div>
              <button
                type="button"
                onClick={handleFinalSubmitBill}
                disabled={purchaseItems.length === 0}
                className={`font-black py-2.5 px-4 rounded-lg uppercase tracking-wider text-xs shadow-md transition-all shrink-0 ${
                  purchaseItems.length === 0 
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 active:scale-95"
                }`}
              >
                Commit Bill 📦
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}