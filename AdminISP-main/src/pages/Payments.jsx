import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, Eye, EyeOff, CheckCircle2, 
  XCircle, MoreVertical, Wallet, X,
  Clock, Calendar, BarChart3, Banknote, Smartphone, Ticket
} from "lucide-react";
import { paymentsAPI } from "../services/api";


export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState({ hourly: 0, daily: 0, weekly: 0, monthly: 0 });
  const [activeTab, setActiveTab] = useState("checked");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    user: "",
    phone: "",
    receipt: "",
    amount: "",
  });

  const filteredPayments = payments;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { status: activeTab };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await paymentsAPI.list(params);
      setPayments(data.payments || data || []);
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  const fetchEarnings = useCallback(async () => {
    try {
      const data = await paymentsAPI.getEarnings();
      setEarnings(data);
    } catch {}
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    if (!formData.user.trim()) { alert("Please enter user name"); return; }
    if (!formData.receipt.trim()) { alert("Please enter receipt number"); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { alert("Please enter valid amount"); return; }

    try {
      await paymentsAPI.record({
        user: formData.user,
        phone: formData.phone || "",
        receipt: formData.receipt,
        amount: parseFloat(formData.amount),
      });
      await Promise.all([fetchPayments(), fetchEarnings()]);
      setFormData({ user: "", phone: "", receipt: "", amount: "" });
      setShowRecordModal(false);
      setSuccessMessage(`Payment from ${formData.user} recorded successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to record payment");
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-[#f9fafb] dark:bg-[#000520] transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Payments</h1>
          <div className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-[10px] text-gray-500 cursor-help">i</div>
        </div>
        <button 
          onClick={() => setShowRecordModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Wallet size={16} /> Record Payment
        </button>
      </div>

      {/* EARNINGS CARDS GRID - Corrected responsive order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 md:mb-10">
        <EarningCard title="Hourly" amount={earnings.hourly} />
        <EarningCard title="Daily" amount={earnings.daily} />
        <EarningCard title="Weekly" amount={earnings.weekly} />
        <EarningCard title="Monthly" amount={earnings.monthly} />
        <EarningCard title="Monthly (Without Vouchers)" amount={earnings.monthly * 0.8} />
        <EarningCard title="Vouchers" amount={earnings.monthly * 0.2} />
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-col gap-3 mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex gap-3 sm:gap-4 md:gap-8 overflow-x-auto no-scrollbar pb-2">
          <TabButton label="Checked" active={activeTab === "checked"} onClick={() => setActiveTab("checked")} icon={<CheckCircle2 size={16}/>} count={payments.filter(p => p.status === "checked").length} />
          <TabButton label="Unchecked" active={activeTab === "unchecked"} onClick={() => setActiveTab("unchecked")} icon={<XCircle size={16}/>} count={payments.filter(p => p.status === "unchecked").length} />
        </div>
        
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search payments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#000a40] border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white outline-none"
          />
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right text-xs sm:text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg z-50 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* DATA TABLE */}
      <div className="bg-white dark:bg-[#000a40] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-4 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">Receipt</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm text-gray-600 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400">Loading...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-400">
                    No {activeTab} payments found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <PaymentRow key={payment.id} {...payment} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-3 sm:p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No {activeTab} payments found.
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white text-sm">{payment.user}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{payment.phone}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    payment.status === "checked"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {payment.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Receipt:</span>
                    <div className="font-mono text-gray-700 dark:text-gray-300">{payment.receipt}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                    <div className="font-bold text-[#009DFF]">Ksh {payment.amount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showRecordModal && <RecordPaymentModal onClose={() => setShowRecordModal(false)} formData={formData} handleFormChange={handleFormChange} handleRecordPayment={handleRecordPayment} />}
    </div>
  );
}

// --- Independent Earning Card ---
function EarningCard({ title, amount }) {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      onClick={() => setVisible(!visible)}
      className="bg-white dark:bg-[#0a113d] p-5 rounded-xl shadow-[#009DFF]/50 hover:shadow-[#009DFF]/30 shadow-lg cursor-pointer border border-gray-100 dark:border-white/5 transition-all hover:-translate-y-1 flex flex-col justify-between min-h-[110px]"
    >
      <div className="flex justify-between items-start">
        <h3 className="text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider">{title}</h3>
        <div className="text-[#009DFF] opacity-40">
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </div>
      </div>
      <p className="text-xl md:text-2xl text-gray-800 dark:text-white font-bold tracking-tight">
        {visible ? `KES ${amount}` : "••••••••"}
      </p>
    </div>
  );
}

function TabButton({ label, active, onClick, icon, count }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold transition-all border-b-2 relative whitespace-nowrap ${
        active ? "border-[#009DFF] text-[#009DFF]" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-400"
      }`}
    >
      {icon} {label}
      {count !== undefined && <span className={`text-[10px] font-bold ${active ? 'text-[#009DFF]' : 'text-gray-400'}`}>({count})</span>}
      {active && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#009DFF] shadow-[0_0_8px_#009DFF]" />}
    </button>
  );
}

function PaymentRow({ id, user, phone, receipt, amount, status, date }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <td className="px-4 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
      <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{user}</td>
      <td className="px-4 py-4 text-sm">{phone}</td>
      <td className="px-4 py-4 font-mono text-[11px] opacity-70">{receipt}</td>
      <td className="px-4 py-4 font-bold text-[#009DFF]">Ksh {amount.toLocaleString()}</td>
      <td className="px-4 py-4">
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${status === 'checked' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          {status === 'checked' ? 'Checked' : 'Pending'}
        </span>
      </td>
      <td className="px-4 py-4 text-right"><MoreVertical size={16} className="ml-auto text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300" /></td>
    </tr>
  );
}

// --- Record Payment Modal (Responsive) ---
function RecordPaymentModal({ onClose, formData, handleFormChange, handleRecordPayment }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#000a40] w-full sm:w-96 md:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#000a40]">
          <h2 className="text-lg sm:text-xl md:text-lg font-bold text-gray-800 dark:text-white">Record Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 active:scale-90 transition-transform">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        
        <form onSubmit={handleRecordPayment} className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
          {/* USER NAME FIELD */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">User Name*</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe" 
              value={formData.user}
              onChange={(e) => handleFormChange("user", e.target.value)}
              className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20"
              required
            />
          </div>

          {/* PHONE NUMBER FIELD */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Phone Number*</label>
            <input 
              type="text" 
              placeholder="e.g. 254712345678" 
              value={formData.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20"
              required
            />
          </div>

          {/* RECEIPT NUMBER FIELD */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Receipt Number*</label>
            <input 
              type="text" 
              placeholder="Enter Transaction ID" 
              value={formData.receipt}
              onChange={(e) => handleFormChange("receipt", e.target.value)}
              className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20 font-mono"
              required
            />
          </div>

          {/* AMOUNT FIELD */}
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Amount (KES)*</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={formData.amount}
              onChange={(e) => handleFormChange("amount", e.target.value)}
              className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20 font-bold"
              required
            />
          </div>

          <div className="pt-2 sm:pt-3 md:pt-4">
            <button type="submit" className="w-full bg-[#009DFF] text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/20 hover:bg-[#0077cc] transition-all active:scale-[0.98]">
              Confirm & Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}