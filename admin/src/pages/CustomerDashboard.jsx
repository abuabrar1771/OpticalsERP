import React, { useState, useEffect } from 'react';

export default function CustomerDashboard({ backendUrl }) {
  const [customerList, setCustomerList] = useState([]);
  const [selectedMobile, setSelectedMobile] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch unique customer list derived from aggregate invoices on mount
  useEffect(() => {
    fetch(`${backendUrl}/api/invoice/customers/lookup`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setCustomerList(data);
        // 🛠️ REMOVED: Auto-selecting the first item (data[0].mobile) is disabled here
        setLoading(false);
      })
      .catch(err => console.error("Error fetching customer list:", err));
  }, [backendUrl]);

  // 2. Fetch profile data and parse history/prescriptions whenever selected phone changes
  useEffect(() => {
    // If no client number is actively selected in the dropdown menu, wipe current profile data
    if (!selectedMobile) {
      setProfile(null);
      return;
    }

    fetch(`${backendUrl}/api/invoice/customers/profile/${selectedMobile}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(err => console.error("Error fetching customer profile history:", err));
  }, [selectedMobile, backendUrl]);

  if (loading) return <div className="text-center p-10 font-medium text-gray-500">Loading Counter Dashboard...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 border border-gray-100 my-6">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 pb-3 border-b-2 border-gray-100">
        Customer Profile & Prescription Records
      </h2>

      {/* TOP SEARCH FIELD COMPONENT */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <label className="font-semibold text-gray-700 whitespace-nowrap" htmlFor="customerSelector">
          Select / Search Customer:
        </label>
        <select 
          id="customerSelector" 
          value={selectedMobile}
          onChange={(e) => setSelectedMobile(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md p-2.5 font-medium shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
        >
          {/* 🌟 Default unselected option */}
          <option value="">-- Choose a Customer --</option>
          {customerList.map((cust, idx) => (
            <option key={idx} value={cust.mobile}>
              {cust.name} ({cust.mobile})
            </option>
          ))}
        </select>
      </div>

      {profile ? (
        <>
          {/* SECTION 1: CUSTOMER DETAILS */}
          <h3 className="text-lg font-bold text-gray-800 mb-3">1. Customer Details</h3>
          <div className="bg-gray-50 border-l-4 border-blue-600 p-4 rounded-r-lg mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <strong className="text-xs text-gray-400 block uppercase tracking-wider">Customer Name</strong>
                <span className="text-base font-semibold text-gray-900">{profile.name}</span>
              </div>
              <div>
                <strong className="text-xs text-gray-400 block uppercase tracking-wider">Contact Mobile</strong>
                <span className="text-base font-semibold text-gray-900">{profile.mobile}</span>
              </div>
              <div>
                <strong className="text-xs text-gray-400 block uppercase tracking-wider">Last Purchase Date</strong>
                <span className="text-base font-semibold text-gray-900">{profile.lastVisit}</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 my-6" />

          {/* SECTION 2: PURCHASE HISTORY */}
          <h3 className="text-lg font-bold text-gray-800 mb-3">2. Purchase History</h3>
          <div className="w-full overflow-x-auto mb-6 rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <th className="p-3">Date</th>
                  <th className="p-3">Invoice No.</th>
                  <th className="p-3">Purchased Items</th>
                  <th className="p-3">Total Paid</th>
                  <th className="p-3">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-600">
                {profile.history?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">{item.date}</td>
                    <td className="p-3 font-semibold text-gray-900">{item.invoiceNumber}</td>
                    <td className="p-3">{item.details}</td>
                    <td className="p-3 font-medium text-gray-900">{item.totalAmount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        {item.paymentMode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr className="border-gray-200 my-6" />

          {/* SECTION 3: LENS PRESCRIPTION DETAILS */}
          <h3 className="text-lg font-bold text-gray-800 mb-3">3. Lens Prescription Details (Most Recent)</h3>
          <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                  <th className="p-3">Eye</th>
                  <th className="p-3">Spherical (SPH)</th>
                  <th className="p-3">Cylindrical (CYL)</th>
                  <th className="p-3">Axis</th>
                  <th className="p-3">Addition (ADD)</th>
                  <th className="p-3">Pupil Distance (PD)</th>
                  <th className="p-3">Lens Type Treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-blue-50/60 hover:bg-blue-50 text-gray-700 font-medium">
                  <td className="p-3 font-bold text-blue-900">Right (OD)</td>
                  <td className="p-3">{profile.prescription?.od?.sph || '0.00'}</td>
                  <td className="p-3">{profile.prescription?.od?.cyl || '0.00'}</td>
                  <td className="p-3">{profile.prescription?.od?.axis || '-'}</td>
                  <td className="p-3">{profile.prescription?.od?.add || '-'}</td>
                  <td className="p-3">{profile.prescription?.od?.pd || '-'}</td>
                  <td className="p-3 text-blue-900 font-semibold">{profile.prescription?.od?.lens || 'Plain / No Power'}</td>
                </tr>
                <tr className="bg-green-50/60 hover:bg-green-50 text-gray-700 font-medium">
                  <td className="p-3 font-bold text-green-900">Left (OS)</td>
                  <td className="p-3">{profile.prescription?.os?.sph || '0.00'}</td>
                  <td className="p-3">{profile.prescription?.os?.cyl || '0.00'}</td>
                  <td className="p-3">{profile.prescription?.os?.axis || '-'}</td>
                  <td className="p-3">{profile.prescription?.os?.add || '-'}</td>
                  <td className="p-3">{profile.prescription?.os?.pd || '-'}</td>
                  <td className="p-3 text-green-900 font-semibold">{profile.prescription?.os?.lens || 'Plain / No Power'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* 🌟 Clean UI Placeholder when no user is selected */
        <div className="text-center py-12 text-gray-400 font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
          Please select a client from the lookup dropdown selector above to pull up their profile history.
        </div>
      )}
    </div>
  );
}