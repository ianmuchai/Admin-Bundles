import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, X, ChevronDown } from 'lucide-react';
import CreateLeadDrawer from './CreateLeadDrawer'; // Component below
import { leadsAPI } from '../services/api';

const LeadsPage = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const { data } = await leadsAPI.list(params);
      setLeads(data.data || data.leads || []);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-[#000520]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#000a40] dark:text-white">Leads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Do you have potential clients who might be interested in your products or services?
          </p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#4dabf7] hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-colors font-medium shadow-sm"
        >
          <UserPlus size={18} />
          Create a new lead
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-zeta-dark rounded-xl border border-gray-300 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Search Bar Row */}
        <div className="p-4 flex justify-end border-b border-gray-200 dark:border-gray-800">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600" size={18} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800 px-6 py-3">
          {['Name', 'Email', 'Phone', 'Address'].map((header) => (
            <div key={header} className="flex items-center gap-1 text-sm font-semibold text-[#000a40] dark:text-gray-300">
              {header}
              <ChevronDown size={14} className="text-gray-400 dark:text-gray-600 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Table Body / Empty State */}
        <div className="min-h-[300px]">
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 mb-4">
                <X size={24} className="text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-[#000a40] dark:text-gray-300 font-medium">{loading ? "Loading..." : "No leads"}</p>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
          ) : (
            <div className="w-full">
              {leads.map((lead) => (
                <div key={lead.id} className="grid grid-cols-4 px-6 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm">
                  <div className="text-[#000a40] dark:text-white font-medium">{lead.name}</div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">{lead.email || '-'}</div>
                  <div className="text-gray-600 dark:text-gray-400">{lead.phone || '-'}</div>
                  <div className="text-gray-600 dark:text-gray-400 truncate">{lead.address || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Drawer */}
      <CreateLeadDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        onLeadCreated={() => { setIsDrawerOpen(false); fetchLeads(); }}
      />
    </div>
  );
};

export default LeadsPage;