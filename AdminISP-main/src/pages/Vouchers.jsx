import React, { useState, useEffect, useCallback } from "react";
import { 
  Ticket, Plus, Search, ChevronDown, X, 
  Download, Printer, Trash2, Filter, Check
} from "lucide-react";
import { vouchersAPI, packagesAPI } from "../services/api";

export default function Vouchers() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [entries, setEntries] = useState("10");
  const [vouchers, setVouchers] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [formData, setFormData] = useState({
    package_id: "",
    package: "",
    quantity: 1,
  });
  const [viewingVoucher, setViewingVoucher] = useState(null);

  // Filter vouchers
  const filteredVouchers = vouchers.filter((voucher) => {
    const query = searchQuery.toLowerCase();
    return (
      voucher.code.toLowerCase().includes(query) ||
      (voucher.package || "").toLowerCase().includes(query)
    );
  });

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await vouchersAPI.list(params);
      setVouchers(data.vouchers || data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load vouchers");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchPackages = useCallback(async () => {
    try {
      const { data } = await packagesAPI.list();
      setAvailablePackages(data.packages || data || [])
    } catch {}
  }, []);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);
  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // Handle form change
  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate vouchers
  const handleGenerateVouchers = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!formData.quantity || formData.quantity < 1) {
      alert("Please enter a valid quantity");
      return;
    }

    try {
      const payload = {
        quantity: parseInt(formData.quantity),
      };
      if (formData.package_id) payload.package_id = formData.package_id;
      else if (formData.package) payload.package_name = formData.package;

      const { data: result } = await vouchersAPI.generate(payload);
      setGeneratedCodes(result.codes || []);
      await fetchVouchers();
      setFormData({ package_id: "", package: "", quantity: 1 });
      setSuccessMessage(`${formData.quantity} voucher${formData.quantity > 1 ? 's' : ''} generated successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      setIsDrawerOpen(false);
    } catch (err) {
      alert(err.message || "Failed to generate vouchers");
    }
  };

  // Print or Download voucher
  const handlePrintVoucher = (voucher) => {
    const printWindow = window.open("", "_blank");
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voucher - ${voucher.code}</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .voucher { background: white; width: 600px; margin: 0 auto; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #009DFF; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #009DFF; margin: 0; font-size: 32px; }
            .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
            .code-section { text-align: center; margin: 30px 0; padding: 30px; background: #f9fafb; border-radius: 8px; border: 2px dashed #009DFF; }
            .code-label { color: #666; font-size: 14px; margin-bottom: 10px; }
            .code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #009DFF; letter-spacing: 2px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
            .detail-item { padding: 15px; background: #f9fafb; border-radius: 6px; }
            .detail-label { color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .detail-value { color: #333; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
            @media print { body { background: white; padding: 0; } .voucher { box-shadow: none; width: 100%; } }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div class="header">
              <h1>🎫 Internet Voucher</h1>
              <p>Valid access code for internet services</p>
            </div>
            <div class="code-section">
              <div class="code-label">Your Access Code</div>
              <div class="code">${voucher.code}</div>
            </div>
            <div class="details">
              <div class="detail-item">
                <div class="detail-label">Package</div>
                <div class="detail-value">${voucher.package}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Issue Date</div>
                <div class="detail-value">${voucher.created}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Issue Time</div>
                <div class="detail-value">${voucher.createdTime}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value" style="color: #10b981;">Active</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">This voucher is valid for one-time use. Please keep it secure.</p>
              <p style="margin: 5px 0 0 0;">For support, contact: support@isp.local</p>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadVoucher = (voucher) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Voucher - ${voucher.code}</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .voucher { background: white; width: 600px; margin: 0 auto; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #009DFF; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #009DFF; margin: 0; font-size: 32px; }
            .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
            .code-section { text-align: center; margin: 30px 0; padding: 30px; background: #f9fafb; border-radius: 8px; border: 2px dashed #009DFF; }
            .code-label { color: #666; font-size: 14px; margin-bottom: 10px; }
            .code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #009DFF; letter-spacing: 2px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
            .detail-item { padding: 15px; background: #f9fafb; border-radius: 6px; }
            .detail-label { color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .detail-value { color: #333; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div class="header">
              <h1>🎫 Internet Voucher</h1>
              <p>Valid access code for internet services</p>
            </div>
            <div class="code-section">
              <div class="code-label">Your Access Code</div>
              <div class="code">${voucher.code}</div>
            </div>
            <div class="details">
              <div class="detail-item">
                <div class="detail-label">Package</div>
                <div class="detail-value">${voucher.package}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Issue Date</div>
                <div class="detail-value">${voucher.created}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Issue Time</div>
                <div class="detail-value">${voucher.createdTime}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value" style="color: #10b981;">Active</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0;">This voucher is valid for one-time use. Please keep it secure.</p>
              <p style="margin: 5px 0 0 0;">For support, contact: support@isp.local</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(html));
    element.setAttribute("download", `Voucher-${voucher.code}.html`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="relative min-h-screen bg-[#f9fafb] dark:bg-[#000520] transition-colors duration-300">
      
      {/* MAIN CONTENT */}
      <div className={`p-3 sm:p-4 md:p-6 transition-all ${isDrawerOpen ? "blur-sm pointer-events-none" : ""}`}>
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Vouchers</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate and manage internet access codes for your clients
            </p>
          </div>
          
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={16} /> Generate Voucher
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right text-xs sm:text-sm flex items-center gap-2">
            <Check size={16} /> {successMessage}
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 bg-red-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg z-50 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* TABLE CONTAINER */}
        <div className="bg-white dark:bg-[#000a40] border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
          
          {/* TABLE CONTROLS */}
          <div className="p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span className="hidden sm:inline">Show</span>
              <select 
                value={entries} 
                onChange={(e) => setEntries(e.target.value)}
                className="bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/20 dark:text-white"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span className="hidden sm:inline">Entries</span>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/20 dark:text-white"
              />
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Code</th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 hidden sm:table-cell">Package</th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Usage</th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">Created</th>
                  <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-4 md:px-6 py-8 text-center text-gray-400 text-xs sm:text-sm">
                      Loading...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 sm:px-4 md:px-6 py-8 text-center text-gray-400 text-xs sm:text-sm">
                      No vouchers found.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <VoucherRow key={voucher.id} voucher={voucher} onPrint={handlePrintVoucher} onDownload={handleDownloadVoucher} onDelete={async (id) => {
                    try { await vouchersAPI.delete(id); setVouchers(vouchers.filter(v => v.id !== id)); } catch (err) { alert(err.message || "Failed to delete"); }
                  }} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- GENERATE VOUCHERS DRAWER --- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 animate-in fade-in" onClick={() => setIsDrawerOpen(false)} />
      )}

      <div className={`fixed inset-y-0 right-0 w-full sm:max-w-md bg-white dark:bg-[#000a40] z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
            <h2 className="text-lg sm:text-xl md:text-lg font-bold text-gray-800 dark:text-white">Generate Vouchers</h2>
            <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleGenerateVouchers} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-5 sm:space-y-6">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Package*</label>
              <div className="relative">
                <select 
                  value={formData.package_id}
                  onChange={(e) => {
                    const pkg = availablePackages.find(p => p.id.toString() === e.target.value);
                    handleFormChange("package_id", e.target.value);
                    handleFormChange("package", pkg ? pkg.name : e.target.value);
                  }}
                  className="w-full appearance-none bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm dark:text-white focus:ring-2 focus:ring-[#009DFF]/20 outline-none"
                >
                  <option value="">-- Select Package --</option>
                  {availablePackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity*</label>
              <input 
                type="number"
                min="1"
                max="1000"
                value={formData.quantity}
                onChange={(e) => handleFormChange("quantity", parseInt(e.target.value) || 1)}
                placeholder="Enter quantity"
                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-[#009DFF]/20 dark:text-white outline-none"
              />
              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">Generate up to 1000 vouchers at once</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                <span className="font-bold">System Generated:</span> Each voucher will have a unique auto-generated code that clients can use for internet access.
              </p>
            </div>
          </form>

          <div className="p-3 sm:p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 sm:gap-3 shrink-0 bg-gray-50 dark:bg-white/5">
            <button 
              onClick={() => setIsDrawerOpen(false)} 
              className="py-2 sm:py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerateVouchers}
              className="py-2 sm:py-2.5 rounded-lg bg-[#009DFF] text-white text-xs sm:text-sm font-bold hover:bg-[#0077cc] shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoucherRow({ voucher, onPrint, onDownload, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const { id, code, usage, usagePercent, package: pkg, created, createdTime } = voucher;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs sm:text-sm font-mono font-bold text-[#009DFF]">
        <div className="truncate">{code}</div>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell whitespace-nowrap">{pkg}</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-1.5 sm:w-16 sm:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${usagePercent === 0 ? 'bg-green-500' : usagePercent < 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{width: `${usagePercent}%`}}></div>
          </div>
          <span className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{usage}</span>
        </div>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell whitespace-nowrap">{created} {createdTime}</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 relative">
        <button 
          onClick={() => setShowActions(!showActions)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </button>

        {showActions && (
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#0a113d] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-30 py-1">
            <button 
              onClick={() => { onPrint(voucher); setShowActions(false); }}
              className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors">
              <Printer size={14} /> Print
            </button>
            <button 
              onClick={() => { onDownload(voucher); setShowActions(false); }}
              className="w-full text-left px-3 sm:px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-colors">
              <Download size={14} /> Download
            </button>
            <hr className="border-gray-200 dark:border-gray-700 my-1" />
            <button 
              onClick={() => { onDelete(id); setShowActions(false); }}
              className="w-full text-left px-3 sm:px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}