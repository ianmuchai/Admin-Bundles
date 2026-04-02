import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Send, Trash2, Search, X } from 'lucide-react';
import { campaignsAPI } from '../services/api';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ title: '', type: 'sms', message: '', target_group: 'all', scheduled_at: '' });

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await campaignsAPI.list({ search: search || undefined });
      setCampaigns(data.data || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCampaigns, 300);
    return () => clearTimeout(t);
  }, [fetchCampaigns]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await campaignsAPI.create(form);
      setSuccessMessage('Campaign created!');
      setShowModal(false);
      fetchCampaigns();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Error creating campaign'); }
  };

  const handleSend = async (id) => {
    if (!confirm('Send this campaign to all targets now?')) return;
    try {
      const { data } = await campaignsAPI.send(id);
      setSuccessMessage(`Campaign sent to ${data.sent} recipients!`);
      fetchCampaigns();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) { alert(err.response?.data?.message || 'Error sending campaign'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await campaignsAPI.delete(id);
    fetchCampaigns();
  };

  const statusColor = (s) => ({
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">{successMessage}</div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Megaphone size={32} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-[#000a40] dark:text-white">Campaigns <span className="text-sm font-normal text-gray-500">({total})</span></h1>
        </div>
        <button onClick={() => { setForm({ title: '', type: 'sms', message: '', target_group: 'all', scheduled_at: '' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 py-2 rounded-lg font-medium shadow-sm">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      <div className="bg-white dark:bg-[#000a40] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Target</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Sent</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">Loading...</td></tr>
              ) : campaigns.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">No campaigns yet.</td></tr>
              ) : campaigns.map(c => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-3 font-medium text-[#000a40] dark:text-white">{c.title}</td>
                  <td className="px-6 py-3 uppercase text-xs text-gray-500">{c.type}</td>
                  <td className="px-6 py-3 text-gray-500 capitalize">{c.target_group}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor(c.status)}`}>{c.status}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{c.sent_count}</td>
                  <td className="px-6 py-3 flex gap-2">
                    {c.status === 'draft' && (
                      <button onClick={() => handleSend(c.id)} className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs font-medium">
                        <Send size={13} /> Send
                      </button>
                    )}
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0a113d] rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-[#000a40] dark:text-white">New Campaign</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <input required placeholder="Campaign title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none">
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
                <select value={form.target_group} onChange={e => setForm(p => ({...p, target_group: e.target.value}))}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none">
                  <option value="all">All clients</option>
                  <option value="active">Active clients</option>
                  <option value="expired">Expired clients</option>
                  <option value="leads">Leads</option>
                </select>
              </div>
              <textarea required placeholder="Message content" value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} rows={5}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-[#009DFF] hover:bg-[#0077cc] text-white font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

