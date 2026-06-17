import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function YesterdayPendingReport({ backendUrl, token }) {
  const [reportSummary, setReportSummary] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchYesterdayReport = async () => {
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
        console.error("Failed loading summary metrics panel:", err);
        toast.error("Could not fetch yesterday's pending work data analytics.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchYesterdayReport();
    }
  }, [backendUrl, token]);

  // If loading or the admin closed the modal window layout overlay, render nothing
  if (loading) return null;
  if (!isVisible || pendingJobs.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* REPORT HEADER */}
        <div className="bg-amber-500 text-slate-950 p-4 flex justify-between items-center select-none">
          <div>
            <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
              ⚠️ Yesterday's Pending Work Warning
            </h2>
            <p className="text-[11px] font-bold opacity-80 mt-0.5">
              Reviewing unresolved jobs from: {reportSummary?.date}
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setIsVisible(false)}
            className="w-7 h-7 flex items-center justify-center bg-slate-950/10 hover:bg-slate-950/20 rounded-full font-black text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* ANALYTICS HIGHLIGHT METRICS INFOCARDS */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 select-none">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">Pending Jobs Count</span>
              <span className="text-2xl font-mono font-black text-amber-900">{reportSummary?.totalPendingJobs} Bills</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-center">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Outstanding Cash Balance</span>
              <span className="text-2xl font-mono font-black text-rose-900">₹{reportSummary?.totalOutstandingRevenue}</span>
            </div>
          </div>

          {/* DETAILED PENDING LIST DATA TABLE GRID */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unresolved Orders Queue Matrix</p>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {pendingJobs.map((job) => (
                <div key={job._id} className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded tracking-wide">
                        {job.invoiceNumber}
                      </span>
                      <span className="text-xs font-black uppercase text-slate-900">{job.customerName}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 font-mono mt-1">
                      📱 Phone: {job.customerPhone} | ⏰ Logged Time: {job.timeLogged}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider border px-1.5 py-0.5 rounded bg-amber-50 border-amber-200 text-amber-800">
                      {job.status}
                    </span>
                    <p className="text-xs font-mono font-black text-rose-600 mt-1">
                      Due: ₹{job.balanceAmount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REPORT FOOTER ACTIONS */}
        <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="px-5 py-1.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow transition-transform active:scale-95"
          >
            Acknowledge & Open Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}