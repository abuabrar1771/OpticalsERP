import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { currencySymbol } from "../../App";

export default function OpeningStockEntry({ backendUrl, token }) {
  // Core Operational States
  const [masterProducts, setMasterProducts] = useState([]);
  const [activeRows, setActiveRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMasterIndex, setSelectedMasterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const bottomTableRef = useRef(null);

  // Fetch product definitions from Master Directory on mount
  useEffect(() => {
    const fetchMasterProducts = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/product/list`, { headers: { token } });
        const productsList = Array.isArray(res.data) ? res.data : res.data.products || [];
        setMasterProducts(productsList);
      } catch (err) {
        console.error("Master catalog load exception:", err);
        toast.error("Could not load master product registry.");
      } finally {
        setIsLoading(false);
      }
    };
    if (backendUrl && token) fetchMasterProducts();
  }, [backendUrl, token]);

  // Keyboard navigation for Master Lookups (Bottom Panel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filteredMasterProducts.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMasterIndex((prev) => Math.min(prev + 1, filteredMasterProducts.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMasterIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        addSelectedProductToGrid(filteredMasterProducts[selectedMasterIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [masterProducts, searchQuery, selectedMasterIndex]);

  // Keep selected master item scrolled into view automatically
  useEffect(() => {
    if (bottomTableRef.current) {
      const activeEl = bottomTableRef.current.children[selectedMasterIndex];
      if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedMasterIndex]);

  // Filter Master Products by query string
  const filteredMasterProducts = masterProducts.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Push an item from bottom master search index straight up into active grid rows
  const addSelectedProductToGrid = (product) => {
    if (activeRows.some((row) => row.productId === product._id)) {
      toast.warn(`${product.name.toUpperCase()} is already in your entry voucher.`);
      return;
    }

    const newRow = {
      sNo: activeRows.length + 1,
      productId: product._id,
      sku: product.sku,
      name: product.name,
      pack: "1",
      sRate: product.price || 0,
      qty: 0,
      profitPercent: 0,
      pValue: 0, 
    };

    setActiveRows([...activeRows, newRow]);
    toast.success(`${product.name} linked to grid ledger.`);
  };

  // Re-calculate inline profit and purchase values when variables shift
  const handleInputChange = (index, field, value) => {
    const updatedRows = [...activeRows];
    updatedRows[index][field] = value;

    const qty = Number(updatedRows[index].qty || 0);
    const sRate = Number(updatedRows[index].sRate || 0);
    const profitPercent = Number(updatedRows[index].profitPercent || 0);

    if (field === "qty" || field === "sRate" || field === "profitPercent") {
      const grossSellingValue = sRate * qty;
      const calculatedCostValue = grossSellingValue / (1 + profitPercent / 100);
      updatedRows[index].pValue = isNaN(calculatedCostValue) ? 0 : Number(calculatedCostValue.toFixed(2));
    }

    setActiveRows(updatedRows);
  };

  const removeRowFromGrid = (index) => {
    const freshRows = activeRows.filter((_, i) => i !== index).map((row, idx) => ({ ...row, sNo: idx + 1 }));
    setActiveRows(freshRows);
  };

  const executeBatchCommitSave = async () => {
    if (activeRows.length === 0) {
      toast.error("Voucher entry matrix is empty.");
      return;
    }

    // Direct numerical stock sanity checks
    const dataValid = activeRows.every((row) => Number(row.qty) > 0);
    if (!dataValid) {
      toast.error("Please provide valid Quantities greater than 0 for all entries.");
      return;
    }

    const toastId = toast.loading("Processing opening stock allocations...");
    try {
      const response = await axios.post(
        `${backendUrl}/api/product/opening-stock-batch`,
        { items: activeRows },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.dismiss(toastId);
        toast.success("🎉 Opening Stock Ledger Saved Successfully!");
        setActiveRows([]);
        window.location.reload();
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error(err.response?.data?.message || "Error writing inventory entry logs.");
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans text-slate-800 text-xs select-none">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-slate-800 text-slate-100 p-3 rounded-lg flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
            📥 Opening Stock Entry Counter Console
          </h1>
          <p className="text-[10px] text-slate-400 font-medium">
            Double-grid layout matrix. Quantities typed here instantly initialize master stock configurations.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={executeBatchCommitSave} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded font-black uppercase text-[10px] text-white tracking-widest shadow transition-all active:scale-95">
            💾 Save Voucher
          </button>
          <button onClick={() => setActiveRows([])} className="bg-rose-600 hover:bg-rose-700 px-4 py-1.5 rounded font-black uppercase text-[10px] text-white tracking-widest shadow transition-all active:scale-95">
            🗑️ Clear Sheet
          </button>
        </div>
      </div>

      {/* 🟢 TOP GRID PANEL: ACTIVE ENTRY SHEET (BATCH & EXPIRY ENTIRELY REMOVED) */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300 uppercase tracking-wide text-[10px]">
          📋 Active Initialization Balance Sheet List
        </div>
        
        <div className="overflow-x-auto w-full max-h-[300px] overflow-y-auto">
          <table className="w-full min-w-[750px] text-left border-collapse font-mono">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-300 text-[11px] font-bold">
                <th className="p-2 border-r text-center w-12">S No</th>
                <th className="p-2 border-r w-24">SKU</th>
                <th className="p-2 border-r">Product Particular Description</th>
                <th className="p-2 border-r text-center w-16">Pack</th>
                <th className="p-2 border-r text-right w-24">S Rate</th>
                <th className="p-2 border-r text-center w-24">Qty</th>
                <th className="p-2 border-r text-right w-24">Profit %</th>
                <th className="p-2 border-r text-right w-28 bg-slate-50/50">P Value</th>
                <th className="p-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activeRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400 font-bold italic text-xs uppercase tracking-wider">
                    🛒 Grid sheet empty. Select product blueprints from the master deck catalog below to allocate quantities...
                  </td>
                </tr>
              ) : (
                activeRows.map((row, idx) => (
                  <tr key={row.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-1 border-r text-center font-bold bg-slate-50 text-slate-500">{row.sNo}</td>
                    <td className="p-1 border-r text-slate-600 font-bold text-[11px]">{row.sku}</td>
                    <td className="p-1 border-r font-black text-slate-900 uppercase text-[11px]">{row.name}</td>
                    <td className="p-0 border-r">
                      <input type="text" value={row.pack} onChange={(e) => handleInputChange(idx, "pack", e.target.value)} className="w-full h-7 text-center border-0 outline-none focus:bg-yellow-50 font-bold" />
                    </td>
                    <td className="p-0 border-r">
                      <input type="number" value={row.sRate} onChange={(e) => handleInputChange(idx, "sRate", e.target.value)} className="w-full h-7 text-right px-1 border-0 outline-none focus:bg-yellow-50 font-bold" />
                    </td>
                    <td className="p-0 border-r">
                      <input type="number" value={row.qty} onChange={(e) => handleInputChange(idx, "qty", e.target.value)} className="w-full h-7 text-center bg-cyan-50/40 border-0 outline-none focus:bg-yellow-50 font-black text-blue-700" />
                    </td>
                    <td className="p-0 border-r">
                      <input type="number" value={row.profitPercent} onChange={(e) => handleInputChange(idx, "profitPercent", e.target.value)} className="w-full h-7 text-right px-1 border-0 outline-none focus:bg-yellow-50 font-bold text-emerald-700" />
                    </td>
                    <td className="p-1 border-r text-right font-black text-slate-900 bg-slate-50/80">
                      {currencySymbol}{row.pValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-1 text-center">
                      <button type="button" onClick={() => removeRowFromGrid(idx)} className="text-rose-600 hover:text-rose-800 font-bold">✕</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔵 BOTTOM GRID PANEL: MASTER DIRECTORY REFERENCE QUEUE */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden">
        
        {/* INTERACTIVE CONTROLS / FILTER BAR */}
        <div className="bg-slate-200 p-2 border-b border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-slate-700 font-bold uppercase tracking-wide text-[10px] select-none">
            🔍 Master Directory Search Index Deck (Use Arrow Keys & Enter)
          </div>
          <input
            type="text"
            placeholder="TYPE ANY NAME, BRAND, OR SKU CODE TO FILTER MASTER BLUEPRINTS..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedMasterIndex(0); }}
            className="w-full sm:w-96 p-1.5 border border-slate-400 rounded font-bold uppercase text-xs outline-none bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* DATA CONTAINER ROW SET */}
        <div className="overflow-x-auto w-full max-h-[250px] overflow-y-auto">
          <table className="w-full min-w-[950px] text-left border-collapse font-mono">
            <thead>
              <tr className="bg-slate-800 text-slate-300 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-2 border-r border-slate-700 text-center w-14">S No</th>
                <th className="p-2 border-r border-slate-700 w-24">SKU</th>
                <th className="p-2 border-r border-slate-700">Product Specification Variant Profile</th>
                <th className="p-2 border-r border-slate-700 w-32">Product Group</th>
                <th className="p-2 border-r border-slate-700 w-32">Marketer/Brand</th>
                <th className="p-2 border-r border-slate-700 text-center w-16">Rack</th>
                <th className="p-2 border-r border-slate-700 text-center w-16">Min</th>
                <th className="p-2 border-r border-slate-700 text-center w-16">Max</th>
                <th className="p-2 text-center w-20 bg-slate-900 text-cyan-400">Current Stock</th>
              </tr>
            </thead>
            <tbody ref={bottomTableRef} className="divide-y divide-slate-200 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center italic text-slate-400 font-medium">
                    Querying master inventory nodes and building index schemas...
                  </td>
                </tr>
              ) : filteredMasterProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center italic text-slate-400 font-bold uppercase">
                    No products matched your search parameters inside the current partition.
                  </td>
                </tr>
              ) : (
                filteredMasterProducts.map((prod, index) => {
                  const isCurrentSelection = index === selectedMasterIndex;
                  return (
                    <tr
                      key={prod._id}
                      onClick={() => { setSelectedMasterIndex(index); addSelectedProductToGrid(prod); }}
                      className={`cursor-pointer transition-all ${
                        isCurrentSelection 
                          ? "bg-amber-100 text-slate-950 font-black border-y-2 border-amber-400 scale-[0.998]" 
                          : "hover:bg-slate-50 text-slate-700 font-medium"
                      }`}
                    >
                      <td className={`p-1.5 border-r text-center ${isCurrentSelection ? 'bg-amber-200 border-amber-400 font-black' : 'bg-slate-50 text-slate-400'}`}>
                        {index + 1}
                      </td>
                      <td className="p-1.5 border-r font-bold text-xs">{prod.sku}</td>
                      <td className="p-1.5 border-r uppercase tracking-tight text-xs font-black">{prod.name}</td>
                      <td className="p-1.5 border-r text-slate-500 uppercase">{prod.category || "General Wear"}</td>
                      <td className="p-1.5 border-r text-slate-900 uppercase font-bold">{prod.brand || "Unbranded"}</td>
                      <td className="p-1.5 border-r text-center font-bold text-blue-600">{prod.specifications?.rackLocation || prod.rack || "A000"}</td>
                      <td className="p-1.5 border-r text-center text-slate-400">{prod.minStockAlert || 0}</td>
                      <td className="p-1.5 border-r text-center text-slate-400">{prod.maxStockLimit || 999}</td>
                      <td className={`p-1.5 text-center font-mono font-black text-xs ${isCurrentSelection ? 'bg-amber-200' : 'bg-slate-100 text-slate-900'}`}>
                        {prod.stock || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}