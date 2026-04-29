import React, { useState, useEffect, useCallback } from "react";
import { 
  Package, Plus, Sparkles, BookOpen, Search, 
  Layers, Wifi, Radio, Database, Gift, ChevronDown, X, Pencil, Trash2
} from "lucide-react";
import { packagesAPI } from "../services/api";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tabCounts, setTabCounts] = useState({ All: 0, Hotspot: 0, PPPOE: 0, "Data Plans": 0, "Free Trial": 0 });
  const [activeTab, setActiveTab] = useState("All");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "Fixed (PPPoE/Static/DHCP)",
    uploadSpeed: "",
    downloadSpeed: "",
    burst: false,
    period: "",
    unit: "Hour(s)",
    price: "",
  });

  const filteredPackages = packages;

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (activeTab !== "All") params.type = activeTab;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await packagesAPI.list(params);
      setPackages(data.packages || data || [])
    } catch (err) {
      setError(err.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await packagesAPI.getCounts();
      setTabCounts(data);
    } catch {}
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => ({
    name: "",
    type: "Fixed (PPPoE/Static/DHCP)",
    uploadSpeed: "",
    downloadSpeed: "",
    burst: false,
    period: "",
    unit: "Hour(s)",
    price: "",
  });

  const handleOpenCreate = () => {
    setEditingPackage(null);
    setFormData(resetForm());
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      type: pkg.type,
      uploadSpeed: pkg.upload_speed,
      downloadSpeed: pkg.download_speed,
      burst: !!pkg.burst,
      period: pkg.period,
      unit: pkg.unit,
      price: pkg.price,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingPackage(null);
  };

  const handleDeletePackage = async (pkg) => {
    if (!window.confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) return;
    try {
      await packagesAPI.delete(pkg.id);
      await Promise.all([fetchPackages(), fetchCounts()]);
      setSuccessMessage(`Package "${pkg.name}" deleted.`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert(err.message || "Failed to delete package");
    }
  };

  const handleCreatePackage = async () => {
    if (!formData.name.trim()) {
      alert("Please enter package name");
      return;
    }
    if (!formData.uploadSpeed || !formData.downloadSpeed) {
      alert("Please enter upload and download speeds");
      return;
    }
    if (!formData.period || !formData.price) {
      alert("Please enter period and price");
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      upload_speed: parseFloat(formData.uploadSpeed),
      download_speed: parseFloat(formData.downloadSpeed),
      burst: formData.burst,
      period: parseFloat(formData.period),
      unit: formData.unit,
      price: parseFloat(formData.price),
    };

    try {
      if (editingPackage) {
        await packagesAPI.update(editingPackage.id, payload);
      } else {
        await packagesAPI.create(payload);
      }
      await Promise.all([fetchPackages(), fetchCounts()]);
      const verb = editingPackage ? "updated" : "created";
      setSuccessMessage(`Package "${formData.name}" ${verb} successfully!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      setFormData(resetForm());
      setEditingPackage(null);
      setIsDrawerOpen(false);
    } catch (err) {
      alert(err.message || `Failed to ${editingPackage ? "update" : "create"} package`);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f9fafb] dark:bg-[#000520] transition-colors duration-300">
      
      {/* MAIN CONTENT AREA */}
      <div className={`p-4 md:p-6 transition-all duration-300 ${isDrawerOpen ? "blur-sm pointer-events-none" : ""}`}>
        
        {/* HEADER SECTION */}
        <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Packages</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage internet packages for your clients - create pricing plans, set speeds, configure schedules and assign to MikroTik devices
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <Package size={16} /> Create Package
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto no-scrollbar pb-1">
          <PackageTab icon={<Layers size={16}/>} label="All" count={tabCounts.All} active={activeTab === "All"} onClick={() => setActiveTab("All")} />
          <PackageTab icon={<Wifi size={16}/>} label="Hotspot" count={tabCounts.Hotspot} active={activeTab === "Hotspot"} onClick={() => setActiveTab("Hotspot")} />
          <PackageTab icon={<Radio size={16}/>} label="PPPOE" count={tabCounts.PPPOE} active={activeTab === "PPPOE"} onClick={() => setActiveTab("PPPOE")} />
          <PackageTab icon={<Database size={16}/>} label="Data Plans" count={tabCounts["Data Plans"]} active={activeTab === "Data Plans"} onClick={() => setActiveTab("Data Plans")} />
          <PackageTab icon={<Gift size={16}/>} label="Free Trial" count={tabCounts["Free Trial"]} active={activeTab === "Free Trial"} onClick={() => setActiveTab("Free Trial")} />
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white dark:bg-[#000a00] border border-gray-200 dark:border-[#009DFF]/30 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 flex justify-end border-b border-gray-100 dark:border-gray-800">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search packages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="hidden md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-[#000a40]/20 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Name <ChevronDown size={14} className="inline ml-1 opacity-50"/></th>
                    <th className="px-6 py-4">Price <ChevronDown size={14} className="inline ml-1 opacity-50"/></th>
                    <th className="px-6 py-4">Speed <ChevronDown size={14} className="inline ml-1 opacity-50"/></th>
                    <th className="px-6 py-4">Time <ChevronDown size={14} className="inline ml-1 opacity-50"/></th>
                    <th className="px-6 py-4">Type <ChevronDown size={14} className="inline ml-1 opacity-50"/></th>
                    <th className="px-6 py-4 text-center">Enabled</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-24 text-center text-gray-400">Loading...</td>
                    </tr>
                  ) : filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package size={40} className="text-gray-300 dark:text-gray-700 mb-4" />
                          <h3 className="text-lg font-bold dark:text-white">No packages found</h3>
                          <p className="text-gray-500 text-sm mb-6">Create your first package to start offering internet services.</p>
                          <button 
                            onClick={handleOpenCreate}
                            className="bg-[#009DFF] text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20"
                          >
                            + Create Package
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{pkg.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Kshs {pkg.price}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pkg.upload_speed}/{pkg.download_speed} Mbps</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pkg.period} {pkg.unit}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            pkg.type === "PPPOE"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : pkg.type === "Hotspot"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : pkg.type === "Free Trial"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {pkg.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${pkg.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                            {pkg.enabled ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(pkg)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-[#009DFF] hover:bg-[#009DFF]/10 transition-colors"
                              title="Edit package"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete package"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
              ) : filteredPackages.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={40} className="text-gray-300 dark:text-gray-700 mb-4 mx-auto" />
                  <h3 className="text-base font-bold dark:text-white">No packages found</h3>
                  <p className="text-gray-500 text-xs mb-4">Create your first package to start offering internet services.</p>
                  <button 
                    onClick={handleOpenCreate}
                    className="bg-[#009DFF] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20"
                  >
                    + Create Package
                  </button>
                </div>
              ) : (
                filteredPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white text-sm">{pkg.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Kshs {pkg.price}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pkg.type === "PPPOE"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : pkg.type === "Hotspot"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : pkg.type === "Free Trial"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {pkg.type}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(pkg)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#009DFF] hover:bg-[#009DFF]/10 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Speed:</span>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">{pkg.upload_speed}/{pkg.download_speed} Mbps</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Period:</span>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">{pkg.period} {pkg.unit}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Burst:</span>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">{pkg.burst ? "Yes" : "No"}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Enabled:</span>
                        <div className={`font-medium ${pkg.enabled ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {pkg.enabled ? "Yes" : "No"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SUCCESS / ERROR MESSAGES --- */}
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

      {/* --- NEW PACKAGE DRAWER --- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 animate-in fade-in" onClick={handleCloseDrawer} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 md:max-w-sm bg-white dark:bg-[#000a00] z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">{editingPackage ? "Edit Package" : "New Package"}</h2>
            <button onClick={handleCloseDrawer} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 custom-scrollbar">
            <FormInput 
              label="Package Name" 
              placeholder="Daily"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
            />
            
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package Type</label>
              <div className="relative">
                <select 
                  value={formData.type}
                  onChange={(e) => handleFormChange("type", e.target.value)}
                  className="w-full appearance-none bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm dark:text-white"
                >
                  <option>Fixed (PPPoE/Static/DHCP)</option>
                  <option>Hotspot</option>
                  <option>Data Plans</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <FormInput 
                label="Upload Speed (Tx) Mbps" 
                placeholder="1"
                type="number"
                value={formData.uploadSpeed}
                onChange={(e) => handleFormChange("uploadSpeed", e.target.value)}
              />
              <FormInput 
                label="Download Speed (Rx) Mbps" 
                placeholder="1"
                type="number"
                value={formData.downloadSpeed}
                onChange={(e) => handleFormChange("downloadSpeed", e.target.value)}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.burst}
                onChange={(e) => handleFormChange("burst", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#009DFF] focus:ring-[#009DFF]/30" 
              />
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Enable Burst</span>
            </label>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <FormInput 
                label="Period" 
                placeholder="1"
                type="number"
                value={formData.period}
                onChange={(e) => handleFormChange("period", e.target.value)}
              />
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit</label>
                <div className="relative">
                  <select 
                    value={formData.unit}
                    onChange={(e) => handleFormChange("unit", e.target.value)}
                    className="w-full appearance-none bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm dark:text-white"
                  >
                    <option>Hour(s)</option>
                    <option>Day(s)</option>
                    <option>Month(s)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <FormInput 
              label="Price (Kshs)" 
              placeholder="20"
              type="number"
              value={formData.price}
              onChange={(e) => handleFormChange("price", e.target.value)}
            />
          </div>

          <div className="p-3 sm:p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            <button 
              onClick={handleCloseDrawer} 
              className="py-2 sm:py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreatePackage}
              className="py-2 sm:py-2.5 rounded-lg bg-[#009DFF] text-white text-xs sm:text-sm font-bold hover:bg-[#0077cc] shadow-lg shadow-blue-500/20 transition-all"
            >
              {editingPackage ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reuseable Form Input
function FormInput({ label, placeholder, type = "text", value = "", onChange = () => {} }) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg p-2 sm:p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white transition-all focus:outline-none"
      />
    </div>
  );
}

// Tab Helper
function PackageTab({ icon, label, count, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 transition-all relative whitespace-nowrap group ${
        active ? "text-[#009DFF]" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      <span className={active ? "text-[#009DFF]" : "text-gray-400"}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
        active 
          ? "bg-[#009DFF]/10 border-[#009DFF] text-[#009DFF]" 
          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-800"
      }`}>{count}</span>
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#009DFF]" />}
    </button>
  );
}