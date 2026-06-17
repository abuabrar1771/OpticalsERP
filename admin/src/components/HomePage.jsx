import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { currencySymbol } from '../App';

export default function HomePage({ backendUrl, token }) {
  const navigate = useNavigate();
  const [reportSummary, setReportSummary] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingOrdersList = async () => {
      try {
        const response = await axios.get(
          `${backendUrl}/api/invoice/reports/yesterday-pending`,
          { headers: { token } }
        );

        if (response.data.success) {
          setReportSummary(response.data.summary);
          setPendingJobs(response.data.jobs);
        }
      } catch (err) {
        console.error("Failed compiling pending orders tracking summary:", err);
        toast.error("Could not load the pending order queue report layout.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPendingOrdersList();
    } else {
      setLoading(false);
    }
  }, [backendUrl, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 p-1">
      
      {/* HEADER WELCOME BANNER WIDGET */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-2xl p-6 shadow-md select-none">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
          👓 PENDING ORDERS DASH BOARD
        </h1>
        <p className="text-xs text-slate-300 font-medium mt-1">
          Tracking processing lines, outstanding collection balances, and workshop order logs.
        </p>
      </div>

      {/* CASE A: ACTIVE WAITING ORDERS DETECTED */}
      {pendingJobs.length > 0 ? (
        <div className="bg-white border border-slate-300 shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          
          <div className="bg-slate-800 text-white p-4 border-b border-slate-900 flex justify-between items-center select-none">
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide flex items-center gap-2 text-amber-400">
                🛠️ Active Pending Orders Queue List
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Displaying all frames and lenses currently pending processing or balance collection.
              </p>
            </div>
            <span className="text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase">
              {reportSummary?.totalPendingJobs} Active Jobs
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            
            {/* STATS ANALYTICS SUMMARY BOX GRID BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Orders Awaiting Completion</span>
                  <span className="text-2xl font-mono font-black text-slate-900">{reportSummary?.totalPendingJobs} Items</span>
                </div>
                <span className="text-2xl">🔧</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="text-left">
                  <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Uncollected Balance Sum</span>
                  <span className="text-2xl font-mono font-black text-rose-900">{currencySymbol}{reportSummary?.totalOutstandingRevenue}</span>
                </div>
                <span className="text-2xl">💰</span>
              </div>
            </div>

            {/* DETAILED PENDING ORDERS QUEUE TABLE ROWS */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Workshop Live Status Matrix</p>
              
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm max-h-[450px] overflow-y-auto">
                {pendingJobs.map((job) => (
                  <div key={job._id} className="p-4 bg-white hover:bg-slate-50/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-black bg-slate-800 text-slate-100 px-1.5 py-0.5 rounded tracking-wide">
                          {job.invoiceNumber}
                        </span>
                        <span className="text-sm font-black uppercase text-slate-900">{job.customerName}</span>
                      </div>
                      
                      {/* 🌟 LENS & FRAME SPECIFICATION DETAILS INLINE INJECT PRINT */}
                      <p className="text-xs font-semibold text-blue-600 uppercase bg-blue-50/50 border border-blue-100 px-2 py-1 rounded w-fit mt-1">
                        📦 Items: {job.jobDetails}
                      </p>
                      
                      <p className="text-[11px] font-bold text-slate-400 font-mono">
                        📱 Contact: {job.customerPhone} | 📅 Booked Date: {job.dateLogged}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-0 pt-2 sm:pt-0 gap-1">
                      <span className={`text-[9px] font-black uppercase tracking-wider border px-2 py-0.5 rounded h-fit ${
                        job.status === 'Partially Paid' ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse' : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {job.status}
                      </span>
                      <p className="text-sm font-mono font-black text-rose-600">
                        Balance Due: {currencySymbol}{job.balanceAmount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LOWER INTERFACE ROUTING ACTION BAR */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => navigate('/receipt-voucher')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow transition-transform active:scale-95"
              >
                Open Receipt Voucher Registry Ledger 🧾
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* CASE B: WORKSHOP QUEUE IS 100% BALANCED AND CLEAR */
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-3 select-none animate-fade-in">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-100 shadow-inner">
            ✨
          </div>
          <h2 className="text-md font-black uppercase text-slate-900 tracking-wide">
            No Pending Orders!
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            Excellent! Every prescription order logged inside the platform has been successfully manufactured, balanced, and paid. No jobs are currently pending collection.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-2">
            {/* <button 
              onClick={() => navigate('/CreateOrder')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase rounded-lg shadow-sm"
            >
              👓 New Glass Order
            </button> */}
            <button 
              onClick={() => navigate('/billing')}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg shadow-sm"
            >
              📊 Create Quick Bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}