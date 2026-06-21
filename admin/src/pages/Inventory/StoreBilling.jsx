import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';

// Localized categories map tracking retail item variations
const categoryMap = {
  EYE_GLASS: ["Full-Rim", "Half-Rim", "Rimless", "Kids"],
  SUN_GLASS: ["Polarized", "Non-Polarized", "Mirrored", "Gradient"],
  UV_GLASS: ["Blue-Cut", "Anti-Glare", "UV400 Clear"],
  POWERED_GLASS: ["Single Vision", "Progressive", "Photochromic"],
  CONTACT_LENS: ["Daily", "Fortnightly", "Monthly", "Yearly"],
};

// ==========================================
// INTERNAL SUB-COMPONENT: THERMAL RECEIPT POPUP
// ==========================================
const ThermalReceipt = ({ invoiceData }) => {
  if (!invoiceData) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-print-area').innerHTML;

    // Create an isolated printing frame window context
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt - ${invoiceData.invoiceNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 76mm;
              margin: 0;
              padding: 2mm;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 4px 0;
              width: 100%;
            }
            .grid-table {
              width: 100%;
              border-collapse: collapse;
              margin: 4px 0;
            }
            .grid-table th, .grid-table td {
              font-size: 11px;
              padding: 2px 0;
              vertical-align: top;
            }
            .power-matrix {
              font-size: 10px;
              background: #f5f5f5;
              padding: 2px;
              margin: 2px 0;
            }
            .footer-msg {
              font-size: 10px;
              margin-top: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          \${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-slate-100 p-3 sm:p-4 rounded-xl border border-gray-300 max-w-sm mx-auto my-2 shadow-sm">
      <div id="thermal-print-area" className="hidden">
        <div className="text-center">
          <h2 className="font-bold" style={{ fontSize: '16px', margin: '0 0 2px 0' }}>SUPER OPTICALS</h2>
          <p style={{ margin: '0', fontSize: '11px' }}>123, Main Bazaar Road, Salem</p>
          <p style={{ margin: '0', fontSize: '11px' }}>Phone: +91 90877 95074</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>SALES INVOICE</p>
        </div>

        <div className="divider"></div>

        <div style={{ fontSize: '11px' }}>
          <div><strong>Bill No:</strong> {invoiceData.invoiceNumber}</div>
          <div><strong>Date:</strong> {new Date(invoiceData.date || Date.now()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div><strong>Patient:</strong> {invoiceData.patientName}</div>
          <div><strong>Mobile:</strong> {invoiceData.patientMobile}</div>
          <div><strong>Status:</strong> <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{invoiceData.status}</span></div>
        </div>

        <div className="divider"></div>

        <table className="grid-table">
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th className="font-bold">Item Description</th>
              <th className="text-right font-bold" style={{ width: '25%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items && invoiceData.items.map((item, idx) => (
              <React.Fragment key={idx}>
                <tr>
                  <td>
                    <span className="font-bold">{item.productName}</span>
                    <br />
                    <span style={{ fontSize: '10px', color: '#444' }}>
                      Type: {item.lensType} | Features: {item.lensFeatures}
                    </span>
                  </td>
                  <td className="text-right font-mono">₹{item.itemSubtotal}</td>
                </tr>
                
                {(item.rightEyePower?.sph !== '0.00' || item.leftEyePower?.sph !== '0.00' || item.rightEyePower?.cyl !== '0.00' || item.leftEyePower?.cyl !== '0.00') && (
                  <tr>
                    <td colSpan="2">
                      <div className="power-matrix">
                        <div>R(OD): SPH {item.rightEyePower.sph} | CYL {item.rightEyePower.cyl} | AXIS {item.rightEyePower.axis}° | ADD {item.rightEyePower.add}</div>
                        <div>L(OS): SPH {item.leftEyePower.sph} | CYL {item.leftEyePower.cyl} | AXIS {item.leftEyePower.axis}° | ADD {item.leftEyePower.add}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div className="divider"></div>

        <div style={{ fontSize: '12px', paddingLeft: '15mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Discount:</span>
            <span className="font-mono">-₹{invoiceData.discount || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Net Total:</span>
            <span className="font-mono">₹{invoiceData.totalAmount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
            <span>Paid Upfront:</span>
            <span className="font-mono">₹{invoiceData.advanceAmount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '2px', color: invoiceData.balanceDue > 0 ? '#dc2626' : '#16a34a' }}>
            <span>BALANCE DUE:</span>
            <span className="font-mono">₹{invoiceData.balanceDue}</span>
          </div>
        </div>

        <div className="divider"></div>

        <div style={{ fontSize: '11px' }}>
          <div><strong>Mode:</strong> {invoiceData.paymentMode}</div>
        </div>

        <div className="footer-msg">
          <p className="font-bold" style={{ margin: '0' }}>Thank You for Your Trust!</p>
          <p style={{ margin: '2px 0 0 0' }}>Tested lenses cannot be changed or exchanged. Delivery within 3 working days.</p>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs font-bold text-emerald-700">✓ Invoice Ready to Print ({invoiceData.invoiceNumber})</p>
        <button
          type="button"
          onClick={handlePrint}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          🖨️ Fire 80mm Thermal Print Job
        </button>
      </div>
    </div>
  );
};

// ==========================================
// MAIN PARENT EXPORT COMPONENT
// ==========================================
const StoreBilling = ({ backendUrl, token }) => {
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [mobileNum, setMobileNum] = useState('');
  const [patientName, setPatientName] = useState('');
  const [pastHistory, setPastHistory] = useState([]);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);

  const [items, setItems] = useState([]);

  const [selectedProductCategory, setSelectedProductCategory] = useState('EYE_GLASS');
  const [selectedSubCategory, setSelectedSubCategory] = useState('Full-Rim');
  const [frameInput, setFrameInput] = useState('');
  const [frameId, setFrameId] = useState('');
  const [framePrice, setFramePrice] = useState(0);
  const [selectedBrandAndName, setSelectedBrandAndName] = useState('');
  const [selectedProductRawData, setSelectedProductRawData] = useState(null);

  const [dbLensTypes, setDbLensTypes] = useState([]);
  const [dbLensFeatures, setDbLensFeatures] = useState([]);

  const [lensType, setLensType] = useState(''); 
  const [baseLensPrice, setBaseLensPrice] = useState(0);      
  const [selectedFeatures, setSelectedFeatures] = useState([]); 

  const defaultEyePower = { sph: '0.00', cyl: '0.00', axis: '0', add: '0.00', pd: '60' };
  const [rightEye, setRightEye] = useState({ ...defaultEyePower });
  const [leftEye, setLeftEye] = useState({ ...defaultEyePower });

  const [discount, setDiscount] = useState(0); 
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [advancePaid, setAdvancePaid] = useState(0);

  const [frameSuggestions, setFrameSuggestions] = useState([]);
  const [frameActiveIndex, setFrameActiveIndex] = useState(-1);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);

  const [activePrintedInvoice, setActivePrintedInvoice] = useState(null);

  const frameScrollRef = useRef(null);
  const customerScrollRef = useRef(null);

  const isPrescriptionRequired = 
    selectedProductCategory === 'EYE_GLASS' || 
    selectedProductCategory === 'POWERED_GLASS' ||
    selectedProductCategory === 'CONTACT_LENS';

  const isLensConfigRequired = 
    selectedProductCategory === 'EYE_GLASS' || 
    selectedProductCategory === 'POWERED_GLASS' ||
    selectedProductCategory === 'CONTACT_LENS';

  // 🌟 CRUCIAL RULES LAYER: Check if checkout requires prescription capabilities
  const isAdvanceFeatureAllowed = items.some(
    i => i.category === 'EYE_GLASS' || i.category === 'POWERED_GLASS'
  );

  useEffect(() => {
    const availableSubs = categoryMap[selectedProductCategory] || [];
    if (availableSubs.length > 0) {
      setSelectedSubCategory(availableSubs[0]);
    }

    if (!isLensConfigRequired) {
      setLensType('');
      setBaseLensPrice(0);
      setSelectedFeatures([]);
    } else {
      if (!lensType && dbLensTypes.length > 0) {
        setLensType(dbLensTypes[0].name);
        setBaseLensPrice(Number(dbLensTypes[0].price || 0));
      }
    }

    setFrameId('');
    setFramePrice(0);
    setSelectedProductRawData(null);
    setFrameSuggestions([]);
  }, [selectedProductCategory]);

  useEffect(() => {
    if (isLensConfigRequired) {
      if (dbLensTypes.length > 0 && !lensType) {
        setLensType(dbLensTypes[0].name);
        setBaseLensPrice(Number(dbLensTypes[0].price || 0));
      }
    }
  }, [dbLensTypes, isLensConfigRequired]);

  const generateSphCylOptions = () => {
    const options = [];
    for (let i = 14.00; i >= -14.00; i -= 0.25) {
      const formatted = i > 0 ? `+\${i.toFixed(2)}` : i.toFixed(2);
      options.push(formatted === '-0.00' ? '0.00' : formatted);
    }
    return [...new Set(options)];
  };

  const generateAxisOptions = () => {
    const options = ['0'];
    for (let i = 5; i <= 180; i += 5) options.push(String(i));
    return [...new Set(options)];
  };

  const generateAddOptions = () => {
    const options = [];
    for (let i = 0.00; i <= 4.00; i += 0.25) options.push(i.toFixed(2));
    return options;
  };

  const generatePdOptions = () => {
    const options = [];
    for (let i = 40; i <= 80; i++) options.push(String(i));
    return options;
  };

  const sphCylRanges = generateSphCylOptions();
  const axisRanges = generateAxisOptions();
  const addRanges = generateAddOptions();
  const pdRanges = generatePdOptions();

  useEffect(() => {
    const fetchLensConfigs = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/lens/all`, { headers: { token } });
        const configsArray = response.data.data || [];

        if (configsArray.length > 0) {
          const typesField = configsArray.filter(item => item.category === 'LENS_TYPE');
          const featuresField = configsArray.filter(item => item.category === 'LENS_FEATURE');
          setDbLensTypes(typesField);
          setDbLensFeatures(featuresField);
        }
      } catch (err) {
        console.error("Lens configurations network error:", err.message);
      }
    };
    fetchLensConfigs();
  }, [backendUrl, token]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const query = customerSearchInput.trim();
      if (query.length >= 1) {
        try {
          const res = await axios.get(
            `\${backendUrl}/api/inventory/search-customer?mobileNum=\${encodeURIComponent(query)}`, 
            { headers: { token } }
          );
          if (res.data.success && res.data.history) {
            setCustomerSuggestions(res.data.history);
            setCustomerActiveIndex(-1);
          } else {
            setCustomerSuggestions([]);
          }
        } catch (err) { 
          console.error("Patient autocomplete network lookup error:", err); 
          setCustomerSuggestions([]);
        }
      } else {
        setCustomerSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchInput, backendUrl, token]);

  // 🚀 FIXED: Converts the live input string into lowercase prior to endpoint transmission to bypass case mismatch bugs!
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const queryStr = frameInput.trim();
      if (queryStr.length > 0) {
        try {
          const cleanQuery = queryStr.toLowerCase();

          const res = await axios.get(
          `${backendUrl}/api/inventory/search-products?query=${encodeURIComponent(cleanQuery)}&category=${selectedProductCategory}`, 
            { 
              headers: { 
              token: token,                                
             'ngrok-skip-browser-warning': 'true'
          } 
          }
          );

          if (res.data && Array.isArray(res.data.products)) {
            const parsedMatches = res.data.products.filter(p => p.category === selectedProductCategory);
            setFrameSuggestions(parsedMatches.slice(0, 8));
            setFrameActiveIndex(-1);
          } else {
            setFrameSuggestions([]);
          }
        } catch (err) { 
          console.error("Catalog search matching pipeline network fault:", err); 
          setFrameSuggestions([]);
        }
      } else {
        setFrameSuggestions([]);
      }
    }, 250); 
    return () => clearTimeout(delayDebounceFn);
  }, [frameInput, selectedProductCategory, backendUrl, token]);

  const handleFormKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.target.name === "customerSearch" && customerSuggestions.length > 0) return;
      if (e.target.name === "frameSearchInput" && frameSuggestions.length > 0) return;
      if (e.target.id === "commitItemBtn") return;

      e.preventDefault();
      const nextFieldName = e.target.getAttribute("data-next");
      if (nextFieldName) {
        const nextElement = document.querySelector(`[name="\${nextFieldName}"]`);
        if (nextElement) {
          nextElement.focus();
          if (nextElement.select) nextElement.select(); 
        }
      }
    }
  };

  const handleLensTypeChange = (name) => {
    setLensType(name);
    const target = dbLensTypes.find(item => item.name === name);
    setBaseLensPrice(target ? Number(target.price || 0) : 0);
  };

  const handleFeatureToggle = (featureObj) => {
    const isSelected = selectedFeatures.some(f => f._id === featureObj._id);
    if (isSelected) {
      setSelectedFeatures(selectedFeatures.filter(f => f._id !== featureObj._id));
    } else {
      setSelectedFeatures([...selectedFeatures, featureObj]);
    }
  };

  const totalFeaturesPrice = selectedFeatures.reduce((sum, curr) => sum + Number(curr.price || 0), 0);
  const currentWorkspaceLensPrice = isLensConfigRequired ? (Number(baseLensPrice || 0) + Number(totalFeaturesPrice || 0)) : 0;

  const handleAddItemToGrid = (e) => {
    if (e) e.preventDefault();
    
    if (!frameId && (selectedProductCategory !== 'CONTACT_LENS' && selectedProductCategory !== 'POWERED_GLASS')) {
      toast.warn("Please pick a precise item out of the catalog search list down below before hitting commit.");
      return;
    }

    if (selectedProductRawData && (selectedProductRawData.stock ?? 0) <= 0) {
      toast.error(`Stock Error! "\${selectedProductRawData.name}" is completely out of stock and cannot be added.`);
      return;
    }

    const parseEyeDataToStrings = (eyeObj) => ({
      sph: String(eyeObj.sph || '0.00'),
      cyl: String(eyeObj.cyl || '0.00'),
      axis: String(eyeObj.axis || '0'),
      add: String(eyeObj.add || '0.00'),
      pd: String(eyeObj.pd || '60')
    });

    const featureNamesText = selectedFeatures.length > 0 
      ? selectedFeatures.map(f => f.name).join(', ') 
      : 'None';

    const newGridItem = {
      gridId: Date.now() + Math.random().toString(36).substring(2, 7),
      category: selectedProductCategory,
      subCategory: selectedSubCategory,
      frameId: frameId || null, 
      productName: selectedBrandAndName || `\${selectedProductCategory.replace('_', ' ')} Custom Item`,
      framePrice: Number(framePrice || 0),
      lensType: isLensConfigRequired && lensType ? lensType : 'Standard Non-Powered',
      lensFeatures: isLensConfigRequired ? featureNamesText : 'None',
      lensPrice: Number(currentWorkspaceLensPrice || 0),
      itemSubtotal: Number(framePrice || 0) + Number(currentWorkspaceLensPrice || 0),
      rightEyePower: parseEyeDataToStrings(rightEye),
      leftEyePower: parseEyeDataToStrings(leftEye)
    };

    setItems([...items, newGridItem]);
    toast.success("Product successfully added into checkout invoice matrix!");

    setFrameInput('');
    setFrameId('');
    setFramePrice(0);
    setSelectedBrandAndName('');
    setSelectedProductRawData(null); 
    setSelectedFeatures([]);

    setTimeout(() => {
      const frameInputEl = document.querySelector('[name="frameSearchInput"]');
      if (frameInputEl) frameInputEl.focus();
    }, 50);
  };

  const handleRemoveItemFromGrid = (gridId) => {
    setItems(items.filter(item => item.gridId !== gridId));
    toast.info("Product removed from ledger grid.");
  };

  const getGrossSubtotal = () => {
    return items.reduce((acc, curr) => acc + Number(curr.itemSubtotal || 0), 0);
  };

  const calculateTotalBill = () => {
    const gross = getGrossSubtotal();
    const calculatedDiscountAmount = (gross * Number(discount || 0)) / 100;
    return Math.max(0, Math.round(gross - calculatedDiscountAmount));
  };

  const netTotalBillAmount = calculateTotalBill();
  
  const activeUpfrontAdvanceValue = isAdvanceFeatureAllowed ? Number(advancePaid || 0) : netTotalBillAmount;
  const balanceOutstandingDue = Math.max(0, netTotalBillAmount - activeUpfrontAdvanceValue);

  useEffect(() => {
    if (!isAdvanceFeatureAllowed) {
      setAdvancePaid(0);
    } else if (advancePaid > netTotalBillAmount) {
      setAdvancePaid(netTotalBillAmount);
    }
  }, [netTotalBillAmount, isAdvanceFeatureAllowed]);

  const selectCustomerItem = (cust) => {
    setPatientName(cust.patientName.toUpperCase()); 
    setMobileNum(cust.patientMobile.replace('+91', ''));
    setCustomerSearchInput(`\${cust.patientName} (\${cust.patientMobile})`);
    setPastHistory(cust.history || []);
    setIsReturningCustomer(true);
    setCustomerSuggestions([]);
    setIsCustomerSearchOpen(false);

    setTimeout(() => {
      const nextEl = document.querySelector('[name="patientName"]');
      if (nextEl) nextEl.focus();
    }, 50);
  };

  const selectFrameItem = (prod) => {
    if ((prod.stock ?? 0) <= 0) {
      toast.error(`Halted! "\${prod.name}" has 0 available units. Restock catalog before billing.`);
      return;
    }
    setFrameId(prod._id);
    setFramePrice(Number(prod.price || 0));
    setSelectedProductRawData(prod); 
    setSelectedBrandAndName(`\${prod.brand || 'Generic'} - \${prod.name}`.toUpperCase());
    setFrameInput(`\${prod.brand || 'Generic'} - \${prod.name}`.toUpperCase());
    setFrameSuggestions([]); 

    setTimeout(() => {
      const nextFieldName = isLensConfigRequired ? "r_sph" : "commitItemBtn";
      const nextEl = document.querySelector(`[name="\${nextFieldName}"]`);
      if (nextEl) nextEl.focus();
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
        selectCustomerItem(customerSuggestions[customerActiveIndex]);
      } else if (customerSuggestions.length > 0) {
        selectCustomerItem(customerSuggestions[0]);
      }
    }
  };

  const handleFrameKeyDown = (e) => {
    if (frameSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFrameActiveIndex(p => {
        const n = p < frameSuggestions.length - 1 ? p + 1 : p;
        if (frameScrollRef.current && frameScrollRef.current.children[n + 1]) {
          frameScrollRef.current.children[n + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return n;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFrameActiveIndex(p => {
        const n = p > 0 ? p - 1 : 0;
        if (frameScrollRef.current && frameScrollRef.current.children[n + 1]) {
          frameScrollRef.current.children[n + 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return n;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (frameActiveIndex >= 0) {
        selectFrameItem(frameSuggestions[frameActiveIndex]);
      } else if (frameSuggestions.length > 0) {
        selectFrameItem(frameSuggestions[0]);
      }
    }
  };

  const handleFinalCheckoutSubmit = async () => {
    if (!patientName || !mobileNum) {
      toast.error("Please supply baseline Patient profile data fields.");
      return;
    }
    if (items.length === 0) {
      toast.error("Cart canvas ledger matrix is completely empty. Please click 'Commit Item' first.");
      return;
    }

    try {
      const grossSubtotal = getGrossSubtotal();
      const computedDiscountCashValue = Math.round((grossSubtotal * Number(discount)) / 100);
      const computedTotalAmount = Math.max(0, Math.round(grossSubtotal - computedDiscountCashValue));

      const derivedProductionStatus = balanceOutstandingDue > 0 ? 'Pending' : 'Delivered';

      const payload = {
        invoiceNumber: "INV-" + Date.now().toString().slice(-6),
        patientName: patientName.toUpperCase(),
        patientMobile: mobileNum.startsWith('+91') ? mobileNum : `+91\${mobileNum}`,
        paymentMode: paymentMode,
        discount: computedDiscountCashValue,
        totalAmount: computedTotalAmount,
        advanceAmount: Number(activeUpfrontAdvanceValue || 0),
        balanceDue: Number(balanceOutstandingDue || 0),
        status: derivedProductionStatus,
        
        items: items.map(i => ({
          category: i.category,
          subCategory: i.subCategory || 'General',
          frameProduct: i.frameId, 
          productName: i.productName,
          framePrice: Number(i.framePrice || 0),
          lensType: i.lensType,
          lensFeatures: i.lensFeatures,
          lensPrice: Number(i.lensPrice || 0),
          itemSubtotal: Number(i.itemSubtotal || 0),
          rightEyePower: i.rightEyePower,
          leftEyePower: i.leftEyePower
        }))
      };

      const res = await axios.post(`${backendUrl}/api/inventory/create-invoice`, payload, { headers: { token } });
      
      if (res.data.success) {
        toast.success(`Invoice saved successfully with state profile: \${derivedProductionStatus.toUpperCase()}`);
        
        setActivePrintedInvoice({
          ...payload,
          date: new Date()
        });

        setItems([]);
        setCustomerSearchInput(''); 
        setMobileNum(''); 
        setPatientName(''); 
        setDiscount(0);
        setAdvancePaid(0);
        setRightEye({ ...defaultEyePower });
        setLeftEye({ ...defaultEyePower });
      } else {
        toast.error(res.data.message || "Database execution error.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Invoice processing network disruption encountered.");
    }
  };

  return (
    <div className="p-2 sm:p-4 bg-slate-50 min-h-screen font-sans w-full" onKeyDown={handleFormKeyDown}>
      <ToastContainer position="top-right" compact />
      
      <div className="max-w-6xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-lg border border-gray-200">
        
        <h1 className="text-base sm:text-lg md:text-2xl font-bold mb-4 sm:mb-6 text-gray-800 border-b pb-3 sm:pb-4 uppercase tracking-wider flex items-center gap-2">
          🛒 SALES INVOICE
        </h1>

        {/* PROFILE IDENTIFICATION BANNER MODULE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-center">
          <div className="p-1 md:col-span-1 flex items-center justify-start relative z-40">
            {!isCustomerSearchOpen ? (
              <button
                type="button"
                onClick={() => setIsCustomerSearchOpen(true)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg md:rounded-full py-2.5 px-4 md:p-3.5 shadow-md flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 font-bold text-xs uppercase"
              >
                <span>🔍 Search Patient Database</span>
              </button>
            ) : (
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 w-full relative transition-all duration-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] sm:text-xs font-bold text-blue-900 uppercase">🔍 Patient Lookup Autocomplete</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsCustomerSearchOpen(false); setCustomerSearchInput(''); setCustomerSuggestions([]); }}
                    className="text-gray-500 hover:text-gray-800 font-black text-lg p-1"
                  >
                    ×
                  </button>
                </div>
                <input 
                  type="text" 
                  name="customerSearch"
                  value={customerSearchInput} 
                  onChange={(e) => setCustomerSearchInput(e.target.value)} 
                  onKeyDown={handleCustomerKeyDown}
                  data-next="patientName"
                  placeholder="Type name/mobile..." 
                  className="w-full bg-white border border-blue-300 rounded px-3 py-2 text-xs sm:text-sm focus:border-blue-600 outline-none font-bold"
                  autoFocus
                  autoComplete="off"
                />
                {customerSuggestions.length > 0 && (
                  <div ref={customerScrollRef} className="absolute left-0 right-0 mt-1 bg-white border border-blue-400 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {customerSuggestions.map((cust, idx) => (
                      <div key={cust._id} onClick={() => selectCustomerItem(cust)} className={`p-3 cursor-pointer flex justify-between items-center text-xs transition-all \${idx === customerActiveIndex ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-slate-800'}`}>
                        <div>
                          <p className="text-sm font-bold">{cust.patientName}</p>
                          <p className="font-mono text-[11px] opacity-80">Phone: {cust.patientMobile}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-gray-300 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Patient Name</label>
              <input 
                type="text" 
                name="patientName"
                required 
                value={patientName} 
                onChange={(e)=>setPatientName(e.target.value.toUpperCase())} 
                data-next="patientMobile"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white font-bold uppercase tracking-wide focus:border-blue-500 outline-none"
                placeholder="ENTER FULL NAME"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Mobile Target Line</label>
              <input 
                type="text" 
                name="patientMobile"
                value={mobileNum} 
                onChange={(e)=>setMobileNum(e.target.value)} 
                data-next="categorySelect"
                className="w-full border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm bg-white font-mono outline-none focus:border-blue-500" 
                placeholder="9087795074"
              />
            </div>
          </div>
        </div>

        {/* WORKSPACE AREA: MANAGE AND COMPOSE SINGLE LINE ITEMS */}
        <div className="bg-slate-100/80 p-3 sm:p-5 rounded-xl border border-gray-300 mb-6 sm:mb-8">
          <h3 className="text-xs sm:text-sm font-black text-gray-700 uppercase tracking-wide mb-3 sm:mb-4 flex items-center gap-2">
            ⚙️ Item Configuration Workspace
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase mb-1">Category Select</label>
                <select 
                  name="categorySelect"
                  value={selectedProductCategory} 
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  data-next="subCategorySelect"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-xs sm:text-sm font-bold shadow-sm outline-none"
                >
                  {Object.keys(categoryMap).map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-gray-700 uppercase mb-1">Sub-Category Variant</label>
                <select 
                  name="subCategorySelect"
                  value={selectedSubCategory} 
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  data-next="frameSearchInput"
                  className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-xs sm:text-sm font-bold shadow-sm outline-none"
                >
                  {(categoryMap[selectedProductCategory] || []).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* UNIFIED SEARCH ROW */}
            <div key={selectedProductCategory} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-300 shadow-sm relative z-30 space-y-2">
              <label className="block text-[10px] sm:text-xs font-black text-blue-950 uppercase">
                🔍 Search Catalog Item Name or SKU
              </label>
              
              <div className="relative w-full flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  name="frameSearchInput"
                  value={frameInput} 
                  onChange={(e) => setFrameInput(e.target.value.toUpperCase())} 
                  onKeyDown={handleFrameKeyDown}
                  placeholder="TYPE BRAND OR CODES (E.G. RAY-BAN)..." 
                  className="flex-1 bg-slate-50 border border-gray-300 rounded px-3 py-2 text-xs sm:text-sm outline-none font-bold uppercase focus:bg-white focus:border-blue-500 transition-colors"
                  autoComplete="off"
                />
                {!isLensConfigRequired && (
                  <button 
                    type="button"
                    id="commitItemBtn"
                    name="commitItemBtn"
                    onClick={handleAddItemToGrid}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-1 shrink-0 outline-none"
                  >
                    塾 Add Item
                  </button>
                )}

                {/* LIVE POPUP MATCH SELECTION CANVAS */}
                {frameSuggestions.length > 0 && (
                  <div ref={frameScrollRef} className="absolute left-0 right-0 top-full mt-2 bg-white border border-blue-400 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-200 shadow-2xl z-50 p-1">
                    <div className="sticky top-0 bg-blue-50 text-[9px] uppercase tracking-wider font-extrabold text-blue-800 p-2 flex justify-between items-center rounded-t border-b border-blue-200 z-10">
                      <span>Select product row:</span>
                      <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-mono text-[9px]">Live Matches</span>
                    </div>
                    {frameSuggestions.map((prod, idx) => {
                      const isOutOfStock = Number(prod.stock ?? 0) <= 0;
                      return (
                        <div 
                          key={prod._id} 
                          onClick={() => !isOutOfStock && selectFrameItem(prod)} 
                          className={`p-2.5 my-0.5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs rounded gap-2 transition-colors \${
                            isOutOfStock 
                              ? 'bg-rose-50/60 opacity-60 cursor-not-allowed' 
                              : idx === frameActiveIndex 
                                ? 'bg-blue-600 text-white font-bold cursor-pointer' 
                                : 'hover:bg-blue-100 text-slate-800 bg-white cursor-pointer'
                          }`}
                        >
                          <div>
                            <p className={`font-black text-xs sm:text-sm \${isOutOfStock ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                              {(prod.brand || 'Generic').toUpperCase()} - {prod.name.toUpperCase()}
                            </p>
                            <p className="font-mono text-[10px] text-slate-500">SKU: {prod.sku || 'N/A'} | Style: {prod.subCategory || 'General'}</p>
                          </div>
                          
                          <div className="flex items-center justify-between w-full sm:w-auto gap-4 text-right shrink-0">
                            <span className={`inline-block px-1.5 py-0.5 font-mono font-bold text-[10px] sm:text-xs rounded \${
                              isOutOfStock ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isOutOfStock ? 'SOLD OUT' : `\${prod.stock ?? 0} units`}
                            </span>
                            <p className="font-bold text-xs sm:text-sm px-2 py-0.5 rounded font-mono bg-blue-50 text-blue-700">
                              ₹{prod.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {frameId && (
                <div className="flex justify-between items-center px-1 pt-1 text-[10px] sm:text-xs">
                  <p className="text-emerald-600 font-bold">✓ Connected ID Ref: {frameId}</p>
                  <p className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Price: ₹{framePrice}</p>
                </div>
              )}
            </div>

            {/* SPLIT SCREEN ROW: VISION PARAMETERS & CORE GLASS DROPDOWN */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch \${isLensConfigRequired ? 'opacity-100' : 'opacity-30 pointer-events-none select-none'}`}>
              
              {/* LEFT SIDE: DIOPTER METRICS */}
              <div className="lg:col-span-7 bg-white p-2.5 sm:p-3 border rounded-lg border-gray-300 shadow-sm">
                <p className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">👁️ Vision Metrics</p>
                
                <div className="space-y-3">
                  {/* RIGHT EYE ROW */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 bg-slate-50 p-2 rounded border border-gray-200">
                    <span className="font-black text-cyan-700 text-xs sm:text-sm w-16 text-left shrink-0">R (OD)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">SPH</label>
                        <select name="r_sph" data-next="r_cyl" value={rightEye.sph} onChange={(e)=>setRightEye({...rightEye, sph: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {sphCylRanges.map(v => <option key={`r-sph-\${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">CYL</label>
                        <select name="r_cyl" data-next="r_axis" value={rightEye.get_cyl} onChange={(e)=>setRightEye({...rightEye, cyl: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {sphCylRanges.map(v => <option key={`r-cyl-\${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">Axis</label>
                        <select name="r_axis" data-next="r_add" value={rightEye.axis} onChange={(e)=>setRightEye({...rightEye, axis: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {axisRanges.map(v => <option key={`r-ax-\${v}`} value={v}>{v}°</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">ADD</label>
                        <select name="r_add" data-next="r_pd" value={rightEye.add} onChange={(e)=>setRightEye({...rightEye, add: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {addRanges.map(v => <option key={`r-add-\${v}`} value={v}>+{v}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">PD</label>
                        <select name="r_pd" data-next="l_sph" value={rightEye.pd} onChange={(e)=>setRightEye({...rightEye, pd: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {pdRanges.map(v => <option key={`r-pd-\${v}`} value={v}>{v}mm</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LEFT EYE ROW */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 bg-slate-50 p-2 rounded border border-gray-200">
                    <span className="font-black text-purple-700 text-xs sm:text-sm w-16 text-left shrink-0">L (OS)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">SPH</label>
                        <select name="l_sph" data-next="l_cyl" value={leftEye.sph} onChange={(e)=>setLeftEye({...leftEye, sph: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {sphCylRanges.map(v => <option key={`l-sph-\${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">CYL</label>
                        <select name="l_cyl" data-next="l_axis" value={leftEye.cyl} onChange={(e)=>setLeftEye({...leftEye, cyl: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {sphCylRanges.map(v => <option key={`l-cyl-\${v}`} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">Axis</label>
                        <select name="l_axis" data-next="l_add" value={leftEye.axis} onChange={(e)=>setLeftEye({...leftEye, axis: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {axisRanges.map(v => <option key={`l-ax-\${v}`} value={v}>{v}°</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">ADD</label>
                        <select name="l_add" data-next="l_pd" value={leftEye.add} onChange={(e)=>setLeftEye({...leftEye, add: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {addRanges.map(v => <option key={`l-add-\${v}`} value={v}>+{v}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold">PD</label>
                        <select name="l_pd" data-next="lensTypeSelect" value={leftEye.pd} onChange={(e)=>setLeftEye({...leftEye, pd: e.target.value})} disabled={!isPrescriptionRequired} className="w-full border bg-white rounded p-1 font-mono text-xs sm:text-sm outline-none">
                          {pdRanges.map(v => <option key={`l-pd-\${v}`} value={v}>{v}mm</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: CORE GLASS TYPE SELECTION */}
              <div className="lg:col-span-5 bg-white p-3 border rounded-lg border-gray-300 shadow-sm flex flex-col justify-center">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">🔬 Core Glass Type</label>
                <select 
                  name="lensTypeSelect"
                  value={lensType} 
                  onChange={(e) => handleLensTypeChange(e.target.value)} 
                  data-next="commitItemBtn"
                  className="w-full bg-slate-50 border border-gray-300 rounded px-3 py-2 text-sm font-bold shadow-sm outline-none focus:bg-white focus:border-blue-500"
                >
                  {!lensType && <option value="">Select Lens...</option>}
                  {dbLensTypes.map(t => <option key={t._id} value={t.name}>{t.name} (₹{t.price})</option>)}
                </select>
                <p className="text-[10px] font-mono text-gray-800 mt-1.5 text-right">Base Price: ₹{baseLensPrice}</p>
              </div>

            </div>

            {/* PREMIUM FEATURES GRID & COMMIT BUTTON */}
            {isLensConfigRequired && (
              <div className="p-3 sm:p-4 bg-white border border-gray-300 rounded-lg shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                  <label className="block text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-wide">🛡️ Premium Shields</label>
                  <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    Features: +₹{totalFeaturesPrice}
                  </span>
                </div>
                
                {dbLensFeatures.length === 0 ? (
                  <p className="text-xs font-medium text-gray-400 italic">No features available in catalog.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {dbLensFeatures.map((f) => {
                      const active = selectedFeatures.some(item => item._id === f._id);
                      return (
                        <button
                          key={f._id}
                          type="button"
                          onClick={() => handleFeatureToggle(f)}
                          className={`text-xs px-2.5 py-1.5 rounded-md font-bold border transition-all flex items-center gap-1 shadow-sm outline-none select-none \${
                            active 
                              ? 'bg-blue-600 border-blue-700 text-white ring-2 ring-blue-200' 
                              : 'bg-slate-50 border-gray-200 text-gray-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{active ? '✓' : '＋'}</span>
                          <span>{f.name}</span>
                          <span className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded ml-1 \${active ? 'bg-blue-500 text-blue-50' : 'bg-slate-800 text-white'}`}>
                            ₹{f.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-dashed border-gray-200">
                  <button 
                    type="button"
                    id="commitItemBtn"
                    name="commitItemBtn"
                    onClick={handleAddItemToGrid}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg text-xs uppercase tracking-wider shadow flex items-center justify-center gap-1.5 active:scale-95 duration-100"
                  >
                    ➕ Commit Item to Grid
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* PRIMARY ITEM WORKSPACE BILLING GRID RECORD LAYOUT */}
        <div className="mb-6 sm:mb-8 border rounded-xl overflow-hidden shadow-sm border-gray-300">
          <div className="bg-slate-800 text-white p-3 text-xs font-black uppercase tracking-wider flex justify-between items-center">
            <span>📋 Invoice Aggregations</span>
            <span className="bg-blue-600 px-2 py-0.5 rounded font-mono text-[10px]">Count: {items.length}</span>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 text-gray-400 font-bold text-xs sm:text-sm">
              No products added yet. Click "Commit Item" above.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-100 border-b text-xs sm:text-sm font-bold text-slate-700 uppercase">
                    <th className="p-3">Product Specifications</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3 text-right">Frame Fee</th>
                    <th className="p-3 text-right">Lens Fee</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs text-slate-800">
                  {items.map((item) => (
                    <tr key={item.gridId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium max-w-xs">
                        <div className="space-y-1">
                          <p className="text-slate-900 font-extrabold tracking-wide uppercase text-xs">{item.productName}</p>
                          {(item.category === 'EYE_GLASS' || item.category === 'POWERED_GLASS' || item.category === 'CONTACT_LENS') && (
                            <div className="bg-slate-50 p-2 rounded border border-gray-200 space-y-1 text-[11px]">
                              <p className="text-slate-600">
                                <span className="text-blue-700 font-bold">Lens:</span> {item.lensType} | <span className="text-purple-700 font-bold">Shields:</span> {item.lensFeatures}
                              </p>
                              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-dashed border-gray-200 font-mono font-bold text-[10px]">
                                <p className="text-cyan-700">OD: S {item.rightEyePower.sph} / C {item.rightEyePower.cyl}</p>
                                <p className="text-purple-700">OS: S {item.leftEyePower.sph} / C {item.leftEyePower.cyl}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 font-mono rounded px-1.5 py-0.5 text-[10px] font-bold border border-gray-200">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-600 align-middle">₹{item.framePrice}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-600 align-middle">₹{item.lensPrice}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-950 bg-slate-50/40 align-middle">₹{item.itemSubtotal}</td>
                      <td className="p-3 text-center align-middle">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItemFromGrid(item.gridId)}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded px-2 py-0.5 text-xs font-bold transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ACCOUNTING CONTROL ASSIGNMENT PANEL */}
        <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center mb-6">
          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Gross subtotal (₹)</label>
            <input type="number" value={getGrossSubtotal()} readOnly className="w-full bg-gray-100 border rounded px-3 py-1.5 text-xs sm:text-sm font-mono font-black text-slate-700 outline-none" />
          </div>

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Discount Rate</label>
            <div className="relative flex items-center w-full">
              <input 
                type="text" 
                name="discountInput"
                inputMode="numeric"
                autoComplete="off"
                value={discount === 0 ? '' : discount} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*$/.test(val)) {
                    const numValue = Number(val);
                    if (numValue <= 100) setDiscount(numValue);
                  }
                }} 
                data-next={isAdvanceFeatureAllowed ? "advancePaidInput" : "paymentChannelSelect"} 
                placeholder="0"
                className="w-full border rounded pl-3 pr-8 py-1.5 text-xs sm:text-sm font-mono font-bold text-rose-600 border-gray-300 bg-rose-50/10 outline-none" 
              />
              <span className="absolute right-3 text-xs sm:text-sm font-bold text-rose-500 pointer-events-none">%</span>
            </div>
          </div>

          {/* 🌟 CONDITIONAL RENDERING PANEL LAYER FOR ADVANCE COLLECTION */}
          {isAdvanceFeatureAllowed ? (
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-blue-900 uppercase mb-1">💸 Upfront Advance Collected</label>
              <input 
                type="number"
                name="advancePaidInput"
                value={advancePaid === 0 ? '' : advancePaid}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val <= netTotalBillAmount) setAdvancePaid(val);
                }}
                placeholder="0.00"
                className="w-full border rounded px-3 py-1.5 text-xs sm:text-sm font-mono font-bold border-blue-300 text-blue-700 bg-blue-50/20 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">💸 Upfront Advance Collected</label>
              <div className="w-full bg-gray-50 border border-gray-200 text-gray-400 rounded px-3 py-1.5 text-xs sm:text-sm font-mono italic select-none">
                Locked (Retail Stock Only)
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] sm:text-xs font-bold text-gray-600 uppercase mb-1">Settlement Channel</label>
            <select 
              name="paymentChannelSelect"
              value={paymentMode} 
              onChange={(e)=>setPaymentMode(e.target.value)} 
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs sm:text-sm font-bold shadow-sm outline-none"
            >
              <option value="Cash">💵 Cash</option>
              <option value="UPI">📱 UPI</option>
              <option value="Card">💳 Card Token</option>
            </select>
          </div>
        </div>

        {/* PRINTABLE HARDWARE RECEIPTS POPUP ANCHOR */}
        {activePrintedInvoice && (
          <div className="mb-6 p-1.5 bg-emerald-50 rounded-xl border border-emerald-300">
            <ThermalReceipt invoiceData={activePrintedInvoice} />
          </div>
        )}

        {/* POS NET INVOICING BANNER SUMMARY PANEL */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex flex-wrap gap-6 text-center sm:text-left justify-center sm:justify-start w-full sm:w-auto">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Net Bill Total</span>
              <span className="text-lg sm:text-2xl font-extrabold font-mono text-white">₹{netTotalBillAmount}</span>
            </div>
            <div className="border-l border-slate-700 hidden sm:block"></div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Balance Outstanding Due</span>
              <span className={`text-lg sm:text-2xl font-extrabold font-mono \${balanceOutstandingDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₹{balanceOutstandingDue}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleFinalCheckoutSubmit}
            disabled={items.length === 0}
            className={`w-full sm:w-auto text-slate-950 font-black px-6 sm:px-12 py-3 rounded-lg uppercase tracking-wider text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center \${
              items.length === 0 ? 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            Checkout & Print 🧾
          </button>
        </div>

      </div>
    </div>
  );
};

export default StoreBilling;