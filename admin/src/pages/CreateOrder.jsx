import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { currencySymbol } from "../App";

export default function CreateOrder({ backendUrl, token }) {
  // -------------------------------------------------------------------------
  // 1. STATE CONFIGURATIONS
  // -------------------------------------------------------------------------
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(true);

  const [customerLookup, setCustomerLookup] = useState("");
  const [mobileNo, setMobileNo] = useState("");

  // Catalog Frame States
  const [frameInput, setFrameInput] = useState("");
  const [frameSuggestions, setFrameSuggestions] = useState([]);
  const [frameActiveIndex, setFrameActiveIndex] = useState(-1);

  const [itemName, setItemName] = useState("");
  const [frameId, setFrameId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [itemTotal, setItemTotal] = useState(0);

  // Dynamic States loaded directly from your MongoDB 'lensconfigs' Collection
  const [dbLensTypes, setDbLensTypes] = useState([]);
  const [dbLensFeatures, setDbLensFeatures] = useState([]);

  // Selections
  const [lensType, setLensType] = useState("");
  const [lensPrice, setLensPrice] = useState(0);

  // 🌟 Multiple Lens Features state array tracking
  const [selectedFeatures, setSelectedFeatures] = useState([]);

  const [isPrescriptionRequired, setIsPrescriptionRequired] = useState(true);

  // Prescription OD / OS Structure Matrix
  const [rightEye, setRightEye] = useState({
    sph: "0.00",
    cyl: "0.00",
    axis: "0",
    add: "0.00",
  });
  const [leftEye, setLeftEye] = useState({
    sph: "0.00",
    cyl: "0.00",
    axis: "0",
    add: "0.00",
  });

  const [advancePaid, setAdvancePaid] = useState(0);

  const customerScrollRef = useRef(null);
  const frameScrollRef = useRef(null);

  // Generate standard range values for the drop-down charts
  const sphCylRanges = [];
  for (let i = 14.0; i >= -14.0; i -= 0.25) {
    const formatted = i > 0 ? `+${i.toFixed(2)}` : i.toFixed(2);
    sphCylRanges.push(formatted === "-0.00" ? "0.00" : formatted);
  }

  // -------------------------------------------------------------------------
  // 2. ENTER-KEY TEXT BOX NAVIGATION MANAGEMENT
  // -------------------------------------------------------------------------
  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      // Allow list selectors to override the focus redirection path rules
      if (e.target.name === "customerSearch" && customerSuggestions.length > 0)
        return;
      if (e.target.name === "frameSearchInput" && frameSuggestions.length > 0)
        return;

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

  // -------------------------------------------------------------------------
  // 3. LIVE MONGODB INTEGRATION (FETCH LENS CONFIGS)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const fetchLensMatrixData = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/lens/all`, {
          headers: { token },
        });
        const configsArray = response.data.data || [];

        if (configsArray.length > 0) {
          setDbLensTypes(
            configsArray.filter((item) => item.category === "LENS_TYPE"),
          );
          setDbLensFeatures(
            configsArray.filter((item) => item.category === "LENS_FEATURE"),
          );
        }
      } catch (err) {
        console.error("Lens database configuration lookup error:", err.message);
      }
    };
    if (backendUrl && token) fetchLensMatrixData();
  }, [backendUrl, token]);

  // -------------------------------------------------------------------------
  // 4. AUTOCOMPLETE DEBOUNCED LOOKUPS ENGINE
  // -------------------------------------------------------------------------
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const query = customerSearchInput.trim();
      if (query.length >= 1) {
        try {
          const res = await axios.get(
            `${backendUrl}/api/inventory/search-customer?mobileNum=${encodeURIComponent(query)}`,
            { headers: { token } },
          );
          if (res.data.success && res.data.history) {
            setCustomerSuggestions(res.data.history);
            setCustomerActiveIndex(-1);
          }
        } catch (err) {
          setCustomerSuggestions([]);
        }
      } else {
        setCustomerSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchInput, backendUrl, token]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const queryStr = frameInput.trim();
      if (queryStr.length > 0) {
        try {
          const res = await axios.get(
            `${backendUrl}/api/inventory/search-products?query=${queryStr}&category=EYE_GLASS`,
            { headers: { token } },
          );
          if (res.data && Array.isArray(res.data.products)) {
            setFrameSuggestions(res.data.products.slice(0, 8));
            setFrameActiveIndex(-1);
          }
        } catch (err) {
          setFrameSuggestions([]);
        }
      } else {
        setFrameSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(delayDebounceFn);
  }, [frameInput, backendUrl, token]);

  // -------------------------------------------------------------------------
  // 5. SELECTION KEYBOARD & CLICK EVENT HANDLERS
  // -------------------------------------------------------------------------
  const selectCustomerItem = (cust) => {
    setCustomerLookup(cust.patientName.toUpperCase());
    setMobileNo(cust.patientMobile.replace("+91", ""));
    setCustomerSearchInput(
      `${cust.patientName} (${cust.patientMobile})`.toUpperCase(),
    );
    setCustomerSuggestions([]);
    setIsCustomerSearchOpen(false);

    setTimeout(() => {
      const nextEl = document.querySelector('[name="frameSearchInput"]');
      if (nextEl) nextEl.focus();
    }, 50);
  };

  const selectFrameItem = (prod) => {
    if (Number(prod.stock || 0) <= 0) {
      toast.error(`Halted! "${prod.name}" has 0 available units.`);
      return;
    }
    setFrameId(prod._id);
    setPrice(Number(prod.price || 0));
    setItemName(`${prod.brand || "Generic"} - ${prod.name}`.toUpperCase());
    setFrameInput(`${prod.brand || "Generic"} - ${prod.name}`.toUpperCase());
    setFrameSuggestions([]);

    setTimeout(() => {
      const nextEl = document.querySelector('[name="itemQty"]');
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
      }
    }, 50);
  };

  // 🌟 Fixed keyboard arrow list navigation logic handlers
  const handleCustomerKeyDown = (e) => {
    if (customerSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustomerActiveIndex((p) => {
        const next = Math.min(p + 1, customerSuggestions.length - 1);
        if (
          customerScrollRef.current &&
          customerScrollRef.current.children[next]
        ) {
          customerScrollRef.current.children[next].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustomerActiveIndex((p) => {
        const next = Math.max(p - 1, 0);
        if (
          customerScrollRef.current &&
          customerScrollRef.current.children[next]
        ) {
          customerScrollRef.current.children[next].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIdx = customerActiveIndex >= 0 ? customerActiveIndex : 0;
      selectCustomerItem(customerSuggestions[targetIdx]);
    }
  };

  const handleFrameKeyDown = (e) => {
    if (frameSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFrameActiveIndex((p) => {
        const next = Math.min(p + 1, frameSuggestions.length - 1);
        if (frameScrollRef.current && frameScrollRef.current.children[next]) {
          frameScrollRef.current.children[next].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFrameActiveIndex((p) => {
        const next = Math.max(p - 1, 0);
        if (frameScrollRef.current && frameScrollRef.current.children[next]) {
          frameScrollRef.current.children[next].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetIdx = frameActiveIndex >= 0 ? frameActiveIndex : 0;
      selectFrameItem(frameSuggestions[targetIdx]);
    }
  };

  const handleLensSelectionChange = (chosenName) => {
    setLensType(chosenName);
    const match = dbLensTypes.find((l) => l.name === chosenName);
    setLensPrice(match ? Number(match.price || 0) : 0);
  };

  // 🌟 Handles adding/removing multiple lens features seamlessly
  const handleFeatureToggle = (featureObj) => {
    const alreadySelected = selectedFeatures.some(
      (f) => f._id === featureObj._id,
    );
    if (alreadySelected) {
      setSelectedFeatures(
        selectedFeatures.filter((f) => f._id !== featureObj._id),
      );
    } else {
      setSelectedFeatures([...selectedFeatures, featureObj]);
    }
  };

  // -------------------------------------------------------------------------
  // 6. LIVE FINANCES AGGREGATOR CALCULATIONS
  // -------------------------------------------------------------------------
  useEffect(() => {
    setItemTotal(Number(qty) * Number(price));
  }, [qty, price]);

  // 🌟 Calculate the total of all selected lens features combined
  const totalFeaturesPrice = selectedFeatures.reduce(
    (sum, curr) => sum + Number(curr.price || 0),
    0,
  );

  const totalAmount = itemTotal + lensPrice + totalFeaturesPrice;
  const balanceAmount = totalAmount - Number(advancePaid);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!customerLookup || !mobileNo) {
      toast.error("Please supply baseline client profile data fields.");
      return;
    }
    const orderPayload = {
      invoiceNumber: "ORD-" + Date.now().toString().slice(-6),
      patientName: customerLookup.toUpperCase(),
      patientMobile: mobileNo.startsWith("+91") ? mobileNo : `+91${mobileNo}`,
      itemName: itemName, // 🌟 Maps directly to backend extraction variable
      frameProduct: frameId || null, // 🌟 Crucial: ensures item lookup findById updates stock counts
      qty: Number(qty),
      price: Number(price),
      lensType: lensType,
      lensPrice: Number(lensPrice),
      lensFeatures: selectedFeatures.map((f) => f.name).join(", ") || "None",
      lensFeaturePrice: Number(totalFeaturesPrice),
      totalAmount: Number(totalAmount),
      advancePaid: Number(advancePaid),
      balanceDue: Number(balanceAmount), // 🌟 Maps directly to backend extraction variable
      rightEyePower: isPrescriptionRequired ? rightEye : null,
      leftEyePower: isPrescriptionRequired ? leftEye : null,
    };

    try {
      // 🌟 UPDATED ENDPOINT PATH HERE 🌟
      const response =await axios.post(`${backendUrl}/api/order/create-invoice`, orderPayload, {
        headers: { token },
      });
      if (response.data.success) {
        // 🌟 Styled with a solid emerald green background and crisp white text!
        toast.success("🎉 COUNTER BOOKING INVOICE SAVED SUCCESSFULLY!", {
          className: "!bg-emerald-600 !text-white font-bold text-xs tracking-wide shadow-2xl rounded-lg border border-emerald-700",
          progressClassName: "!bg-white" // Turns the little countdown bar white too!
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      toast.error("❌ Error saving invoice entry on backend server cluster.");
    }
  };
  return (
    <div
      className="w-full max-w-6xl mx-auto bg-white border border-slate-300 shadow-md rounded-lg p-4 sm:p-6 font-sans text-slate-800"
      onKeyDown={handleFormKeyDown}
    >
      <ToastContainer position="top-right" autoClose={1500} />

      {/* TITLE APP BAR */}
      <div className="border-b border-slate-200 pb-4 mb-6 flex justify-between items-center select-none">
        <h1 className="text-lg font-bold tracking-tight text-slate-800 uppercase flex items-center gap-2">
          👓 Counter Order Booking Form
        </h1>
        <span className="text-xs font-mono font-bold bg-slate-100 border px-3 py-1 rounded">
          POS Module Layer
        </span>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* ROW 1: Smart Bi-Directional Auto-Sync Customer Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 border rounded-xl">
          <div className="relative">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              🔍 Search Patient Name / Mobile
            </label>
            <input
              type="text"
              name="customerSearch"
              value={customerSearchInput}
              onKeyDown={handleCustomerKeyDown}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setCustomerSearchInput(val);
                setCustomerLookup(val);
                setIsCustomerSearchOpen(true);
              }}
              data-next="manualPatientName"
              placeholder="TYPE NAME OR PHONE..."
              className="w-full p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 uppercase outline-none text-sm bg-white font-bold"
              autoComplete="off"
            />
            {isCustomerSearchOpen && customerSuggestions.length > 0 && (
              <div
                ref={customerScrollRef}
                className="absolute left-0 right-0 mt-1 bg-white border border-blue-400 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y"
              >
                {customerSuggestions.map((cust, idx) => (
                  <div
                    key={cust._id}
                    onClick={() => selectCustomerItem(cust)}
                    className={`p-2.5 cursor-pointer flex justify-between items-center text-xs transition-colors ${idx === customerActiveIndex ? "bg-blue-600 text-white font-bold" : "hover:bg-blue-50 text-slate-800"}`}
                  >
                    <div>
                      <p className="font-bold text-sm">{cust.patientName}</p>
                      <p className="font-mono text-[11px] opacity-75">
                        Phone: {cust.patientMobile}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              name="manualPatientName"
              value={customerLookup}
              onChange={(e) => setCustomerLookup(e.target.value.toUpperCase())}
              data-next="manualPatientMobile"
              placeholder="ENTER CLIENT NAME"
              className="w-full p-2 border border-blue-300 rounded text-sm font-extrabold uppercase tracking-wide text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Mobile No
            </label>
            <input
              type="text"
              name="manualPatientMobile"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              data-next="frameSearchInput"
              placeholder="ENTER PHONE NUMBER"
              className="w-full p-2 border border-blue-300 rounded text-sm font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />
          </div>
        </div>

        {/* ROW 2: Frame Item Lookup Field Line */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-100 p-4 border border-slate-300 rounded-xl relative">
          <div className="md:col-span-6 relative">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              🔍 Item Name / SKU / Code (Popup Items)
            </label>
            <input
              type="text"
              name="frameSearchInput"
              value={frameInput}
              onChange={(e) => setFrameInput(e.target.value.toUpperCase())}
              onKeyDown={handleFrameKeyDown} // 🌟 Active key arrow listener
              data-next="itemQty"
              placeholder="SEARCH CATALOG MODELS / BARCODES..."
              className="w-full p-2 border border-gray-300 rounded bg-white font-bold text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            {frameSuggestions.length > 0 && (
              <div
                ref={frameScrollRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-400 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y p-1"
              >
                {frameSuggestions.map((prod, idx) => {
                  const isOutOfStock = Number(prod.stock || 0) <= 0;
                  return (
                    <div
                      key={prod._id}
                      onClick={() => !isOutOfStock && selectFrameItem(prod)}
                      className={`p-2 flex justify-between items-center text-xs rounded my-0.5 cursor-pointer transition-colors ${isOutOfStock ? "bg-rose-50 opacity-70 cursor-not-allowed" : idx === frameActiveIndex ? "bg-blue-600 text-white font-bold" : "hover:bg-blue-100 text-slate-800"}`}
                    >
                      <div>
                        <p
                          className={`font-bold ${isOutOfStock ? "text-rose-900 line-through" : "text-slate-900"}`}
                        >
                          {prod.name.toUpperCase()}
                        </p>
                        <p className="text-[10px] opacity-75 font-mono">
                          SKU: {prod.sku || "N/A"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 font-mono font-bold text-[10px] rounded ${isOutOfStock ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-100 text-emerald-800"}`}
                        >
                          {isOutOfStock ? "SOLD OUT" : `${prod.stock} units`}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-700">
                          {currencySymbol}
                          {prod.price}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              QTY
            </label>
            <input
              type="number"
              name="itemQty"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              data-next="itemPrice"
              className="w-full p-2 border border-slate-300 rounded bg-white text-center font-bold text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Price
            </label>
            <input
              type="number"
              name="itemPrice"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              data-next="lensTypeSelect"
              className="w-full p-2 border border-slate-300 rounded bg-white text-right font-semibold text-sm font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-blue-700 mb-1">
              Total
            </label>
            <div className="w-full p-2 border border-blue-200 rounded bg-blue-50 text-right font-mono font-black text-blue-700 text-sm">
              {currencySymbol}
              {itemTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* ROW 3: Lens Selection & 🌟 Premium Feature Badges Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 p-4 border rounded-xl items-start">
          {/* Base Lens Dropdown Selector */}
          <div className="lg:col-span-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase text-slate-600">
                Lens Type Selection
              </label>
              {lensPrice > 0 && (
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  +{currencySymbol}
                  {lensPrice}
                </span>
              )}
            </div>
            <select
              name="lensTypeSelect"
              value={lensType}
              onChange={(e) => handleLensSelectionChange(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Lens Design --</option>
              {dbLensTypes.map((l) => (
                <option key={l._id} value={l.name}>
                  {l.name.toUpperCase()} ({currencySymbol}
                  {l.price})
                </option>
              ))}
            </select>
          </div>

          {/* 🌟 Multiple Selection Matrix for Coatings & Treatments */}
          <div className="lg:col-span-8">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase text-slate-600">
                🛡️ Select Multiple Coatings / Features
              </label>
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Features Total: +{currencySymbol}
                {totalFeaturesPrice}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 bg-white p-2.5 border border-slate-200 rounded-lg">
              {dbLensFeatures.map((f) => {
                const isChecked = selectedFeatures.some(
                  (item) => item._id === f._id,
                );
                return (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => handleFeatureToggle(f)}
                    className={`text-xs px-3 py-2 rounded-md font-bold border transition-all flex items-center gap-1.5 shadow-sm outline-none select-none ${
                      isChecked
                        ? "bg-blue-600 border-blue-700 text-white ring-2 ring-blue-100"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{isChecked ? "✓" : "＋"}</span>
                    <span>{f.name.toUpperCase()}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${isChecked ? "bg-blue-500 text-white" : "bg-slate-800 text-emerald-400"}`}
                    >
                      {currencySymbol}
                      {f.price}
                    </span>
                  </button>
                );
              })}
              {dbLensFeatures.length === 0 && (
                <span className="text-xs text-slate-400 italic font-medium p-1">
                  Loading database lens features directory...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: Structured Prescription Parameter Input Grid */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-700 text-white font-bold text-xs uppercase px-4 py-2 flex justify-between items-center select-none">
            <span>Prescription Parameter Input Grid</span>
            <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer normal-case">
              <input
                type="checkbox"
                checked={isPrescriptionRequired}
                onChange={(e) => setIsPrescriptionRequired(e.target.checked)}
                className="rounded border-slate-400 text-blue-600 w-3.5 h-3.5"
              />
              <span>Requires Rx Profile</span>
            </label>
          </div>

          <div className="p-3 bg-white overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b text-xs uppercase tracking-wide">
                  <th className="p-2 border text-left w-24">EYE</th>
                  <th className="p-2 border text-center">SPHERE (SPH)</th>
                  <th className="p-2 border text-center">CYLINDER (CYL)</th>
                  <th className="p-2 border text-center">AXIS</th>
                  <th className="p-2 border text-center">ADD POWER</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border font-bold text-slate-700 bg-slate-50 text-center text-xs">
                    R.OD
                  </td>
                  <td className="p-1 border">
                    <select
                      name="r_sph"
                      data-next="r_cyl"
                      value={rightEye.sph}
                      onChange={(e) =>
                        setRightEye({ ...rightEye, sph: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges.map((v) => (
                        <option key={`r-sph-${v}`} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="r_cyl"
                      data-next="r_axis"
                      value={rightEye.cyl}
                      onChange={(e) =>
                        setRightEye({ ...rightEye, cyl: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges.map((v) => (
                        <option key={`r-cyl-${v}`} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="r_axis"
                      data-next="r_add"
                      value={rightEye.axis}
                      onChange={(e) =>
                        setRightEye({ ...rightEye, axis: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {Array.from({ length: 181 }, (_, i) => i).map((v) => (
                        <option key={`r-ax-${v}`} value={v}>
                          {v}°
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="r_add"
                      data-next="l_sph"
                      value={rightEye.add}
                      onChange={(e) =>
                        setRightEye({ ...rightEye, add: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges
                        .filter((v) => parseFloat(v) >= 0)
                        .map((v) => (
                          <option key={`r-add-${v}`} value={v}>
                            +{v}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 border font-bold text-slate-700 bg-slate-50 text-center text-xs">
                    L.OS
                  </td>
                  <td className="p-1 border">
                    <select
                      name="l_sph"
                      data-next="l_cyl"
                      value={leftEye.sph}
                      onChange={(e) =>
                        setLeftEye({ ...leftEye, sph: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges.map((v) => (
                        <option key={`l-sph-${v}`} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="l_cyl"
                      data-next="l_axis"
                      value={leftEye.cyl}
                      onChange={(e) =>
                        setLeftEye({ ...leftEye, cyl: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges.map((v) => (
                        <option key={`l-cyl-${v}`} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="l_axis"
                      data-next="l_add"
                      value={leftEye.axis}
                      onChange={(e) =>
                        setLeftEye({ ...leftEye, axis: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {Array.from({ length: 181 }, (_, i) => i).map((v) => (
                        <option key={`l-ax-${v}`} value={v}>
                          {v}°
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1 border">
                    <select
                      name="l_add"
                      data-next="advancePaidField"
                      value={leftEye.add}
                      onChange={(e) =>
                        setLeftEye({ ...leftEye, add: e.target.value })
                      }
                      disabled={!isPrescriptionRequired}
                      className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {sphCylRanges
                        .filter((v) => parseFloat(v) >= 0)
                        .map((v) => (
                          <option key={`l-add-${v}`} value={v}>
                            +{v}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ROW 5: Accounting aggregates balance sheet */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800 text-white p-5 rounded-xl items-center shadow-lg">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Total Bill Amount
            </label>
            <div className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono font-black text-xl text-right">
              {currencySymbol}
              {totalAmount.toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-blue-300 mb-1">
              Advance Deposit Paid
            </label>
            <input
              type="number"
              name="advancePaidField"
              value={advancePaid === 0 ? "" : advancePaid}
              onChange={(e) => setAdvancePaid(Number(e.target.value))}
              placeholder="0.00"
              className="w-full p-2 border-2 border-blue-500 rounded bg-white font-mono font-bold text-xl text-right text-blue-900 outline-none focus:ring-4 focus:ring-blue-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Balance to be Paid
            </label>
            <div
              className={`w-full p-2.5 border rounded font-mono font-black text-xl text-right ${balanceAmount > 0 ? "bg-rose-950 border-rose-800 text-rose-400" : "bg-emerald-950 border-emerald-800 text-emerald-400"}`}
            >
              {currencySymbol}
              {balanceAmount >= 0 ? balanceAmount.toFixed(2) : "0.00"}
            </div>
          </div>
        </div>

        {/* BOTTOM COMMAND PANELS */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs uppercase tracking-wide"
          >
            Clear Sheet
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded text-xs uppercase tracking-wider shadow-md"
          >
            Save Counter Invoice 🧾
          </button>
        </div>
      </form>
    </div>
  );
}
