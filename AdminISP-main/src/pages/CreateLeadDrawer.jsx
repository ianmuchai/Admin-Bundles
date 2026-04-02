import React, { useState } from 'react';
import { X } from 'lucide-react';
import { leadsAPI } from '../services/api';

const CreateLeadDrawer = ({ isOpen, onClose, onLeadCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    position: ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await leadsAPI.create(formData);
      setFormData({ name: '', email: '', phone: '', address: '', company: '', position: '' });
      if (onLeadCreated) onLeadCreated();
      else onClose();
    } catch (err) {
      alert(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zeta-dark shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-300 dark:border-gray-800 bg-white dark:bg-zeta-dark">
          <h2 className="text-xl font-bold text-[#000a40] dark:text-white">Create New Lead</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Company Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Company
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Acme Inc."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Position Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Manager"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Address Field */}
            <div>
              <label className="block text-sm font-medium text-[#000a40] dark:text-gray-300 mb-1.5">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Business St, City, State 12345"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-white/5 text-[#000a40] dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-600 transition-all text-sm resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-[#000a40] dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-[#4dabf7] hover:bg-blue-500 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? "Creating..." : "Create Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateLeadDrawer;
