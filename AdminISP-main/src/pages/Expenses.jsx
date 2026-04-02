import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, Plus, Search, Trash2, Pencil, X } from 'lucide-react';
import { expensesAPI } from '../services/api';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({ title: '', category: '', amount: '', notes: '', expense_date: '' });

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await expensesAPI.list({ search: search || undefined });
      setExpenses(data.data || []);
      setTotal(data.total || 0);
      setTotalAmount(data.total_amount || 0);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchExpenses, 300);
    return () => clearTimeout(t);
  }, [fetchExpenses]);

  const openCreate = () => {
    setEditingExpense(null);
    setForm({ title: '', category: '', amount: '', notes: '', expense_date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (exp) => {
    setEditingExpense(exp);
    setForm({ title: exp.title, category: exp.category || '', amount: String(exp.amount), notes: exp.notes || '', expense_date: exp.expense_date?.split('T')[0] || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, form);
        setSuccessMessage('Expense updated!');
      } else {
        await expensesAPI.create(form);
        setSuccessMessage('Expense recorded!');
      }
      setShowModal(false);
      fetchExpenses();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { alert(err.response?.data?.message || 'Error saving expense'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await expensesAPI.delete(id);
    fetchExpenses();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">{successMessage}</div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Banknote size={32} className="text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-[#000a40] dark:text-white">Expenses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{total} records · Total: KES {totalAmount.toLocaleString()}</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#009DFF] hover:bg-[#0077cc] text-white px-4 py-2 rounded-lg font-medium shadow-sm">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="bg-white dark:bg-[#000a40] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009DFF]/30 dark:text-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Category</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400">No expenses found.</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-3 font-medium text-[#000a40] dark:text-white">{exp.title}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{exp.category || '—'}</td>
                  <td className="px-6 py-3 text-green-600 dark:text-green-400 font-semibold">KES {parseFloat(exp.amount).toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{exp.expense_date?.split('T')[0]}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <button onClick={() => openEdit(exp)} className="text-blue-500 hover:text-blue-700"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-bold text-[#000a40] dark:text-white">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <input placeholder="Category (e.g. Salaries, Hardware)" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <input required type="number" min="1" step="0.01" placeholder="Amount (KES)" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <input type="date" value={form.expense_date} onChange={e => setForm(p => ({...p, expense_date: e.target.value}))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={3}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm dark:bg-[#000a40] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-[#009DFF] hover:bg-[#0077cc] text-white font-medium">{editingExpense ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

