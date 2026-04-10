import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Plus, ChevronDown, Search, Users, 
  UserMinus, FileUp, FileDown, MousePointerClick, X
} from "lucide-react";
import { clientsAPI } from "../services/api";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabCounts, setTabCounts] = useState({ PPPoE: 0, Static: 0, DHCP: 0, Hotspot: 0 });
  const [activeTab, setActiveTab] = useState("PPPoE");
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSite, setFilterSite] = useState("All Sites");
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [filterConnection, setFilterConnection] = useState("All Connections");
  const [filterPackage, setFilterPackage] = useState("All Packages");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    oldUsername: "",
    secret: "",
    phone: "",
    houseNo: "",
    apartment: "",
    location: "",
    connectionType: "PPPoE",
    package: "",
    installationFee: false,
  });
  const actionRef = useRef(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (activeTab !== "All") params.tab = activeTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterStatus !== "All Statuses") params.status = filterStatus;
      if (filterConnection !== "All Connections") params.connection = filterConnection;
      const { data } = await clientsAPI.list(params);
      setClients(data.clients || data.data || []);
    } catch (err) {
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, filterStatus, filterConnection]);

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await clientsAPI.getCounts();
      setTabCounts(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionRef.current && !actionRef.current.contains(event.target)) {
        setIsActionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = clients;

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateClient = async () => {
    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert("Please enter first and last name");
      return;
    }
    if (!formData.username.trim()) {
      alert("Please enter username");
      return;
    }
    if (!formData.phone.trim()) {
      alert("Please enter phone number");
      return;
    }
    if (!formData.package.trim() || formData.package === "Select...") {
      alert("Please select a package");
      return;
    }

    try {
      const payload = {
        username: formData.username,
        name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        plan: formData.package,
        connection_type: formData.connectionType,
        house_no: formData.houseNo,
        apartment: formData.apartment,
        location: formData.location,
        installation_fee: formData.installationFee,
      };
      await clientsAPI.create(payload);
      await Promise.all([fetchClients(), fetchCounts()]);

      setFormData({
        firstName: "",
        lastName: "",
        username: "",
        oldUsername: "",
        secret: "",
        phone: "",
        houseNo: "",
        apartment: "",
        location: "",
        connectionType: "PPPoE",
        package: "",
        installationFee: false,
      });
      setIsNewCustomerOpen(false);
      setSuccessMessage(`Client ${formData.username} created successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to create client");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9fafb] dark:bg-[#000520]">
      {/* MAIN CONTENT AREA */}
      <div className={`p-4 md:p-6 transition-all duration-300 ${isNewCustomerOpen ? "blur-sm pointer-events-none" : ""}`}>
        
        {/* 1. PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#009DFF]/10 p-2 rounded-lg">
              <Users className="text-[#009DFF]" size={24} />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#000a40] dark:text-white">
              Clients
            </h1>
          </div>
        </div>

        {/* 2. FILTER SECTION */}
        <div className="bg-[#FFFFFF] dark:bg-[#000a00] border border-[#009DFF] rounded-xl p-4 md:p-6 mb-6 shadow-xl">
          <h2 className="text-lg font-semibold mb-6">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <FilterSelect label="Site" options={["All Sites"]} value={filterSite} onChange={setFilterSite} />
            <FilterSelect label="Status" options={["All Statuses", "Active", "Expired"]} value={filterStatus} onChange={setFilterStatus} />
            <FilterSelect label="Connection" options={["All Connections", "Online", "Offline"]} value={filterConnection} onChange={setFilterConnection} />
            <FilterSelect label="Package" options={["All Packages"]} value={filterPackage} onChange={setFilterPackage} />
          </div>
          <div className="mt-6">
            <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block font-medium">Search:</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, name or phone..."
                className="w-full bg-transparent border border-[#009DFF] rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 transition-all dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 3. CONNECTION TABS & ACTIONS */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 no-scrollbar border-b border-gray-100 dark:border-gray-800">
            <ConnectionTab label="PPPoE" count={tabCounts["PPPoE"]} active={activeTab === "PPPoE"} onClick={() => setActiveTab("PPPoE")} />
            <ConnectionTab label="Static" count={tabCounts["Static"]} active={activeTab === "Static"} onClick={() => setActiveTab("Static")} />
            <ConnectionTab label="DHCP" count={tabCounts["DHCP"]} active={activeTab === "DHCP"} onClick={() => setActiveTab("DHCP")} />
            <ConnectionTab label="Hotspot" count={tabCounts["Hotspot"]} active={activeTab === "Hotspot"} onClick={() => setActiveTab("Hotspot")} />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch sm:items-center">
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredClients.length} of {clients.length} clients.
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative" ref={actionRef}>
                <button 
                  onClick={() => setIsActionOpen(!isActionOpen)}
                  className="flex items-center justify-center gap-2 text-[#000a40] dark:text-[#FFFFFF] bg-transparent border border-[#009DFF] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#009DFF]/5 transition-colors w-full sm:w-auto"
                >
                  Actions <ChevronDown size={16} className={`transition-transform duration-200 ${isActionOpen ? 'rotate-180' : ''}`} />
                </button>

                {isActionOpen && (
                  <div className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mb-2 sm:mb-0 sm:mt-2 w-full sm:w-60 bg-white dark:bg-[#000a00] border border-[#009DFF] rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="py-2">
                      <DropdownItem icon={<MousePointerClick size={16} />} label="Purge Online Customers" onClick={() => setIsActionOpen(false)} variant="danger" />
                      <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                      <DropdownItem icon={<FileDown size={16} />} label="Export Customers (.csv)" onClick={() => setIsActionOpen(false)} />
                      <DropdownItem icon={<FileUp size={16} />} label="Import Customers (.csv)" onClick={() => setIsActionOpen(false)} />
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsNewCustomerOpen(true)}
                className="flex items-center justify-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-[0_4px_15px_rgba(0,157,255,0.3)] transition-all"
              >
                <Plus size={18} /> New Customer
              </button>
            </div>
          </div>
        </div>

        {/* 4. CLIENTS TABLE */}
        <div className="mt-8 bg-[#FFFFFF] dark:bg-[#000a00] rounded-xl border border-[#009DFF] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] dark:bg-[#000a00] text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Phone Number</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Online</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Expiry</th>
                    <th className="px-6 py-4">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-20 text-center text-gray-400">Loading...</td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-20 text-center text-gray-400 italic">
                        No clients found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#000a40] dark:text-gray-100">{client.username}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.phone}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.plan}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${client.online ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                            {client.online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${client.status === "Active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.expiry}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{client.registered}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic">
                  No clients found matching the selected filters.
                </div>
              ) : (
                filteredClients.map((client) => (
                  <div key={client.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-[#009DFF] transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-[#000a40] dark:text-white">{client.username}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{client.name}</div>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${client.status === "Active" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {client.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                        <div className="text-gray-700 dark:text-gray-300">{client.phone}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Online:</span>
                        <div className={`text-sm font-semibold ${client.online ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
                          {client.online ? "Online" : "Offline"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Plan:</span>
                        <div className="text-gray-700 dark:text-gray-300">{client.plan}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                        <div className="text-gray-700 dark:text-gray-300">{client.expiry}</div>
                      </div>
                    </div>
                  </div>
                ))
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

      {/* --- NEW CUSTOMER DRAWER --- */}
      {isNewCustomerOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 animate-in fade-in" onClick={() => setIsNewCustomerOpen(false)} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#000a00] z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isNewCustomerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">New Customer</h2>
            <button onClick={() => setIsNewCustomerOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput 
                label="First Name" 
                placeholder="Jane" 
                required 
                value={formData.firstName}
                onChange={(e) => handleFormChange("firstName", e.target.value)}
              />
              <FormInput 
                label="Last Name" 
                placeholder="Doe" 
                required 
                value={formData.lastName}
                onChange={(e) => handleFormChange("lastName", e.target.value)}
              />
            </div>
            <FormInput 
              label="Username" 
              placeholder="ZWS00001" 
              required 
              value={formData.username}
              onChange={(e) => handleFormChange("username", e.target.value)}
            />
            <FormInput 
              label="Old Username" 
              placeholder="JaneDoe" 
              required 
              value={formData.oldUsername}
              onChange={(e) => handleFormChange("oldUsername", e.target.value)}
            />
            <FormInput 
              label="Secret" 
              placeholder="password" 
              type="password"
              value={formData.secret}
              onChange={(e) => handleFormChange("secret", e.target.value)}
            />
            <FormInput 
              label="Phone" 
              placeholder="+2547XXXXXXXX" 
              required 
              value={formData.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
            />
            <FormInput 
              label="House No" 
              placeholder="A4"
              value={formData.houseNo}
              onChange={(e) => handleFormChange("houseNo", e.target.value)}
            />
            <FormInput 
              label="Apartment" 
              placeholder="Hadasa"
              value={formData.apartment}
              onChange={(e) => handleFormChange("apartment", e.target.value)}
            />
            <FormInput 
              label="Location" 
              placeholder="Githurai"
              value={formData.location}
              onChange={(e) => handleFormChange("location", e.target.value)}
            />
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Connection Type<span className="text-red-500 ml-1">*</span></label>
              <div className="relative">
                <select 
                  value={formData.connectionType}
                  onChange={(e) => handleFormChange("connectionType", e.target.value)}
                  className="w-full appearance-none bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white"
                >
                  <option>PPPoE</option>
                  <option>Static</option>
                  <option>DHCP</option>
                  <option>Hotspot</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Package<span className="text-red-500 ml-1">*</span></label>
              <div className="relative">
                <select 
                  value={formData.package}
                  onChange={(e) => handleFormChange("package", e.target.value)}
                  className="w-full appearance-none bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white"
                >
                  <option>Select...</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.installationFee}
                onChange={(e) => handleFormChange("installationFee", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#009DFF] focus:ring-[#009DFF]/30" 
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 transition-colors">Add installation fee</span>
            </label>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
            <button onClick={() => setIsNewCustomerOpen(false)} className="py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleCreateClient} className="py-2.5 rounded-lg bg-[#009DFF] text-white text-sm font-bold hover:bg-[#0077cc] shadow-lg shadow-blue-500/20 transition-all">
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function FormInput({ label, placeholder, type = "text", required = false, value = "", onChange = () => {} }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 transition-all dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FilterSelect({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent border border-[#009DFF] rounded-lg p-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 cursor-pointer dark:text-white"
        >
          {options.map(opt => <option key={opt} value={opt} className="dark:bg-[#000a00]">{opt}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#009DFF] pointer-events-none group-hover:scale-110 transition-transform" />
      </div>
    </div>
  );
}

function ConnectionTab({ label, count, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${
        active 
          ? "bg-[#009DFF] text-white shadow-[0_4px_12px_rgba(0,157,255,0.4)]" 
          : "text-gray-500 hover:text-[#009DFF] hover:bg-[#009DFF]/5"
      }`}
    >
      {label} <span className={`ml-1 opacity-70 ${active ? 'text-white' : ''}`}>({count})</span>
    </button>
  );
}

function DropdownItem({ icon, label, onClick, variant = "default" }) {
  const baseStyles = "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left";
  const variants = {
    default: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10",
    danger: "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium"
  };

  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]}`}>
      <span className={variant === 'danger' ? 'text-red-500' : 'text-[#009DFF]'}>
        {icon}
      </span>
      {label}
    </button>
  );
}