import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search, X } from 'lucide-react';
import { messagesAPI, clientsAPI } from '../services/api';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ client_id: '', recipient: '', body: '' });

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await messagesAPI.list({ search: search || undefined });
      setMessages(data.data || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchMessages, 300);
    return () => clearTimeout(t);
  }, [fetchMessages]);

  const openModal = async () => {
    try {
      const { data } = await clientsAPI.list({ limit: 200 });
      setClients(data.data || []);
    } catch (e) { /* ignore */ }
    setForm({ client_id: '', recipient: '', body: '' });
    setShowModal(true);
  };

  const handleClientSelect = (id) => {
    const c = clients.find(x => String(x.id) === String(id));
    setForm(p => ({ ...p, client_id: id, recipient: c ? c.phone : '' }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await messagesAPI.send(form);
      setSuccessMessage('Message sent!');
      setShowModal(false);
      fetchMessages();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Error sending message'); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">{successMessage}</div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={32} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-[#000a40] dark:text-white">Messages <span className="text-sm font-normal text-gray-500">({total})</span></h1>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 py-2 rounded-lg font-medium shadow-sm">
          <Send size={16} /> Send Message
        </button>
      </div>

      <div className="bg-white dark:bg-[#000a40] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Recipient</th>
                <th className="px-6 py-3 text-left">Message</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-16 text-gray-400">Loading...</td></tr>
              ) : messages.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16 text-gray-400">No messages found.</td></tr>
              ) : messages.map(msg => (
                <tr key={msg.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-3 font-medium text-[#000a40] dark:text-white">{msg.recipient}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{msg.body}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${msg.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{msg.status}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</td>
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
              <h2 className="text-lg font-bold text-[#000a40] dark:text-white">Send SMS</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <select value={form.client_id} onChange={e => handleClientSelect(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Select client (optional) —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.phone})</option>)}
              </select>
              <input required placeholder="Phone number" value={form.recipient} onChange={e => setForm(p => ({...p, recipient: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <textarea required placeholder="Message body" value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} rows={4}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-[#009DFF] hover:bg-[#0077cc] text-white font-medium flex items-center gap-2"><Send size={14} /> Send</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

