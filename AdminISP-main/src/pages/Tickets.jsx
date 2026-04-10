import React, { useState, useEffect, useCallback } from "react";
import { Search, Ticket, CheckCircle2, XCircle, X, ChevronDown } from "lucide-react";
import { ticketsAPI, clientsAPI } from "../services/api";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCount, setOpenCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [activeTab, setActiveTab] = useState("open");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    customer: "",
    subject: "",
    description: "",
    priority: "medium",
  });

  const filteredTickets = tickets;
  const openTicketsCount = openCount;
  const closedTicketsCount = closedCount;

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { status: activeTab };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await ticketsAPI.list(params);
      setTickets(data.tickets || data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await ticketsAPI.getCounts();
      setOpenCount(data.open || 0);
      setClosedCount(data.closed || 0);
    } catch {}
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data } = await clientsAPI.list({ limit: 200 });
      setCustomers((data.clients || data.data || []).map(c => ({ id: c.id, username: c.username, name: c.name })));
    } catch {}
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTicket = async () => {
    if (!formData.customer.trim()) { alert("Please select a customer"); return; }
    if (!formData.subject.trim()) { alert("Please enter a subject"); return; }
    if (!formData.description.trim()) { alert("Please enter a description"); return; }

    const customer = customers.find((c) => c.id.toString() === formData.customer);
    if (!customer) { alert("Invalid customer selection"); return; }

    try {
      await ticketsAPI.create({
        client_id: customer.id,
        customer_name: customer.name,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
      });
      await Promise.all([fetchTickets(), fetchCounts()]);
      setFormData({ customer: "", subject: "", description: "", priority: "medium" });
      setIsDrawerOpen(false);
      setSuccessMessage("Ticket created successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to create ticket");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9fafb] dark:bg-[#000520] transition-colors duration-300">
      
      {/* MAIN CONTENT AREA */}
      <div className={`p-4 md:p-6 transition-all duration-300 ${isDrawerOpen ? "blur-sm pointer-events-none" : ""}`}>
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tickets</h1>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-all shadow-blue-500/20"
          >
            <Ticket size={18} className="rotate-[-10deg]" />
            Raise ticket
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-8 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
          <TabItem 
            active={activeTab === "open"} 
            onClick={() => setActiveTab("open")} 
            label="Open Tickets" 
            icon={<Ticket size={18} />}
            count={openTicketsCount}
          />
          <TabItem 
            active={activeTab === "closed"} 
            onClick={() => setActiveTab("closed")} 
            label="Closed Tickets" 
            icon={<CheckCircle2 size={18} />}
            count={closedTicketsCount}
          />
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white dark:bg-[#000a00] border border-gray-200 dark:border-[#009DFF]/30 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 flex justify-end border-b border-gray-100 dark:border-gray-800">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by ticket #, customer, subject..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-5 px-6 py-4 bg-gray-50/50 dark:bg-[#000a40]/20 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
                <div>Client ↓</div>
                <div>Ticket # ↓</div>
                <div>Subject ↓</div>
                <div>Priority ↓</div>
                <div>Created at ↓</div>
              </div>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-60">
                  <div className="text-gray-400 dark:text-gray-600 text-sm">Loading...</div>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 opacity-60">
                  <XCircle size={32} className="text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-bold dark:text-gray-400">No tickets found.</h3>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="grid grid-cols-5 px-6 py-4 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{ticket.customer}</div>
                      <div className="font-mono text-[#009DFF]">{ticket.ticketNumber}</div>
                      <div className="truncate">{ticket.subject}</div>
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ticket.priority === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : ticket.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-500">{ticket.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SUCCESS MESSAGE --- */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* --- NEW TICKET DRAWER OVERLAY --- */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 transition-opacity animate-in fade-in"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* SIDE DRAWER */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 md:max-w-sm bg-white dark:bg-[#000a00] z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-3 sm:p-4 md:p-6 h-full flex flex-col">
          
          <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">New Ticket</h2>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 space-y-4 sm:space-y-5 md:space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Customer<span className="text-red-500">*</span></label>
              <div className="relative">
                <select 
                  value={formData.customer}
                  onChange={(e) => handleFormChange("customer", e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white cursor-pointer"
                >
                  <option className="dark:bg-[#000a00]" value="">Select...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id} className="dark:bg-[#000a00]">
                      {customer.username} - {customer.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Subject<span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="Internet disconnection" 
                value={formData.subject}
                onChange={(e) => handleFormChange("subject", e.target.value)}
                className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Description<span className="text-red-500">*</span></label>
              <textarea 
                rows="3"
                placeholder="Provide detailed description of the issue..." 
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white resize-none"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Priority</label>
              <div className="relative">
                <select 
                  value={formData.priority}
                  onChange={(e) => handleFormChange("priority", e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white cursor-pointer"
                >
                  <option className="dark:bg-[#000a00]" value="low">Low</option>
                  <option className="dark:bg-[#000a00]" value="medium">Medium</option>
                  <option className="dark:bg-[#000a00]" value="high">High</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 md:gap-4 pt-4 sm:pt-5 md:pt-6 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1 py-2 sm:py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateTicket}
              className="flex-1 py-2 sm:py-2.5 rounded-lg bg-[#009DFF] text-white text-xs sm:text-sm font-bold hover:bg-[#0077cc] shadow-lg shadow-blue-500/20 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabItem({ active, onClick, label, icon, count = 0 }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 transition-all relative ${
        active ? "text-[#009DFF] font-semibold" : "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className="text-xs font-medium opacity-70">({count})</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#009DFF]" />}
    </button>
  );
}