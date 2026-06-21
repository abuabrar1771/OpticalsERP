import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios"; // 🚀 Added Axios import for global pipeline routing rules

import TopMenuBar from "./components/TopMenuBar";
import HomePage from "./components/HomePage";

import Login from "./components/Login";
import LowStockAlerts from "./components/LowStockAlerts";

// Import page views
import AddProduct from "./pages/Inventory/AddProduct";
import GetSingleProduct from "./pages/Inventory/GetSingleProduct";
import ProductList from "./pages/Inventory/ProductList";
import StoreBilling from "./pages/Inventory/StoreBilling";
import LensConfig from "./pages/LensConfig";
import CustomerDashboard from "./pages/CustomerDashboard";
import BillWiseSales from "./pages/BillWiseSales";
import PurchaseEntry from "./pages/PurchaseEntry";
import CreateOrder from "./pages/CreateOrder";
import PaymentVoucher from "./pages/PaymentVoucher";
import ReceiptVoucher from "./pages/ReceiptVoucher";
import DaybookRegistry from "./pages/DaybookRegistry";
import ProfitLossAnalyzer from "./pages/ProfitLossAnalyzer";
import OpeningStockEntry from "./pages/Inventory/OpeningStockEntry";
import SalesProfitReport from "./pages/SalesProfit"; 

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const backendUrl = import.meta.env.VITE_BACKEND_URL;
export const currencySymbol = "₹";

// 🚀 PERMANENT GLOBAL INTERCEPTOR ROUTER LAYER
// This forces Ngrok to step aside and deliver raw database JSON to your dashboard views automatically
axios.interceptors.request.use((config) => {
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

export const categoryMap = {
  EYE_GLASS: ["Full-Rim", "Half-Rim", "Rimless", "Kids"],
  SUN_GLASS: ["Polarized", "Non-Polarized", "Mirrored", "Gradient"],
  UV_GLASS: ["Blue-Cut", "Anti-Glare", "UV400 Clear"],
  POWERED_GLASS: ["Single Vision", "Progressive", "Photochromic"],
  CONTACT_LENS: ["Daily", "Fortnightly", "Monthly", "Yearly"],
};

export const colorOptions = [
  { name: "Black", code: "#000000" },
  { name: "Brown", code: "#5C4033" },
  { name: "Grey", code: "#808080" },
  { name: "Tortoise", code: "#402005" },
  { name: "Beige", code: "#F5F5DC" },
  { name: "Red", code: "#FF0000" },
  { name: "Blue", code: "#0000FF" },
  { name: "Pink", code: "#FFC0CB" },
  { name: "Purple", code: "#800080" },
  { name: "Yellow", code: "#FFFF00" },
  { name: "Green", code: "#008000" },
  { name: "Gold", code: "#D4AF37" },
  { name: "Silver", code: "#C0C0C0" },
  { name: "Gunmetal", code: "#2a2a2a" },
  { name: "Rose Gold", code: "#B76E79" },
  { name: "Matte Black", code: "#282828" },
  { name: "Honey", code: "#EB9605" },
];

const App = () => {
  const [token, setToken] = useState(
    sessionStorage.getItem("token") ? sessionStorage.getItem("token") : "",
  );

  useEffect(() => {
    sessionStorage.setItem("token", token);
    
    // Inject session token into standard Axios headers if user logs in successfully
    if (token) {
      axios.defaults.headers.common['token'] = token;
    }
  }, [token]);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col w-full text-slate-800 antialiased">
      <ToastContainer
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 99999 }}
      />

      {/* PUBLIC AUTH GATING LAYER */}
      {token === "" ? (
        <main className="flex-1 flex justify-center items-center bg-cyan-100">
          <Routes>
            <Route
              path="*"
              element={<Login setToken={setToken} backendUrl={backendUrl} />}
            />
          </Routes>
        </main>
      ) : (
        /* PROTECTED DESKTOP ERP ENVIRONMENT FRAMEWORK */
        <>
          <TopMenuBar />
          <hr className="border-slate-300" />

          <main className="flex-1 p-3 sm:p-6 w-full overflow-x-hidden overflow-y-visible">
            <Routes>
              <Route
                path="/HomePage"
                element={<HomePage backendUrl={backendUrl} token={token} />}
              />

              <Route
                path="/customer-dashboard"
                element={
                  <CustomerDashboard backendUrl={backendUrl} token={token} />
                }
              />

              <Route
                path="/billing"
                element={<StoreBilling backendUrl={backendUrl} token={token} />}
              />

              <Route
                path="/BillWiseSales"
                element={
                  <BillWiseSales backendUrl={backendUrl} token={token} />
                }
              />

              <Route
                path="/purchaseentry"
                element={
                  <PurchaseEntry backendUrl={backendUrl} token={token} />
                }
              />

              <Route
                path="/addproduct"
                element={<AddProduct backendUrl={backendUrl} token={token} />}
              />
              <Route
                path="/getsingleproduct"
                element={
                  <GetSingleProduct backendUrl={backendUrl} token={token} />
                }
              />
              <Route
                path="/opening-stock"
                element={
                  <OpeningStockEntry backendUrl={backendUrl} token={token} />
                }
              />
              <Route
                path="/productlist"
                element={<ProductList backendUrl={backendUrl} token={token} />}
              />
              <Route
                path="/CreateOrder"
                element={<CreateOrder backendUrl={backendUrl} token={token} />}
              />
              <Route
                path="/updateLensPrice"
                element={<LensConfig backendUrl={backendUrl} token={token} />}
              />

              <Route
                path="/payment-voucher"
                element={
                  <PaymentVoucher backendUrl={backendUrl} token={token} />
                }
              />
              <Route
                path="/receipt-voucher"
                element={
                  <ReceiptVoucher backendUrl={backendUrl} token={token} />
                }
              />

              <Route
                path="/daybook-registry"
                element={
                  <DaybookRegistry backendUrl={backendUrl} token={token} />
                }
              />
              <Route
                path="/profit-loss"
                element={
                  <ProfitLossAnalyzer backendUrl={backendUrl} token={token} />
                }
              />

              <Route
                path="/LowStockAlerts"
                element={
                  <LowStockAlerts backendUrl={backendUrl} token={token} />
                }
              />
              
              <Route 
                path="/sales-profit" 
                element={<SalesProfitReport backendUrl={backendUrl} token={token} />} 
              />

              <Route path="*" element={<Navigate to="/HomePage" replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  );
};

export default App;