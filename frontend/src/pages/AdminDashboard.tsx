import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  ArrowUpRight,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Globe,
  FileText,
  Landmark,
  Wallet,
  Building,
  Wrench,
  Database,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  CreditCard,
  FileDown
} from 'lucide-react';
import { exportStockAlertsPDF } from '../utils/stockAlertPdf';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard-stats');
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  const { today, monthly, overall, alerts, topSellingProducts, recentSales } = stats || {
    today: { totalSales: 0, salesCount: 0, cashReceived: 0, creditSales: 0, grossProfit: 0 },
    monthly: { sales: 0, purchases: 0, grossProfit: 0 },
    overall: { customerReceivables: 0, supplierPayables: 0, currentStockValue: 0, totalProducts: 0, totalCustomers: 0, pendingOrdersCount: 0 },
    alerts: { lowStockCount: 0, outOfStockCount: 0 },
    topSellingProducts: [],
    recentSales: []
  };

  return (
    <div>
      {/* Professional Executive Enterprise Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '16px 18px',
        marginBottom: '20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.4)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 240px' }}>
          <div style={{
            fontSize: '1.5rem',
            backgroundColor: '#d97706',
            color: '#fff',
            borderRadius: '12px',
            width: '46px',
            height: '46px',
            minWidth: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)'
          }}>
            🛢️
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc', lineHeight: 1.25 }}>
                Rafiq Auto & Oil Traders
              </h2>
              <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.68rem', padding: '2px 6px' }}>ADMIN</span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.3 }}>
              Executive Control Dashboard — Okara Central Terminal
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: 'auto' }}>
          <button
            onClick={fetchStats}
            className="btn btn-primary"
            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem' }}
          >
            ⚡ Refresh Live Data
          </button>
        </div>
      </div>

      {/* Title bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Executive Admin Control Center
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Consolidated live KPIs: Cash register, udhar balances, gross margins, and inventory valuation.
          </p>
        </div>
      </div>

      {/* TODAY'S KPI METRICS */}
      <div className="stat-grid">
        <div className="stat-card amber">
          <div className="stat-label">Today's Total Sales</div>
          <div className="stat-value">Rs. {Number(today?.totalSales || 0).toLocaleString()}</div>
          <div className="stat-sub">
            <TrendingUp size={14} color="#d97706" /> {today?.salesCount || 0} completed transactions
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-label">Cash Received Today</div>
          <div className="stat-value">Rs. {Number(today?.cashReceived || 0).toLocaleString()}</div>
          <div className="stat-sub">
            <DollarSign size={14} color="#059669" /> POS counter & field collections
          </div>
        </div>

        <div className="stat-card crimson">
          <div className="stat-label">Today's Credit Sales (Udhar)</div>
          <div className="stat-value">Rs. {Number(today?.creditSales || 0).toLocaleString()}</div>
          <div className="stat-sub">
            Added to customer outstanding ledgers
          </div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Today's Gross Profit</div>
          <div className="stat-value">Rs. {Number(today?.grossProfit || 0).toLocaleString()}</div>
          <div className="stat-sub">
            <ArrowUpRight size={14} color="#2563eb" /> Sale Margin (Revenue - Cost)
          </div>
        </div>

        <div className="stat-card emerald" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">Today's Net Profit (خالص منافع)</div>
          <div className="stat-value" style={{ color: Number(today?.netProfit || 0) >= 0 ? '#059669' : '#dc2626' }}>
            Rs. {Number(today?.netProfit || 0).toLocaleString()}
          </div>
          <div className="stat-sub">
            After deducting Rs. {Number(today?.totalExpenses || 0).toLocaleString()} expenses
          </div>
        </div>
      </div>

      {/* BALANCE SHEET & ASSET VALUATION ROW */}
      <div className="stat-grid">
        <div className="stat-card purple">
          <div className="stat-label">Current Stock Valuation</div>
          <div className="stat-value">Rs. {Number(overall?.currentStockValue || 0).toLocaleString()}</div>
          <div className="stat-sub">
            <Layers size={14} color="#7c3aed" /> Across {overall?.totalProducts || 0} active catalog items
          </div>
        </div>

        <div className="stat-card crimson">
          <div className="stat-label">Total Customer Receivables</div>
          <div className="stat-value">Rs. {Number(overall?.customerReceivables || 0).toLocaleString()}</div>
          <div className="stat-sub">
            Owed by {overall?.totalCustomers || 0} registered shops/garages
          </div>
        </div>

        <div className="stat-card amber">
          <div className="stat-label">Total Supplier Payables</div>
          <div className="stat-value">Rs. {Number(overall?.supplierPayables || 0).toLocaleString()}</div>
          <div className="stat-sub">
            Pending disbursements to oil companies
          </div>
        </div>

        <div className="stat-card emerald">
          <div className="stat-label">Month-to-Date Net Profit</div>
          <div className="stat-value">Rs. {Number(monthly?.grossProfit || 0).toLocaleString()}</div>
          <div className="stat-sub">
            Total monthly sales: Rs. {Number(monthly?.sales || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* POS DASHBOARD NAVIGATION SECTIONS (Matching Mobile & Vyapar App Architecture) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Section 1: My Business */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              My Business
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Core Operations
            </span>
          </div>

          <div style={{ padding: '6px 0' }}>
            <Link to="/sales" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Sale Invoice / POS Counter</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Bill new walk-in or shop customer, instant receipts</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/purchases" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Purchase Bills (Inward Stock)</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Record refinery shipments, supplier invoices & rates</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/expenses" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Daily Expenses & Vouchers</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Shop tea, rent, electricity, freight & diesel expense</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/web-orders" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>My Online Store (Website Orders)</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Pending website orders & customer cart queue</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/reports" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Financial & Inventory Reports</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Day book, customer profitability & stock ledger</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>
          </div>
        </div>

        {/* Section 2: Cash & Bank */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cash & Bank
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Live Balances
            </span>
          </div>

          <div style={{ padding: '6px 0' }}>
            <Link to="/ledgers" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Landmark size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Bank Accounts & Transfer</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>MCB, HBL, Allied Bank & online transaction receipts</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/cashier" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Cash-In-Hand & Counter Drawer</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Rs. {Number(today?.cashReceived || 0).toLocaleString()} collected today</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/ledgers" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Cheques & Clearance Register</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Track post-dated & pending clearing cheques</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/customers" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Loan Accounts & Customer Udhar</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Active market receivables: Rs. {Number(overall?.customerReceivables || 0).toLocaleString()}</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>
          </div>
        </div>

        {/* Section 3: Important Utilities & Vault */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Important Utilities
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              System Tools
            </span>
          </div>

          <div style={{ padding: '6px 0' }}>
            <Link to="/utilities" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Sync & Share (Offline/Online)</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Sync salesmen orders, laptops and counter bills</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Manage Companies & Terminals</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Depot address, thermal printer & SMS gateways</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/utilities" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none', borderBottom: '1px solid #f8fafc' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Backup / Restore (Auto Cloud)</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>One-click SQL snapshot, restore and phone export</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>

            <Link to="/confidential-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', textDecoration: 'none' }} className="menu-item-hover">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>Confidential Brand Vault</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Secret blends, private formulas & raw materials</div>
                </div>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </Link>
          </div>
        </div>

      </div>

      {/* ONLINE WEB ORDERS BANNER */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#dbeafe',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}>
            🛒
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem' }}>
              Website Online Order Queue
            </div>
            <div style={{ fontSize: '0.82rem', color: '#3b82f6' }}>
              Public website visitors submit orders here. Review orders, verify customer phone, and click Confirm to deduct stock and generate invoices.
            </div>
          </div>
        </div>
        <a href="/web-orders" className="btn btn-primary btn-sm" style={{ backgroundColor: '#2563eb', border: 'none' }}>
          Open Orders Queue →
        </a>
      </div>

      {/* CRITICAL STOCK ALERTS */}
      {(alerts?.lowStockCount > 0 || alerts?.outOfStockCount > 0) && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(217, 119, 6, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1.02rem' }}>
                  Critical Minimum Stock & Reorder Alerts (کم اسٹاک کی الرٹ لسٹ)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#b45309' }}>
                  <b>{alerts?.outOfStockCount || 0}</b> items completely out of stock; <b>{alerts?.lowStockCount || 0}</b> items below minimum safety threshold.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => exportStockAlertsPDF([
                  ...(alerts?.outOfStockProducts || []),
                  ...(alerts?.lowStockProducts || [])
                ], 'ADMIN CRITICAL REORDER ALERTS')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                title="Download / Print PDF of Minimum Stock Items"
              >
                <FileDown size={14} /> Download PDF
              </button>
              <Link to="/purchases" className="btn btn-primary btn-sm" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', fontWeight: 700 }}>
                + Record Purchase Inward
              </Link>
              <Link to="/products" className="btn btn-outline btn-sm" style={{ fontWeight: 700 }}>
                Manage Stock in Products →
              </Link>
            </div>
          </div>

          {/* Quick list of low stock items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
            {(alerts?.outOfStockProducts || []).map((p: any) => {
              const conv = Number(p.conversionFactor) || 1;
              const hasPkg = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
              const pSym = p.primaryUnit?.symbol || 'Ctn';
              const sSym = p.unit?.symbol || 'Pcs';
              const min = Number(p.minimumStockLevel || 0);
              const minCtn = Math.floor(min / conv);
              const minLoose = min % conv;
              const minDisplay = hasPkg
                ? (minCtn > 0 ? `${minCtn} ${pSym}${minLoose > 0 ? ` + ${minLoose} ${sSym}` : ''} (${min} ${sSym})` : `${min} ${sSym}`)
                : `${min} ${sSym}`;

              return (
                <div key={p.id} style={{
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                      SKU: {p.sku} | Min Alert: {minDisplay}
                    </div>
                  </div>
                  <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                    0 OUT OF STOCK
                  </span>
                </div>
              );
            })}
            {(alerts?.lowStockProducts || []).map((p: any) => {
              const conv = Number(p.conversionFactor) || 1;
              const hasPkg = (!!p.primaryUnit || !!p.primaryUnitId) && conv > 1;
              const pSym = p.primaryUnit?.symbol || 'Ctn';
              const sSym = p.unit?.symbol || 'Pcs';
              const stock = Number(p.currentStock || 0);
              const min = Number(p.minimumStockLevel || 0);
              const stockCtn = Math.floor(stock / conv);
              const stockLoose = stock % conv;
              const minCtn = Math.floor(min / conv);
              const minLoose = min % conv;

              const stockDisplay = hasPkg
                ? `${stockCtn} ${pSym}${stockLoose > 0 ? ` + ${stockLoose} ${sSym}` : ''}`
                : `${stock} ${sSym}`;
              const minDisplay = hasPkg
                ? (minCtn > 0 ? `${minCtn} ${pSym}${minLoose > 0 ? ` + ${minLoose} ${sSym}` : ''} (${min} ${sSym})` : `${min} ${sSym}`)
                : `${min} ${sSym}`;

              return (
                <div key={p.id} style={{
                  backgroundColor: '#fff1f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      SKU: {p.sku} | Min Alert: <b>{minDisplay}</b>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', padding: '3px 8px', borderRadius: '4px', fontSize: '0.76rem', fontWeight: 800, display: 'inline-block' }}>
                      ⚠️ {stockDisplay} left
                    </span>
                    {hasPkg && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                        Total: {stock} {sSym}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LOWER DATA GRIDS: TOP SELLING & RECENT SALES */}
      <div className="dashboard-split-grid">
        {/* Top Selling Products */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <TrendingUp size={18} color="#d97706" /> Top Selling Engine Oils
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>By volume sold</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Qty Sold</th>
                  <th style={{ textAlign: 'right' }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {topSellingProducts && topSellingProducts.length > 0 ? (
                  topSellingProducts.map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="font-mono" style={{ fontSize: '0.8rem' }}>{p.sku}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.quantitySold}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                        Rs. {Number(p.profit).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      No sales recorded yet. Start billing via POS!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Recent Sales */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} color="#2563eb" /> Live Sale Transactions
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Latest 8 invoices</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer / Shop</th>
                  <th style={{ textAlign: 'right' }}>Net Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales && recentSales.length > 0 ? (
                  recentSales.map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-mono" style={{ fontWeight: 700, color: '#d97706' }}>
                        {s.invoiceNumber}
                      </td>
                      <td>{s.customer?.shopName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        Rs. {Number(s.netAmount).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${s.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      No recent sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
