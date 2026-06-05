import React from 'react';

const ThermalReceipt = ({ invoiceData }) => {
  if (!invoiceData) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-print-area').innerHTML;
    const originalContent = document.body.innerHTML;

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
          ${printContent}
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
    <div className="bg-slate-100 p-4 rounded-xl border border-gray-300 max-w-sm mx-auto my-4">
      {/* Target hidden frame rendered on screen for management reference preview */}
      <div id="thermal-print-area" className="hidden">
        <div className="text-center">
          <h2 className="font-bold" style={{ fontSize: '16px', margin: '0 0 2px 0' }}>SUPER OPTICALS</h2>
          <p style={{ margin: '0', fontSize: '11px' }}>123, Main Bazaar Road, Salem</p>
          <p style={{ margin: '0', fontSize: '11px' }}>Phone: +91 90877 95074</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>SALES INVOICE</p>
        </div>

        <div className="divider"></div>

        {/* METADATA BLOCK */}
        <div style={{ fontSize: '11px' }}>
          <div><strong>Bill No:</strong> {invoiceData.invoiceNumber}</div>
          <div><strong>Date:</strong> {new Date(invoiceData.date || Date.now()).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div><strong>Patient:</strong> {invoiceData.patientName}</div>
          <div><strong>Mobile:</strong> {invoiceData.patientMobile}</div>
        </div>

        <div className="divider"></div>

        {/* ITEMS AGGREGATIONS LIST */}
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
                
                {/* Embedded Diopter Values Block if Prescription exists */}
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

        {/* ACCOUNTING TOTALS MATRIX BALANCE CONTROL */}
        <div style={{ fontSize: '12px', paddingLeft: '20mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Discount:</span>
            <span className="font-mono">-₹{invoiceData.discount || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>
            <span>NET TOTAL:</span>
            <span className="font-mono">₹{invoiceData.totalAmount}</span>
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

      {/* Visible Action Button shown inside parent application view dashboard bounds */}
      <div className="text-center space-y-2">
        <p className="text-xs font-bold text-emerald-700">✓ Invoice Ready to Print ({invoiceData.invoiceNumber})</p>
        <button
          type="button"
          onClick={handlePrint}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          🖨️ Fire 80mm Thermal Print Job
        </button>
      </div>
    </div>
  );
};

export default ThermalReceipt;