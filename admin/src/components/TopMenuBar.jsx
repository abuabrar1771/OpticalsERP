import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
// Imported clean vector icons for every route item in the ecosystem
import { 
  HiChevronDown, 
  HiHome, 
  HiOutlinePlusCircle, 
  HiOutlineDocumentText, 
  HiOutlineRefresh, 
  HiOutlineAdjustments,
  HiOutlineShoppingCart,
  HiOutlineDocumentReport,
  HiOutlineExclamation,
  HiOutlineTicket,
  HiOutlineCreditCard,
  HiOutlineBookOpen,
  HiOutlineScale,
  HiOutlineLogout,
  HiOutlineFolderAdd,
  HiOutlineViewList,
  HiOutlineTrendingUp,
  HiOutlineDatabase,
  HiOutlineCog
} from "react-icons/hi"; 

export default function TopMenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState(null); 
  const [mobileExpandedSection, setMobileExpandedSection] = useState(null);
  const menuRef = useRef(null);
  const nativeCheckboxRef = useRef(null);

  // Desktop outside-click handling
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Force close drawer on route change
  useEffect(() => {
    setActiveMenu(null);
    if (nativeCheckboxRef.current) {
      nativeCheckboxRef.current.checked = false;
    }
  }, [location.pathname]);

  // Comprehensive menu array configured with matching vector icons
  const menuConfig = [
    {
      title: "Transaction",
      items: [
        { name: "Home", path: "/HomePage", icon: <HiHome className="text-blue-600" /> }, 
        { name: "Create New Order", path: "/CreateOrder", icon: <HiOutlinePlusCircle className="text-emerald-600" /> }, 
        { name: "Sales (Billing)", path: "/billing", icon: <HiOutlineDocumentText className="text-blue-500" /> },
        { name: "Sales Return", path: "/sales-return", icon: <HiOutlineRefresh className="text-amber-500" /> },
        { name: "Sales Return Adjustment", path: "/sales-adjustment", icon: <HiOutlineAdjustments className="text-slate-500" /> },
        { type: "divider" },
        { name: "Purchase", path: "/purchaseentry", icon: <HiOutlineShoppingCart className="text-indigo-500" /> },
        { name: "Purchase DC", path: "/purchase-dc", icon: <HiOutlineDocumentReport className="text-purple-500" /> },
        { name: "Purchase Return", path: "/purchase-return", icon: <HiOutlineRefresh className="text-rose-500" /> },
        { name: "Purchase Return Adjustment", path: "/purchase-adjustment", icon: <HiOutlineAdjustments className="text-slate-500" /> },
        { type: "divider" },
        { name: "Damage", icon: <HiOutlineExclamation className="text-red-500" /> },
        { type: "divider" },
        { name: "Receipt", path: "/Receipt-voucher", icon: <HiOutlineTicket className="text-emerald-500" /> }, 
        { name: "Payment", path: "/Payment-voucher", icon: <HiOutlineCreditCard className="text-rose-500" /> },             
        { name: "Journal", path: "/journal", icon: <HiOutlineBookOpen className="text-amber-600" /> },
        { name: "Contra", path: "/contra", icon: <HiOutlineScale className="text-teal-600" /> },
        { type: "divider" },
        { name: "Exit Console", path: "/logout", isExit: true, icon: <HiOutlineLogout className="text-red-600" /> }
      ]
    },
    {
      title: "Master",
      items: [
        { name: "Add New Product", path: "/addproduct", icon: <HiOutlineFolderAdd className="text-emerald-500" /> },
        { name: "Product List", path: "/productlist", icon: <HiOutlineViewList className="text-blue-500" /> },
        { name: "Lens Configuration Matrix", path: "/updateLensPrice", icon: <HiOutlineCog className="text-slate-500" /> },
        { name: "Opening Stock", path: "/opening-stock", icon: <HiOutlineCog className="text-slate-500" /> },
        { name: "Patient / Customer Ledger", path: "/customer-dashboard", icon: <HiOutlineBookOpen className="text-indigo-500" /> }
      ]
    },
    {
      title: "Reports",
      items: [
        { name: "Sales", path: "/BillWiseSales", icon: <HiOutlineDocumentReport className="text-blue-500" /> },
        { name: "Sales Profit", path: "/sales-profit", icon: <HiOutlineTrendingUp className="text-emerald-500" /> },
        { name: "Purchase", path: "/purchase-report", icon: <HiOutlineShoppingCart className="text-indigo-500" /> },
        { name: "Payment Dues", path: "/payment-dues", icon: <HiOutlineCreditCard className="text-rose-500" /> },
        { name: "E-Commerce Orders View", path: "/orders", icon: <HiOutlineViewList className="text-violet-500" /> },
        { name: "Low Stock Alerts", path: "/LowStockAlerts", icon: <HiOutlineExclamation className="text-amber-500" /> },
        { type: "divider" },
        { name: "Daily Daybook", path: "/daybook-registry", icon: <HiOutlineBookOpen className="text-slate-600" /> }, 
        { name: "Profit & Loss Analyzer", path: "/profit-loss", icon: <HiOutlineScale className="text-teal-600" /> }        
      ]
    },
    {
      title: "Tools",
      items: [
        { name: "Backup Database", path: "/tools/backup", icon: <HiOutlineDatabase className="text-amber-500" /> },
        { name: "System Settings", path: "/tools/settings", icon: <HiOutlineCog className="text-slate-600" /> }
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (!item.path) return;
    if (item.isExit) {
      sessionStorage.removeItem("token");
      window.location.href = "/";
      return;
    }
    if (nativeCheckboxRef.current) {
      nativeCheckboxRef.current.checked = false;
    }
    navigate(item.path);
  };

  return (
    <div className="w-full bg-slate-100 border-b border-slate-300 shadow-sm sticky top-0 z-[100] font-sans text-slate-800" ref={menuRef}>
      
      <style>{`
        #hard-menu-trigger:checked ~ #immutable-mobile-drawer {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
        }
      `}</style>

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
        
        <label
          htmlFor="hard-menu-trigger"
          className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded font-bold text-xs uppercase tracking-wider cursor-pointer active:bg-slate-950 select-none"
        >
          ☰ Menu Control Panel
        </label>

        <span className="md:hidden text-xs font-mono font-bold text-slate-600 truncate max-w-[50%]">
          {location.pathname}
        </span>

        {/* DESKTOP NAVIGATION HUD */}
        <nav className="hidden md:flex items-center">
          {menuConfig.map((group) => {
            const isOpen = activeMenu === group.title;
            return (
              <div key={group.title} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(isOpen ? null : group.title)}
                  onMouseEnter={() => { if (activeMenu) setActiveMenu(group.title); }} 
                  className={`px-5 py-2.5 text-sm font-bold flex items-center gap-1 outline-none transition-colors ${isOpen ? "bg-white text-slate-950 font-extrabold" : "text-slate-700 hover:bg-slate-300/40"}`}
                >
                  {group.title} <HiChevronDown className={`transition-transform duration-150 ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
                </button>
                {isOpen && (
                  <div className="absolute left-0 mt-0 w-72 bg-white border border-slate-300 shadow-2xl z-50 py-1 rounded-b-lg">
                    {group.items.map((item, idx) => {
                      if (item.type === "divider") return <hr key={idx} className="my-1 border-slate-800" />;
                      return (
                        <button 
                          key={item.name} 
                          type="button" 
                          onClick={() => handleItemClick(item)} 
                          className="w-full text-left px-5 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-3 font-semibold transition-colors group"
                        >
                          {/* Render dynamic colorized item icons on hover */}
                          <span className="text-base flex-shrink-0 opacity-80 group-hover:opacity-100 scale-100 group-hover:scale-105 transition-transform">
                            {item.icon}
                          </span>
                          <span>{item.name}</span>
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
        className="hidden md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex-col justify-start p-3 pt-20"
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
                          className="w-full text-left px-4 py-3 rounded bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 active:bg-blue-600 active:text-white flex items-center gap-3 transition-colors"
                        >
                          <span className="text-base flex-shrink-0">{item.icon}</span>
                          <span>{item.name}</span>
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