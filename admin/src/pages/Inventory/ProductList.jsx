import React, { useEffect, useState } from "react";
import { backendUrl, currencySymbol } from "../../App";
import axios from "axios";
import { toast } from "react-toastify";
import { FaTrashAlt } from "react-icons/fa";

// 1. Modal Component (Matches toast.png exactly)
const ConfirmDeleteModal = ({ onConfirm, onCancel, message }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[10000] backdrop-blur-sm">
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-[400px] animate-in fade-in zoom-in duration-200">
      {/* Header */}
      <div className="px-6 py-4">
        <h3 className="text-red-500 text-xl font-bold">Confirm Delete</h3>
      </div>
      
      <hr className="border-gray-200" />
      
      {/* Body */}
      <div className="py-10 px-6 text-center">
        <p className="text-gray-800 text-lg font-medium">{message}</p>
      </div>
      
      {/* Footer Buttons */}
      <div className="flex gap-4 p-6 justify-center bg-gray-50">
        <button 
          onClick={onConfirm}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 active:scale-95 transition-all shadow-md"
        >
          Yes
        </button>
        <button 
          onClick={onCancel}
          className="flex-1 bg-red-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-red-600 active:scale-95 transition-all shadow-md"
        >
          No
        </button>
      </div>
    </div>
  </div>
);

const ProductList = ({ token }) => {
  const [list, setList] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchList = async () => {
    try {
      const response = await axios.get(backendUrl + "/api/product/list");
      if (response.data.success) {
        setList(response.data.products);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await axios.post(
        backendUrl + '/api/product/remove', 
        { id: deleteId }, 
        { headers: { token } }
      );
      
      if (response.data.success) {
        toast.success("Product removed successfully");
        setShowConfirm(false);
        await fetchList(); 
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Error deleting product");
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="p-5 w-full">
      <p className="mb-4 text-xl font-bold border-b pb-2 text-slate-700">All Product List</p>

      <div className="flex flex-col gap-2">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr] items-center py-2 px-4 border bg-gray-100 text-sm font-bold text-slate-600">
          <span>Image</span>
          <span>Product Name</span>
          <span>Category</span>
          <span>Price</span>
          <span>Brand</span>
          <span className="text-center">Stock</span>
          <span className="text-center">Action</span>
        </div>

        {/* Product List */}
        {list.map((item, index) => (
          <div 
            key={index} 
            className="grid grid-cols-[1fr_3fr_1fr] md:grid-cols-[1fr_3fr_1fr_1fr_1fr_1fr_1fr] items-center gap-2 py-2 px-4 border text-sm hover:bg-slate-50 transition-colors bg-white"
          >
            <img 
              className='w-12 h-12 object-contain rounded border' 
              src={item.image?.[0] || item.images?.[0]} 
              alt={item.name} 
            />
            <p className="font-medium text-slate-800">{item.name}</p>
            <p className="hidden md:block text-slate-600">{item.category}</p>
            <p className="font-semibold text-slate-700">{currencySymbol}{item.price}</p>
            <p className="hidden md:block text-slate-600">{item.brand}</p>
            <p className="text-center font-medium">{item.stock}</p>
            <div className="flex justify-center">
              <FaTrashAlt 
                onClick={() => { setDeleteId(item._id); setShowConfirm(true); }} 
                className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors text-lg" 
              />
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <p className="text-center py-10 text-slate-400">No products available.</p>
        )}
      </div>

      {/* 2. Modal Logic Implementation */}
      {showConfirm && (
        <ConfirmDeleteModal 
          message="Do you want to delete this product?"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

export default ProductList;