import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, Search, MapPin, Router, 
  Settings, CheckCircle2, Globe, 
  ArrowRight, ChevronRight, XCircle, 
  Copy, Info, Check, Eye
} from "lucide-react";
import { sitesAPI } from "../services/api";

export default function Sites() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filter sites
  const filteredSites = sites
    .filter((site) => activeTab === "operational" ? site.status === "Online" : true)
    .filter((site) => {
      const query = searchQuery.toLowerCase();
      return (
        (site.boardName || site.board_name || "").toLowerCase().includes(query) ||
        (site.remoteWinbox || site.remote_winbox || "").toLowerCase().includes(query)
      );
    });

  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.status === "Online").length;
  const pendingSites = sites.filter((s) => s.status !== "Online").length;

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (activeTab === "operational") params.tab = "operational";
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await sitesAPI.list(params);
      const rows = (data.sites || data || []).map(s => ({
        ...s,
        boardName: s.board_name || s.boardName,
        remoteWinbox: s.remote_winbox || s.remoteWinbox || "-",
        provisioning: s.provisioning || "Pending",
        cpu: s.cpu || 0,
        memory: s.memory || 0,
      }));
      setSites(rows);
    } catch (err) {
      setError(err.message || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-[#f9fafb] dark:bg-[#000520] transition-colors duration-300">
      
      {/* HEADER - Responsive flex direction */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Equipment Management</h1>
          <p className="text-xs sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Monitor and manage your networking equipment and boards</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={16} /> Add New Board
        </button>
      </div>

      {/* STATS/BOARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
        <SiteStatCard title="Total Boards" value={totalSites} icon={<Router size={18}/>} color="text-blue-500" />
        <SiteStatCard title="Active Boards" value={activeSites} icon={<CheckCircle2 size={18}/>} color="text-green-500" />
        <SiteStatCard title="Offline Boards" value={pendingSites} icon={<Settings size={18}/>} color="text-orange-500" />
      </div>

      {/* SITE TABLE SECTION */}
      <div className="bg-white dark:bg-[#000a40] rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-2">
            <TabButton 
              label="All Boards" 
              active={activeTab === "all"} 
              onClick={() => setActiveTab("all")} 
              count={sites.length}
            />
            <TabButton 
              label="Operational" 
              active={activeTab === "operational"} 
              onClick={() => setActiveTab("operational")} 
              count={activeSites}
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search boards..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#009DFF]/20 dark:text-white"
            />
          </div>
        </div>

        {/* Table wrapper for horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Board Name</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Provisioning</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">CPU</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Memory</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Status</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4">Remote Winbox</th>
                <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 text-center text-gray-400 text-xs sm:text-sm">
                    Loading...
                  </td>
                </tr>
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 sm:px-4 md:px-6 py-8 sm:py-12 text-center text-gray-400 text-xs sm:text-sm">
                    No boards found. Try adjusting your search or filters.
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <SiteRow key={site.id} {...site} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-3 sm:px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-white/5 text-xs sm:text-sm">
          <span className="text-gray-600 dark:text-gray-400">Showing 1 to {filteredSites.length} of {sites.length} results</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Per page</span>
            <select className="bg-white dark:bg-[#000a40] border border-gray-200 dark:border-gray-800 rounded px-2 py-1 text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-[#009DFF]/20 outline-none">
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-right text-xs sm:text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg z-50 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {showAddModal && <AddSiteModal onClose={() => setShowAddModal(false)} onAddSite={async (newSite) => {
        try {
          await sitesAPI.create({
            board_name: newSite.name,
            location: newSite.location,
            mac_address: newSite.mac_address,
            board_type: newSite.board_type,
            provisioning: "Pending",
            status: "Offline",
          });
          await fetchSites();
          setShowAddModal(false);
          setSuccessMessage(`Board "${newSite.name}" registered successfully!`);
          setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err) {
          alert(err.message || "Failed to register board");
        }
      }} />}
    </div>
  );
}

// --- Multi-Step Onboarding Modal ---
function AddSiteModal({ onClose, onAddSite }) {
  const [step, setStep] = useState(1);
  const [copiedScript, setCopiedScript] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    devices: 1,
    bandwidth: "10Mbps",
  });

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = () => {
    const script = `/tool fetch mode=https url="https://zeta.centipidtechnologies.com/provision/site-auth-token-xyz789" dst-path=site-link.rsc; delay 2s; /import site-link.rsc;`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleComplete = () => {
    if (!formData.name.trim()) {
      alert("Site name is required");
      return;
    }
    onAddSite({
      name: formData.name,
      location: formData.location || "Not specified",
      mac_address: formData.devices || "",
      board_type: formData.bandwidth || "Mikrotik",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#000a40] w-full max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start sm:items-center gap-3 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl md:text-lg font-bold text-gray-800 dark:text-white">Add New Board</h2>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Register a new networking board to the system</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-90">
            <XCircle size={20} className="sm:w-6 sm:h-6"/>
          </button>
        </div>

        {/* STEP PROGRESS BAR - Responsive sizing */}
        <div className="p-3 sm:p-4 md:p-6 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <StepItem number={1} label="Details" active={step >= 1} current={step === 1} />
            <div className={`h-0.5 flex-1 mx-1 sm:mx-3 md:mx-4 ${step > 1 ? 'bg-[#009DFF]' : 'bg-gray-200 dark:bg-gray-700'}`} />
            <StepItem number={2} label="Provision" active={step >= 2} current={step === 2} />
            <div className={`h-0.5 flex-1 mx-1 sm:mx-3 md:mx-4 ${step > 2 ? 'bg-[#009DFF]' : 'bg-gray-200 dark:bg-gray-700'}`} />
            <StepItem number={3} label="Service" active={step >= 3} current={step === 3} />
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-8 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-in slide-in-from-right-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Board Name*</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ZETA SPOT KISUMU" 
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Location/Site</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Kisumu, Kenya" 
                    value={formData.location}
                    onChange={(e) => handleFormChange("location", e.target.value)}
                    className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">MAC Address</label>
                  <input 
                    type="text" 
                    placeholder="XX:XX:XX:XX:XX:XX" 
                    value={formData.devices}
                    onChange={(e) => handleFormChange("devices", e.target.value)}
                    className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20 font-mono"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Board Type</label>
                  <select 
                    value={formData.bandwidth}
                    onChange={(e) => handleFormChange("bandwidth", e.target.value)}
                    className="w-full p-2 sm:p-2.5 md:p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm dark:text-white outline-none focus:ring-2 focus:ring-[#009DFF]/20"
                  >
                    <option>Mikrotik</option>
                    <option>Ubiquiti</option>
                    <option>TP-Link</option>
                    <option>Cisco</option>
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg sm:rounded-xl flex gap-3 border border-blue-100 dark:border-blue-800">
                <Info className="text-[#009DFF] shrink-0 w-5 h-5 sm:w-5 sm:h-5 mt-0.5" />
                <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 leading-relaxed">Register your networking equipment to enable remote management, monitoring, and provisioning from the cloud system.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-in slide-in-from-right-4">
              <div className="p-3 sm:p-4 md:p-6 bg-black dark:bg-gray-900 rounded-lg sm:rounded-xl border border-gray-800">
                <div className="flex justify-between items-start gap-2 mb-2 sm:mb-3">
                   <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2"><Router size={12}/> Provisioning Script</span>
                   <button 
                     onClick={copyToClipboard}
                     className="text-[9px] sm:text-[10px] bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded flex items-center gap-1 transition-all active:scale-95">
                     {copiedScript ? <Check size={12}/> : <Copy size={12}/>} {copiedScript ? 'Copied' : 'Copy'}
                   </button>
                </div>
                <code className="text-[9px] sm:text-[10px] text-[#00FF41] font-mono break-all leading-relaxed block max-h-32 overflow-y-auto pr-2">
                  /tool fetch mode=https url="https://zeta.centipidtechnologies.com/provision/site-auth-token-xyz789" dst-path=site-link.rsc; delay 2s; /import site-link.rsc;
                </code>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/10 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-orange-200 dark:border-orange-800/30">
                <Info size={16} className="shrink-0 mt-0.5"/> 
                <span>Run this script in your core router terminal to link this site to the cloud system.</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-in slide-in-from-right-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border border-green-200 dark:border-green-800/50">
                <div className="flex gap-3 mb-3">
                  <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0 w-5 h-5" />
                  <div>
                    <h3 className="font-bold text-green-900 dark:text-green-300 text-sm">Board Registration Complete</h3>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">Your board has been successfully registered. Here's what's next:</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-green-700 dark:text-green-400 ml-8 list-disc mt-3">
                  <li>Connect to remote management interface</li>
                  <li>Configure network settings and VLAN</li>
                  <li>Set up service provisioning rules</li>
                  <li>Monitor real-time performance metrics</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Board Name</p>
                  <p className="text-gray-800 dark:text-white font-bold mt-1">{formData.name || "New Board"}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Location</p>
                  <p className="text-gray-800 dark:text-white font-bold mt-1">{formData.location || "Not specified"}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">MAC Address</p>
                  <p className="text-gray-800 dark:text-white font-bold mt-1 font-mono text-[11px]">{formData.devices || "XX:XX:XX:XX:XX:XX"}</p>
                </div>
                <div className="p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Board Type</p>
                  <p className="text-gray-800 dark:text-white font-bold mt-1">{formData.bandwidth}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-2 sm:gap-3 shrink-0 bg-gray-50 dark:bg-white/5">
          <button 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-0 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <button 
            onClick={() => step < 3 ? setStep(step + 1) : handleComplete()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            {step === 3 ? "Register Board" : "Next"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Components ---
function SiteStatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white dark:bg-[#0a113d] p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl shadow-[#009DFF]/10 hover:shadow-[#009DFF]/30 shadow-lg border border-gray-100 dark:border-white/5 transition-all hover:-translate-y-1">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">{title}</h3>
        <div className={`${color} w-5 h-5 sm:w-6 sm:h-6`}>{icon}</div>
      </div>
      <p className="text-xl sm:text-2xl md:text-2xl text-gray-800 dark:text-white font-bold">{value}</p>
    </div>
  );
}

function TabButton({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 sm:gap-2 pb-2 sm:pb-3 px-0.5 sm:px-1 text-xs sm:text-sm font-bold transition-all border-b-2 relative whitespace-nowrap ${
        active
          ? "border-[#009DFF] text-[#009DFF]"
          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[9px] sm:text-[10px] font-bold ${active ? "text-[#009DFF]" : "text-gray-400"}`}>
          ({count})
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#009DFF] shadow-[0_0_8px_#009DFF]" />}
    </button>
  );
}

function StepItem({ number, label, active, current }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all shrink-0 ${
          current
            ? "bg-[#009DFF] text-white ring-4 ring-blue-500/20 shadow-lg"
            : active
            ? "bg-green-500 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
        }`}
      >
        {active && !current ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : number}
      </div>
      <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-tighter text-center ${current ? "text-[#009DFF]" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

function SiteRow({ id, boardName, provisioning, cpu, memory, status, remoteWinbox }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs sm:text-sm border-b border-gray-100 dark:border-gray-800">
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-900 dark:text-white truncate">{boardName}</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <span className="px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 whitespace-nowrap">
          {provisioning}
        </span>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 font-semibold text-gray-700 dark:text-gray-300">{cpu}%</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-gray-600 dark:text-gray-400">{memory.toFixed(2)} MB</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <span className="px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap">
          {status}
        </span>
      </td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-gray-600 dark:text-gray-400 truncate">{remoteWinbox}</td>
      <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-all"
        >
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </button>
        
        {showMenu && (
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#0a113d] rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-30 py-1">
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Eye size={14} /> View
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Regenerate winbox
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Reprovision
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Sync hotspot files
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/10 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Sync Router Time
            </button>
            <hr className="border-gray-200 dark:border-gray-700 my-1" />
            <button className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}