import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiChevronDown } from "react-icons/hi"; 

export default function TopMenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState(null); 
  const [mobileExpandedSection, setMobileExpandedSection] = useState(null);
  const menuRef = useRef(null);
  const nativeCheckboxRef = useRef(null);

  // Desktop outside-click handling only
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Force close the drawer when a page successfully transitions
  useEffect(() => {
    setActiveMenu(null);
    if (nativeCheckboxRef.current) {
      nativeCheckboxRef.current.checked = false;
    }
  }, [location.pathname]);

  const menuConfig = [
    {
      title: "Transaction",
      items: [
        { name: "Sales", path: "/billing" },
        { name: "Sales Return", path: "/sales-return" },
        { name: "Sales Return Adjustment", path: "/sales-adjustment" },
        { type: "divider" },
        { name: "Purchase", path: "/purchaseentry" },
        { name: "Purchase DC", path: "/purchase-dc" },
        { name: "Purchase Return", path: "/purchase-return" },
        { name: "Purchase Return Adjustment", path: "/purchase-adjustment" },
        { type: "divider" },
        { name: "Damage" },
        { type: "divider" },
        { name: "Receipt", path: "/Receipt-voucher" }, 
        { name: "Payment", path: "/Payment-voucher" },             
        { name: "Journal", path: "/journal" },
        { name: "Contra", path: "/contra" },
        { type: "divider" },
        { name: "Exit Console", path: "/logout", isExit: true }
      ]
    },
    {
      title: "Master",
      items: [
        { name: "Add New Product", path: "/addproduct" },
        { name: "Product Directory", path: "/productlist" },
        { name: "Lens Configuration Matrix", path: "/updateLensPrice" },
        { name: "Patient / Customer Ledger", path: "/customer-dashboard" }
      ]
    },
    {
      title: "Reports",
      items: [
        { name: "Sales", path: "/BillWiseSales" },
        { name: "Sales Profit", path: "/sales-profit" },
        { name: "Purchase", path: "/purchase-report" },
        { name: "Payment Dues", path: "/payment-dues" },
        { name: "E-Commerce Orders View", path: "/orders" },
        { name: "Low Stock Alerts", path: "/LowStockAlerts" },
        { type: "divider" },
        { name: "Daily Daybook", path: "/daybook-registry" }, 
        { name: "Profit & Loss Analyzer", path: "/profit-loss" }        
      ]
    },
    {
      title: "Tools",
      items: [
        { name: "Backup Database", path: "/tools/backup" },
        { name: "System Settings", path: "/tools/settings" }
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (!item.path) return;
    if (item.isExit) {
      localStorage.removeItem("token");
      window.location.href = "/";
      return;
    }
    // Close mobile menu before navigating
    if (nativeCheckboxRef.current) {
      nativeCheckboxRef.current.checked = false;
    }
    navigate(item.path);
  };

  return (
    <div className="w-full bg-slate-100 border-b border-slate-300 shadow-sm sticky top-0 z-[99999] font-sans text-slate-800" ref={menuRef}>
      
      {/* INJECT CRITICAL HARDWARE ELEMENT RULES */}
      <style>{`
        #hard-menu-trigger:checked ~ #immutable-mobile-drawer {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
      `}</style>

      {/* NATIVE STATE SAVER (Immune to React layout cycles) */}
      <input 
        type="checkbox" 
        id="hard-menu-trigger" 
        ref={nativeCheckboxRef} 
        className="hidden select-none space-x-0" 
      />

      {/* TOP META SYSTEM BANNER */}
      <div className="bg-slate-800 px-4 py-1.5 text-xs font-mono text-slate-300 flex justify-between items-center select-none">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">ERP</span>
          <span className="font-bold text-slate-100 uppercase tracking-wide truncate">SUPER OPTICALS</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-cyan-400 font-semibold text-[11px] tracking-tight">(01/04/2026 - 31/03/2027)</span>
        </div>
        <div className="text-[10px] text-slate-400 font-bold tracking-widest hidden md:block">ADMIN WORKSTATION v1.0.4</div>
      </div>

      {/* CORE NAVIGATION HEADER */}
      <div className="flex items-center justify-between bg-slate-200 border-b border-slate-300 px-3 h-14 md:h-auto select-none">
        
        {/* Native Label Element works as a fully functional button trigger */}
        <label
          htmlFor="hard-menu-trigger"
          className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded font-bold text-xs uppercase tracking-wider cursor-pointer active:bg-slate-950 select-none"
        >
          ☰ Menu Control Panel
        </label>

        <span className="md:hidden text-xs font-mono font-bold text-slate-600 truncate max-w-[50%]">
          {location.pathname}
        </span>

        {/* DESKTOP ROUTING NAVIGATION LIST */}
        <nav className="hidden md:flex items-center">
          {menuConfig.map((group) => {
            const isOpen = activeMenu === group.title;
            return (
              <div key={group.title} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(isOpen ? null : group.title)}
                  onMouseEnter={() => { if (activeMenu) setActiveMenu(group.title); }} 
                  className={`px-5 py-2.5 text-sm font-bold flex items-center gap-1 outline-none ${isOpen ? "bg-white text-slate-950 font-extrabold" : "text-slate-700"}`}
                >
                  {group.title} <HiChevronDown />
                </button>
                {isOpen && (
                  <div className="absolute left-0 mt-0 w-72 bg-white border border-slate-300 shadow-2xl z-50 py-1">
                    {group.items.map((item, idx) => {
                      if (item.type === "divider") return <hr key={idx} className="my-1 border-slate-200" />;
                      return (
                        <button key={item.name} type="button" onClick={() => handleItemClick(item)} className="w-full text-left px-5 py-2 text-sm text-slate-700 hover:bg-slate-100">
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* IMMUTABLE NATIVE MOBILE DRAWER OVERLAY */}
      <div 
        id="immutable-mobile-drawer"
        className="hidden md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999999] flex-col justify-start p-3 pt-20"
      >
        <div className="bg-slate-100 w-full rounded-xl shadow-2xl border border-slate-300 p-3 space-y-3 max-w-md mx-auto overflow-y-auto max-h-[82vh]">
          
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">Navigation Center</span>
            <label 
              htmlFor="hard-menu-trigger" 
              className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md cursor-pointer select-none"
            >
              ✕ Dismiss
            </label>
          </div>

          {menuConfig.map((group) => {
            const isSectionExpanded = mobileExpandedSection === group.title;
            return (
              <div key={group.title} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setMobileExpandedSection(isSectionExpanded ? null : group.title)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 font-bold text-sm text-slate-700 border-b border-slate-100"
                >
                  <span>{group.title} Modules</span>
                  <HiChevronDown className={`transform transition-transform duration-150 ${isSectionExpanded ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
                </button>
                
                {isSectionExpanded && (
                  <div className="p-2 bg-white flex flex-col gap-2">
                    {group.items.map((item, idx) => {
                      if (item.type === "divider") return <hr key={idx} className="border-slate-100 my-0.5" />;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleItemClick(item)}
                          className="w-full text-left px-4 py-3 rounded bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 active:bg-blue-600 active:text-white"
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <label
            htmlFor="hard-menu-trigger"
            className="block w-full bg-slate-800 text-white font-bold py-3 text-center text-xs rounded-lg uppercase tracking-wider cursor-pointer select-none active:bg-slate-950"
          >
            Return to Workstation
          </label>
        </div>
      </div>
    </div>
  );
}