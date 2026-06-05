import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl, currencySymbol } from '../App.jsx';
import { toast } from 'react-toastify';

const Orders = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all orders on component mount
  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axios.post(
          `${backendUrl}/api/order/list`,
          {},
          { headers: { token } }
        );

        if (response.data.success) {
          // reverse() puts the newest orders at the very top
          setOrders(response.data.orders.reverse());
        } else {
          setError(response.data.message || "Failed to load admin orders.");
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("An error occurred while loading orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [token]);

  // Handler to update the status of an order via the backend API
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/order/updatestatus`,
        { orderId, status: newStatus },
        { headers: { token } }
      );

      if (response.data.success) {
        // Optimistically update the local state instantly so the UI updates
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast.success(`Order status updated to "${newStatus}"`);
      } else {
        toast.error(response.data.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Error modifying status:", err);
      toast.error("An error occurred while changing order status.");
    }
  };

  // Helper function for dynamic Tailwind classes based on status string values
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'out for delivery': 
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'processing': 
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cancelled': 
        return 'bg-red-100 text-red-800 border-red-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading indicator UI block
  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        <span className="ml-3 text-cyan-800 font-medium">Fetching customer orders...</span>
      </div>
    );
  }

  // Error boundary layout UI block
  if (error) {
    return (
      <div className="w-full max-w-4xl bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg my-4 text-center mx-auto">
        <p className="font-semibold">Error Loading Orders</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      
      {/* Overview Analytics Row */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
        <p className="text-sm text-slate-500">Monitor, track, and manage all incoming customer orders.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{orders.length}</h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Processing</span>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {orders.filter(o => o.status?.toLowerCase() === 'processing' || !o.status).length}
            </h3>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <h3 className="text-2xl font-bold text-green-600 mt-1">
              {currencySymbol}{orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Order Loop Cards */}
      {orders.length === 0 ? (
        <div className="bg-white text-center py-16 rounded-xl border border-dashed border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium text-lg">No customer orders found in the system.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <div 
              key={order._id || index} 
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-cyan-300 transition-colors"
            >
              {/* Card Meta Bar Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-6">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block uppercase tracking-wide">Order ID</span>
                    <span className="text-sm font-mono font-semibold text-slate-700">{order._id}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 block uppercase tracking-wide">Date</span>
                    <span className="text-sm text-slate-600 font-medium">
                      {order.date ? new Date(order.date).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
                
                {/* Badges Overview */}
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border tracking-wide uppercase ${getStatusClass(order.status)}`}>
                    {order.status || 'Processing'}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${order.payment ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {order.payment ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>

              {/* Data Layout Split Columns Grid */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Col 1: Ordered Inventory Detail summary list */}
                <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items Ordered</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-sm">
                        <div className="text-slate-700 font-medium">
                          {item.name} <span className="text-cyan-600 font-bold text-xs">x{item.quantity}</span>
                        </div>
                        <span className="text-slate-400 font-medium text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.color || 'Default'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Col 2: Profile Delivery Address Details */}
                <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Shipping Information</h4>
                  {order.address ? (
                    <div className="text-sm text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-800">
                        {order.address.firstName} {order.address.lastName}
                      </p>
                      <p className="text-slate-500">{order.address.street}</p>
                      <p className="text-slate-500">{order.address.city}, {order.address.state} - {order.address.zipcode}</p>
                      <p className="pt-2 text-xs font-semibold text-slate-700">📞 {order.address.phone}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No delivery profile attached.</p>
                  )}
                </div>

                {/* Col 3: Financial summaries & Order Control actions dropdown */}
                <div className="md:col-span-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</h4>
                    <p className="text-sm text-slate-700 font-semibold">{order.paymentMethod || 'Cash On Delivery'}</p>
                    
                    {/* Admin Dropdown Controller Element */}
                    <div className="mt-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Change Order Status
                      </label>
                      <select 
                        value={order.status || "Processing"}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="w-full text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 font-semibold focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Financial calculation display metrics summary */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-500">Grand Total:</span>
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {currencySymbol}{Number(order.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;