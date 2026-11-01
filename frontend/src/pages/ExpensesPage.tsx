import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  DollarSign, Plus, Trash2, Calendar, Tag, Filter,
  TrendingDown, FileText, CheckCircle, AlertCircle, RefreshCw, Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  date: string;
  createdBy?: { fullName: string };
}

interface ExpenseSummary {
  totalExpense: number;
  count: number;
  byCategory: { category: string; _sum: { amount: number }; _count: number }[];
}

const CATEGORIES = [
  'RENT',
  'ELECTRICITY_UTILITIES',
  'TEA_REFRESHMENT',
  'FUEL_CONVEYANCE',
  'SALARIES_WAGES',
  'MAINTENANCE_REPAIR',
  'STATIONERY_OFFICE',
  'DELIVERY_FREIGHT',
  'GENERATOR_MAINTENANCE',
  'PACKAGING_LABELS',
  'COMMUNICATION_INTERNET',
  'MARKETING_PROMOTION',
  'BANK_CHARGES',
  'ENTERTAINMENT_FOOD',
  'OTHER'
];

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Shop & Godown Rent (دکان و گودام کرایہ)',
  ELECTRICITY_UTILITIES: 'Electricity & Utilities (بجلی و واپڈا بل)',
  TEA_REFRESHMENT: 'Tea & Staff Refreshment (چائے و ریفریشمنٹ)',
  FUEL_CONVEYANCE: 'Fuel & Delivery Conveyance (پٹرول و گاڑی خرچ)',
  SALARIES_WAGES: 'Salaries & Helper Wages (تنخواہیں و دیہاڑی)',
  MAINTENANCE_REPAIR: 'Maintenance & Repairs (مرمت و مینٹیننس)',
  STATIONERY_OFFICE: 'Printing & Stationery (پرنٹنگ و کھاتہ رجسٹر)',
  DELIVERY_FREIGHT: 'Delivery Van Freight & Cargo (بلٹی و فریٹ)',
  GENERATOR_MAINTENANCE: 'Generator Fuel & Mobil Oil (جنریٹر فیول و آئل)',
  PACKAGING_LABELS: 'Packaging Bags & Tape (پیکنگ میٹریل)',
  COMMUNICATION_INTERNET: 'Mobile Load & Internet (انٹرنیٹ و فون خرچ)',
  MARKETING_PROMOTION: 'Marketing & Dealer Schemes (اشتہار و پروموشن)',
  BANK_CHARGES: 'Bank Charges & Taxes (بینک چارجز و ٹیکس)',
  ENTERTAINMENT_FOOD: 'Guest Meals & Hospitality (مہمان نوازی و کھانا)',
  OTHER: 'General / Other Misc Expense (متفرق اخراجات)'
};

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canDeleteExpense = isAdmin || Boolean(user?.permissions?.includes('action:delete_expense'));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  // Form
  const [form, setForm] = useState({
    category: 'TEA_REFRESHMENT',
    amount: '',
    description: '',
    paymentMethod: 'CASH',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;

      const [listRes, sumRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/expenses/summary')
      ]);

      const expenseList = Array.isArray(listRes.data) 
        ? listRes.data 
        : (listRes.data?.data || listRes.data?.expenses || []);
      
      setExpenses(expenseList);
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setOperationError('Expense amount 0 se barhi raqam honi chahiye.');
      return;
    }

    try {
      await api.post('/expenses', {
        category: form.category,
        amount: Number(form.amount),
        description: form.description || '',
        paymentMethod: form.paymentMethod || 'CASH',
        expenseDate: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
      });

      setShowAddModal(false);
      setForm({
        category: 'TEA_REFRESHMENT',
        amount: '',
        description: '',
        paymentMethod: 'CASH',
        date: new Date().toISOString().split('T')[0]
      });
      setOperationSuccess('Expense voucher kamiyabi se darj ho gaya!');
      setOperationError('');
      fetchExpenses();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || err.response?.data?.error || 'Failed to record expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense voucher?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      setOperationSuccess('Expense voucher permanently delete ho gaya.');
      setOperationError('');
      fetchExpenses();
    } catch (err: any) {
      setOperationError(err.response?.data?.error || 'Failed to delete expense');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Daily Business Expenses & Cash Outflow
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Record shop overheads, generator fuel, tea, wages, and utilities to maintain an accurate cashbook.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchExpenses}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Expense Voucher
          </button>
        </div>
      </div>

      {/* Operation Feedback Alerts */}
      {operationError && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}>
            <AlertCircle size={22} color="#dc2626" />
            <span>⚠️ Operation Nakaam Raha: {operationError}</span>
          </div>
          <button onClick={() => setOperationError('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      {operationSuccess && (
        <div style={{
          backgroundColor: '#dcfce7',
          border: '1.5px solid #86efac',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700 }}>
            <CheckCircle size={20} color="#16a34a" />
            <span>✓ {operationSuccess}</span>
          </div>
          <button onClick={() => setOperationSuccess('')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#15803d' }}>×</button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Expenses Recorded
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>
              Rs. {Number(summary.totalExpense).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
              {summary.count} Vouchers Entered
            </div>
          </div>

          {summary.byCategory.slice(0, 3).map(cat => (
            <div key={cat.category} className="card" style={{ padding: '20px', borderLeft: '4px solid #d97706' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[cat.category] || cat.category}
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                Rs. {Number(cat._sum.amount || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {cat._count} entries
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
          <Filter size={16} /> Filter by Category:
        </div>

        <button
          onClick={() => setSelectedCategory('')}
          className={`badge ${selectedCategory === '' ? 'badge-primary' : 'badge-neutral'}`}
          style={{ cursor: 'pointer', padding: '6px 14px', borderRadius: '20px', border: 'none' }}
        >
          All Categories
        </button>

        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`badge ${selectedCategory === cat ? 'badge-primary' : 'badge-neutral'}`}
            style={{ cursor: 'pointer', padding: '6px 14px', borderRadius: '20px', border: 'none' }}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', margin: 0 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description / Memo</th>
              <th>Payment Mode</th>
              <th>Recorded By</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No expenses recorded matching the selected filter.
                </td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600, color: '#475569' }}>
                    {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                  </td>
                  <td style={{ color: '#1e293b', fontWeight: 500 }}>
                    {exp.description || '—'}
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {exp.createdBy?.fullName || 'System Admin'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                    Rs. {Number(exp.amount).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {canDeleteExpense ? (
                      <button
                        onClick={() => handleDelete(exp.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal - Premium Voucher Slip Template */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Voucher Header Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #d97706'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
                }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    Payment & Expense Voucher
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                    Rafiq Auto & Oil Traders &bull; Official Petty Cash Record
                  </p>
                </div>
              </div>

              <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.7rem' }}>
                CASH OUTFLOW
              </span>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '24px' }}>
              {/* Category Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Expense Head / Category (مد خرچ) *
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#f8fafc',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount with Big Display */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Voucher Amount (رقم خرچ) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 800,
                    color: '#64748b',
                    fontSize: '0.95rem'
                  }}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 48px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              {/* Payment Mode and Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Disbursement Mode (طریقہ ادائیگی)
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="CASH">💵 Counter Cash Drawer</option>
                    <option value="BANK">🏛️ Bank Account Transfer</option>
                    <option value="EASYPAISA">📱 JazzCash / Easypaisa</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Voucher Date (تاریخ)
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Remarks / Narrative */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Description / Paid To / Remarks (تفصیل و وصول کنندہ)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g. Paid to Tariq helper for unloading oil drums, 10L petrol for van..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ✓ Record & Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
