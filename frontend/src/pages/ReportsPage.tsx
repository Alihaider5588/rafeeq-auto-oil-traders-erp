import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  TrendingUp, DollarSign, BarChart3, PieChart, Download, 
  Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, 
  Package, Users, ShieldAlert, CheckCircle2, Lightbulb, RefreshCw, Layers
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // AI Prediction & Growth Engine state (100% Real DB Data)
  const [aiData, setAiData] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'AI_GROWTH' | 'PL'>('AI_GROWTH');
  // Filter periods: 'TODAY' | 'THIS_MONTH' | 'OCTOBER' | 'NOVEMBER' | 'YEARLY' | 'CUSTOM'
  const [filterPeriod, setFilterPeriod] = useState<string>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  useEffect(() => {
    fetchReport();
  }, [filterPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    fetchAiInsights();
  }, []);

  const calculateDateRange = () => {
    const now = new Date();
    let start = '';
    let end = '';

    if (filterPeriod === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      start = `${todayStr}T00:00:00.000Z`;
      end = `${todayStr}T23:59:59.999Z`;
    } else if (filterPeriod === 'THIS_MONTH') {
      const y = now.getFullYear();
      const m = now.getMonth();
      start = new Date(y, m, 1).toISOString();
      end = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString();
    } else if (filterPeriod === 'OCTOBER') {
      const y = now.getFullYear();
      start = new Date(y, 9, 1).toISOString(); // Oct is month index 9
      end = new Date(y, 10, 0, 23, 59, 59, 999).toISOString();
    } else if (filterPeriod === 'NOVEMBER') {
      const y = now.getFullYear();
      start = new Date(y, 10, 1).toISOString(); // Nov is month index 10
      end = new Date(y, 11, 0, 23, 59, 59, 999).toISOString();
    } else if (filterPeriod === 'YEARLY') {
      const y = now.getFullYear();
      start = new Date(y, 0, 1).toISOString();
      end = new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
    } else if (filterPeriod === 'CUSTOM') {
      if (customStartDate) start = `${customStartDate}T00:00:00.000Z`;
      if (customEndDate) end = `${customEndDate}T23:59:59.999Z`;
    }

    return { start, end };
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { start, end } = calculateDateRange();
      const params: any = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const res = await api.get('/reports/profit-loss', { params });
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async () => {
    try {
      setLoadingAi(true);
      const res = await api.get('/reports/ai-insights');
      if (res.data?.success) {
        setAiData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(false);
    }
  };

  const { summary, categoryProfits, productProfits } = report || {};

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Financial Reports & AI Business Growth
            </h1>
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
              <Sparkles size={12} /> 100% Real Ledger Data
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Accurate profit/loss statements, AI run-rate sales predictions, stockout warnings, and revenue expansion tips.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => { fetchReport(); fetchAiInsights(); }} 
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading || loadingAi ? 'spin' : ''} /> Refresh Live Data
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
            Print Report Sheet
          </button>
        </div>
      </div>

      {/* Tabs Switcher: AI Growth Predictions vs Profit & Loss */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('AI_GROWTH')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'AI_GROWTH' ? '#fffbeb' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'AI_GROWTH' ? '3px solid #d97706' : '3px solid transparent',
            color: activeTab === 'AI_GROWTH' ? '#d97706' : '#64748b',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Sparkles size={18} /> AI Sales Forecast & Business Growth Tips
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PL')}
          style={{
            padding: '12px 20px',
            background: activeTab === 'PL' ? '#eff6ff' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PL' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'PL' ? '#2563eb' : '#64748b',
            borderRadius: '8px 8px 0 0',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <BarChart3 size={18} /> Profit & Loss Statement (Real COGS)
        </button>
      </div>

      {/* TAB 1: AI PREDICTIONS & BUSINESS GROWTH TIPS */}
      {activeTab === 'AI_GROWTH' && (
        <div>
          {loadingAi ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <RefreshCw size={32} className="spin" style={{ color: '#d97706', marginBottom: '14px' }} />
              <h3 style={{ margin: 0, fontWeight: 700 }}>Analyzing Real Ledger Data...</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                Computing product velocities, debtor aging, margin health, and forward run-rate.
              </p>
            </div>
          ) : !aiData ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No prediction metrics available yet. Make sales to populate live AI model.
            </div>
          ) : (
            <div>
              {/* AI Prediction Cards Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                borderRadius: '16px',
                padding: '24px 28px',
                color: '#fff',
                marginBottom: '24px',
                border: '1px solid #312e81',
                boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        FORWARD 30-DAY PREDICTIVE RUN-RATE
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#a5b4fc' }}>
                        Confidence: {aiData.forecast.confidenceLevel}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fef08a' }}>
                      Next Month Projected Sales & Net Earnings
                    </h2>
                  </div>

                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}>
                    MoM Trajectory: <b>{aiData.metrics.growthRateMoM >= 0 ? `+${aiData.metrics.growthRateMoM}% Expansion` : `${aiData.metrics.growthRateMoM}% Contraction`}</b>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Predicted Next 30-Day Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: '6px' }}>
                      Rs. {aiData.forecast.predictedNextMonthRevenue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                      Based on current daily run-rate of Rs. {aiData.metrics.dailyAverageSales.toLocaleString()}/day
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projected Net Gross Return</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '6px' }}>
                      Rs. {aiData.forecast.predictedNextMonthProfit.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                      Expected profit velocity: Rs. {aiData.metrics.dailyAverageProfit.toLocaleString()}/day
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Past 30 Days Real Sales</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginTop: '6px' }}>
                      Rs. {aiData.metrics.recent30DaysRevenue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                      Actual gross profit: Rs. {aiData.metrics.recent30DaysGrossProfit.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Market Credit Stagnation</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f87171', marginTop: '6px' }}>
                      Rs. {Math.round(aiData.metrics.totalMarketReceivables).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>
                      Capital locked in customer accounts
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Business Growth Tips */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Lightbulb size={20} color="#d97706" />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Real-Data AI Business Growth Recommendations
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {aiData.actionableTips.map((tip: any, idx: number) => (
                    <div key={idx} className="card" style={{
                      margin: 0,
                      borderLeft: tip.category === 'REVENUE' ? '4px solid #10b981' :
                                  tip.category === 'CASH_FLOW' ? '4px solid #ef4444' :
                                  tip.category === 'INVENTORY' ? '4px solid #f59e0b' : '4px solid #3b82f6',
                      padding: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className={`badge ${
                          tip.category === 'REVENUE' ? 'badge-success' :
                          tip.category === 'CASH_FLOW' ? 'badge-danger' :
                          tip.category === 'INVENTORY' ? 'badge-warning' : 'badge-info'
                        }`} style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                          {tip.category}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                          Impact: {tip.impact}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        {tip.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                        {tip.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid: Stock Run-Out Prediction & Top Market Debtors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                
                {/* Product Inventory Velocity & Stockout Risk */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                        Product Stockout Risk & Velocity
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                        Calculated by real 30-day consumption burn rate.
                      </p>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>Top 15 Items</span>
                  </div>

                  <table className="table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Current Stock</th>
                        <th style={{ textAlign: 'center' }}>Monthly Burn</th>
                        <th style={{ textAlign: 'center' }}>Days Left</th>
                        <th>Status / Reorder Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiData.stockPredictions.map((sp: any) => (
                        <tr key={sp.productId}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{sp.productName}</div>
                            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>{sp.sku}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{sp.currentStock}</td>
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{sp.monthlyBurnRate}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              color: sp.urgency === 'CRITICAL' ? '#ef4444' :
                                     sp.urgency === 'WARNING' ? '#f59e0b' :
                                     sp.urgency === 'DEAD_STOCK' ? '#64748b' : '#10b981'
                            }}>
                              {sp.estimatedDaysLeft >= 365 ? '365+ d' : `${sp.estimatedDaysLeft} d`}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              sp.urgency === 'CRITICAL' ? 'badge-danger' :
                              sp.urgency === 'WARNING' ? 'badge-warning' :
                              sp.urgency === 'DEAD_STOCK' ? 'badge-neutral' : 'badge-success'
                            }`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                              {sp.urgency}
                            </span>
                            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '3px', maxWidth: '240px' }}>
                              {sp.recommendation}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Top Debtors for Working Capital Recovery */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                      Highest Outstanding Debtors (Recovery Queue)
                    </h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      Top priority accounts to collect for instant liquidity.
                    </p>
                  </div>

                  <table className="table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Customer / Shop</th>
                        <th style={{ textAlign: 'right' }}>Receivable Balance</th>
                        <th>WhatsApp Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiData.overdueDebtors.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                            No outstanding debtors found.
                          </td>
                        </tr>
                      ) : (
                        aiData.overdueDebtors.map((d: any) => {
                          const waText = encodeURIComponent(
                            `Assalam-o-Alaikum ${d.shopName}! Rafiq Auto & Oil Traders Okara ki taraf se apka ledger balance Rs.${d.balance.toLocaleString()} baqaya hai. Baraye meherbani jald adayeigi farma dain. Shukriya!`
                          );
                          const waLink = `https://wa.me/${d.phone.replace(/[^0-9]/g, '')}?text=${waText}`;

                          return (
                            <tr key={d.id}>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{d.shopName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.ownerName} &bull; {d.phone}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>
                                Rs. {d.balance.toLocaleString()}
                              </td>
                              <td>
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem', color: '#059669', borderColor: '#a7f3d0', textDecoration: 'none', display: 'inline-block' }}
                                >
                                  Remind
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STANDARD PROFIT & LOSS BREAKDOWN */}
      {activeTab === 'PL' && (
        <div>
          {/* Period Selector Bar: Today, Monthly, October, November, Yearly, Custom Date to Date */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: '6px' }}>
                Filter Period:
              </span>
              {[
                { id: 'TODAY', label: 'Today (آج)' },
                { id: 'THIS_MONTH', label: 'This Month (موجودہ مہینہ)' },
                { id: 'OCTOBER', label: 'October (اکتوبر)' },
                { id: 'NOVEMBER', label: 'November (نومبر)' },
                { id: 'YEARLY', label: 'Annual / Yearly (سالانہ)' },
                { id: 'CUSTOM', label: 'Custom Date Range (تاریخ تا تاریخ)' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterPeriod(p.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: filterPeriod === p.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: filterPeriod === p.id ? '#eff6ff' : '#ffffff',
                    color: filterPeriod === p.id ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs when CUSTOM is selected */}
            {filterPeriod === 'CUSTOM' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>From:</span>
                  <input
                    type="date"
                    className="form-control"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>To:</span>
                  <input
                    type="date"
                    className="form-control"
                    style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary KPI Cards with Net Profit after Expenses Deducted */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <div className="stat-card blue">
              <div className="stat-label">Total Sales Revenue</div>
              <div className="stat-value">Rs. {Number(summary?.totalRevenue || 0).toLocaleString()}</div>
              <div className="stat-sub">From completed sales invoices</div>
            </div>

            <div className="stat-card crimson">
              <div className="stat-label">Cost of Goods Sold (COGS)</div>
              <div className="stat-value">Rs. {Number(summary?.totalCost || 0).toLocaleString()}</div>
              <div className="stat-sub">Inward purchase inventory cost</div>
            </div>

            <div className="stat-card amber">
              <div className="stat-label">Gross Business Profit</div>
              <div className="stat-value">Rs. {Number(summary?.totalGrossProfit || 0).toLocaleString()}</div>
              <div className="stat-sub">Sales minus item purchase cost</div>
            </div>

            <div className="stat-card red" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="stat-label" style={{ color: '#dc2626' }}>Total Expenses (اخراجات)</div>
              <div className="stat-value" style={{ color: '#dc2626' }}>Rs. {Number(summary?.totalExpenses || 0).toLocaleString()}</div>
              <div className="stat-sub">Deducted from business profit</div>
            </div>

            <div className="stat-card emerald" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
              <div className="stat-label" style={{ color: '#047857', fontWeight: 800 }}>Net Clear Profit (خالص منافع)</div>
              <div className="stat-value" style={{ color: Number(summary?.netProfit || 0) >= 0 ? '#059669' : '#dc2626', fontSize: '1.75rem', fontWeight: 900 }}>
                Rs. {Number(summary?.netProfit || 0).toLocaleString()}
              </div>
              <div className="stat-sub" style={{ color: '#047857', fontWeight: 700 }}>
                Gross Profit minus Total Expenses ({summary?.netProfitMargin || 0}%)
              </div>
            </div>
          </div>

          {/* CUSTOMER ANALYTICS & PROFITABILITY (NEW) */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Users size={20} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Customer Profitability & Purchase Volume Analytics
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {/* Top Purchasing Customers by Sales Volume */}
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title" style={{ fontSize: '0.98rem' }}>
                    <TrendingUp size={16} color="#059669" /> Top Purchasing Customers (By Volume)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Highest Total Purchases</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer / Shop</th>
                        <th style={{ textAlign: 'center' }}>Invoices</th>
                        <th style={{ textAlign: 'right' }}>Total Bought</th>
                        <th style={{ textAlign: 'right' }}>Profit Given</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report?.customerAnalytics?.topPurchasing && report.customerAnalytics.topPurchasing.length > 0 ? (
                        report.customerAnalytics.topPurchasing.map((c: any, idx: number) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.shopName}</div>
                              {c.ownerName && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.ownerName} &bull; {c.phone}</div>}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{c.purchaseCount}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              Rs. {Number(c.totalPurchased).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                              Rs. {Number(c.totalProfit).toLocaleString()}
                              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{c.margin}% margin</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No customer purchases yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Profitable vs Lowest Profitable Customers */}
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title" style={{ fontSize: '0.98rem' }}>
                    <DollarSign size={16} color="#d97706" /> Highest & Lowest Profit Customers
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Margin Contribution</span>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer / Shop</th>
                        <th style={{ textAlign: 'right' }}>Total Profit</th>
                        <th style={{ textAlign: 'center' }}>Margin %</th>
                        <th>Classification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report?.customerAnalytics?.topProfitable && report.customerAnalytics.topProfitable.length > 0 ? (
                        report.customerAnalytics.topProfitable.map((c: any, idx: number) => {
                          const isHigh = c.totalProfit > 5000;
                          return (
                            <tr key={idx}>
                              <td>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.shopName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Bought Rs. {Number(c.totalPurchased).toLocaleString()}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: c.totalProfit >= 0 ? '#059669' : '#ef4444' }}>
                                Rs. {Number(c.totalProfit).toLocaleString()}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.margin}%</td>
                              <td>
                                <span className={`badge ${isHigh ? 'badge-success' : c.totalProfit < 0 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                                  {isHigh ? 'High Yield' : c.totalProfit < 0 ? 'Loss Maker' : 'Regular'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* LOSS-MAKING PRODUCTS WARNING BANNER & TABLE (NEW) */}
          {report?.lossMakingProducts && report.lossMakingProducts.length > 0 && (
            <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' }}>
              <div className="card-header">
                <h4 className="card-title" style={{ color: '#991b1b', fontSize: '1.05rem' }}>
                  <AlertCircle size={18} color="#ef4444" /> Loss-Making Products Detected ({report.lossMakingProducts.length})
                </h4>
                <span className="badge badge-danger">CRITICAL PRICING ISSUE</span>
              </div>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#b91c1c' }}>
                These products were sold below inward purchase cost (Unit Cost &gt; Sale Price). Increase their retail rate or review inward purchase bills immediately.
              </p>
              <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '8px' }}>
                <table className="data-table">
                  <thead>
                    <tr style={{ backgroundColor: '#fee2e2' }}>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'right' }}>Inward Cost</th>
                      <th style={{ textAlign: 'right' }}>Loss Incurred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lossMakingProducts.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: '#991b1b' }}>{p.name}</td>
                        <td className="font-mono" style={{ fontSize: '0.8rem' }}>{p.sku}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.qty}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {Number(p.revenue).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>Rs. {Number(p.cost).toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>
                          - Rs. {Math.abs(Number(p.profit)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
            {/* Category-wise Breakdown */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <PieChart size={18} color="#d97706" /> Profit by Category
                </h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'right' }}>Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryProfits && categoryProfits.length > 0 ? (
                      categoryProfits.map((c: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(c.revenue).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                            Rs. {Number(c.profit).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          No data available yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Profit Analysis (Profitable & Loss Ranked) */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <BarChart3 size={18} color="#2563eb" /> Product-wise Profit & Velocity
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ranked by net earnings</span>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th style={{ textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                      <th style={{ textAlign: 'right' }}>Cost</th>
                      <th style={{ textAlign: 'right' }}>Gross Profit</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productProfits && productProfits.length > 0 ? (
                      productProfits.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td className="font-mono" style={{ fontSize: '0.8rem' }}>{p.sku}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.qty}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(p.revenue).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>Rs. {Number(p.cost).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: p.profit >= 0 ? '#059669' : '#ef4444', fontWeight: 800 }}>
                            {p.profit < 0 ? '-' : ''}Rs. {Math.abs(Number(p.profit)).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${p.profit > 0 ? 'badge-success' : p.profit === 0 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                              {p.profit > 0 ? 'Profitable' : p.profit === 0 ? 'Break-even' : 'Loss'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          No sales yet to compute profit analysis
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PER-INVOICE / BILL PROFIT STATEMENT (NEW) */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <DollarSign size={18} color="#059669" /> Bill-wise Profit Breakdown (Per Invoice Margin)
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest 30 bills with individual gross margin</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer / Shop</th>
                    <th style={{ textAlign: 'right' }}>Bill Net (Rs.)</th>
                    <th style={{ textAlign: 'right' }}>COGS / Cost (Rs.)</th>
                    <th style={{ textAlign: 'right' }}>Gross Profit (Rs.)</th>
                    <th style={{ textAlign: 'center' }}>Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.invoiceProfits && report.invoiceProfits.length > 0 ? (
                    report.invoiceProfits.map((inv: any) => (
                      <tr key={inv.id}>
                        <td className="font-mono" style={{ fontWeight: 800, color: '#d97706' }}>{inv.invoiceNumber}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(inv.date).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ fontWeight: 600 }}>{inv.customerName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          Rs. {Number(inv.netAmount).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          Rs. {Number(inv.totalCost).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: inv.grossProfit >= 0 ? '#059669' : '#ef4444' }}>
                          {inv.grossProfit < 0 ? '-' : ''}Rs. {Math.abs(Number(inv.grossProfit)).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${inv.grossProfit > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                            {inv.profitMargin}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                        No bill records found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
