import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  ShieldAlert,
  Droplet,
  Trash2,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileText,
  AlertTriangle,
  Building2,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { exportWarrantyClaimsPDF } from '../utils/pdfExportUtils';

export const WarrantyClaimsPage: React.FC = () => {
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [claimsSummary, setClaimsSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Dump Modal State
  const [selectedClaimForDump, setSelectedClaimForDump] = useState<any>(null);
  const [dumpLitersInput, setDumpLitersInput] = useState<string>('');

  // Dump Voucher Receipt Modal State
  const [viewVoucherModal, setViewVoucherModal] = useState<any>(null);

  // General Action Modal (e.g. Sent to Company, Scrap Loss)
  const [actionModalClaim, setActionModalClaim] = useState<any>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  const loadClaims = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/sales/claims');
      if (res.data?.success) {
        setClaimsList(res.data.claims || []);
        setClaimsSummary(res.data.summary || null);
      }
    } catch (e: any) {
      console.error('Failed to load claims:', e);
      setErrorMsg(e.response?.data?.message || 'Failed to load warranty claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleClaimDisposition = async (claimId: string, action: string, dumpLiters?: number, notes?: string) => {
    try {
      setProcessingAction(true);
      const res = await api.post(`/sales/claims/${claimId}/disposition`, {
        action,
        dumpLiters,
        dispositionNotes: notes,
      });
      if (res.data?.success) {
        triggerSuccess(res.data.message || 'Claim disposition updated successfully!');
        if (res.data.dumpVoucher) {
          setViewVoucherModal(res.data.dumpVoucher);
        }
        loadClaims();
        setSelectedClaimForDump(null);
        setActionModalClaim(null);
        setActionNotes('');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data?.message || 'Failed to update claim disposition');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredClaims = useMemo(() => {
    return claimsList.filter((c) => {
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'IN_QUARANTINE' && c.claimStatus !== 'IN_QUARANTINE') return false;
        if (filterStatus === 'SENT_TO_COMPANY' && c.claimStatus !== 'SENT_TO_COMPANY') return false;
        if (filterStatus === 'RESOLVED' && !['RESOLVED_REPLACED', 'RESOLVED_RESTOCKED'].includes(c.claimStatus)) return false;
        if (filterStatus === 'DUMPED_IN_DRUM' && c.claimStatus !== 'DUMPED_IN_DRUM') return false;
        if (filterStatus === 'SCRAPPED_LOSS' && c.claimStatus !== 'SCRAPPED_LOSS') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesShop = c.customer?.shopName?.toLowerCase().includes(q);
        const matchesReturn = c.returnNumber?.toLowerCase().includes(q);
        const matchesInv = c.originalInvoice?.toLowerCase().includes(q);
        const matchesProduct = c.items?.some((it: any) => it.productName?.toLowerCase().includes(q));
        if (!matchesShop && !matchesReturn && !matchesInv && !matchesProduct) return false;
      }
      return true;
    });
  }, [claimsList, filterStatus, search]);

  const handleExportPDF = () => {
    exportWarrantyClaimsPDF(filteredClaims, filterStatus === 'ALL' ? 'All Claims' : `Status: ${filterStatus}`);
  };

  const quarantinedCount = claimsList.filter((c) => c.claimStatus === 'IN_QUARANTINE').length;
  const sentCount = claimsList.filter((c) => c.claimStatus === 'SENT_TO_COMPANY').length;
  const replacedCount = claimsList.filter((c) => ['RESOLVED_REPLACED', 'RESOLVED_RESTOCKED'].includes(c.claimStatus)).length;
  const dumpedCount = claimsList.filter((c) => c.claimStatus === 'DUMPED_IN_DRUM').length;
  const scrapCount = claimsList.filter((c) => c.claimStatus === 'SCRAPPED_LOSS').length;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '10px 0 40px 0' }}>
      {/* Alert Notifications */}
      {successMsg && (
        <div style={{
          backgroundColor: '#dcfce7',
          color: '#15803d',
          border: '1px solid #bbf7d0',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700
        }}>
          <AlertTriangle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#ede9fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7c3aed',
            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.2)'
          }}>
            <ShieldAlert size={30} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Warranty Claims & Defective Store
              <span className="urdu-text" style={{ fontSize: '1.1rem', color: '#7c3aed', fontWeight: 700 }}>
                (وارنٹی کلیمز اور نقص شدہ مال کا اسٹور)
              </span>
            </h1>
            <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '3px 0 0 0' }}>
              Management of defective returns, quarantine store, company replacements, and reclaimed oil dumping
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadClaims}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} />
            Download Claims PDF
          </button>

          <a
            href="/sales"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
          >
            <RotateCcw size={16} />
            Log Return in Sales Register
          </a>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Total Claims */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #7c3aed', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Warranty Claims
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#7c3aed', marginTop: '6px' }}>
            {claimsSummary?.totalClaims ?? claimsList.length}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px' }}>
            Total claimed cases recorded
          </div>
        </div>

        {/* Card 2: Quarantined */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #d97706', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>
            In Defective Quarantine
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#d97706', marginTop: '6px' }}>
            {claimsSummary?.quarantinedCount ?? quarantinedCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#b45309', marginTop: '4px' }}>
            Awaiting company action or disposal
          </div>
        </div>

        {/* Card 3: Replacement Loss */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #dc2626', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
            Replacement Loss Incurred
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#dc2626', marginTop: '6px' }}>
            Rs. {Number(claimsSummary?.totalClaimLoss || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#dc2626', marginTop: '4px' }}>
            Automatic profit deduction on free replacement
          </div>
        </div>

        {/* Card 4: Salvaged into Drum */}
        <div className="card" style={{ padding: '20px', borderRadius: '14px', borderLeft: '5px solid #059669', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
            Dumped in Loose Drum
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#059669', marginTop: '6px' }}>
            {dumpedCount}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: '4px' }}>
            Salvaged engine oil sent to Khula Oil Drum
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '16px', borderRadius: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
            Filter by Status:
          </span>
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`btn btn-sm ${filterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            📋 All Claims ({claimsList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('IN_QUARANTINE')}
            className={`btn btn-sm ${filterStatus === 'IN_QUARANTINE' ? 'btn-warning' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px', backgroundColor: filterStatus === 'IN_QUARANTINE' ? '#d97706' : undefined, color: filterStatus === 'IN_QUARANTINE' ? '#ffffff' : undefined }}
          >
            ⚠️ In Quarantine ({quarantinedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('SENT_TO_COMPANY')}
            className={`btn btn-sm ${filterStatus === 'SENT_TO_COMPANY' ? 'btn-info' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            🏢 Sent to Company ({sentCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('RESOLVED')}
            className={`btn btn-sm ${filterStatus === 'RESOLVED' ? 'btn-success' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            ✅ Company Replaced ({replacedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DUMPED_IN_DRUM')}
            className={`btn btn-sm ${filterStatus === 'DUMPED_IN_DRUM' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            🛢️ Dumped in Drum ({dumpedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('SCRAPPED_LOSS')}
            className={`btn btn-sm ${filterStatus === 'SCRAPPED_LOSS' ? 'btn-danger' : 'btn-outline'}`}
            style={{ fontWeight: 700, borderRadius: '20px', padding: '5px 14px' }}
          >
            🗑️ Scrapped ({scrapCount})
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer shop name, claim #, original invoice #, or product name..."
            style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container" style={{ borderRadius: '14px', backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Claim # & Date</th>
              <th>Customer / Shop</th>
              <th>Original Invoice</th>
              <th>Claimed Item & Qty</th>
              <th>Category & Resolution</th>
              <th>Status</th>
              <th>Loss / Refund</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading warranty claims...
                </td>
              </tr>
            ) : filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No warranty claims found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredClaims.map((c) => {
                const isOil = c.claimCategory === 'OIL';
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="font-mono" style={{ fontWeight: 800, color: '#7c3aed' }}>
                        {c.returnNumber}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        {new Date(c.returnDate).toLocaleDateString()} {new Date(c.returnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customer?.shopName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{c.customer?.phone || c.customer?.ownerName}</div>
                    </td>

                    <td className="font-mono" style={{ fontSize: '0.84rem' }}>
                      {c.originalInvoice}
                    </td>

                    <td>
                      {c.items?.map((it: any, iIdx: number) => (
                        <div key={iIdx} style={{ fontSize: '0.82rem', marginBottom: '2px' }}>
                          <b>{it.productName}</b>
                          <span style={{ color: '#64748b', marginLeft: '4px' }}>
                            ({it.quantity} {it.unitSymbol})
                          </span>
                        </div>
                      ))}
                    </td>

                    <td>
                      <div>
                        {isOil ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            🛢️ Oil / Liquid
                          </span>
                        ) : (
                          <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            ⚙️ Non-Oil (Filter/Parts)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                        {c.resolution === 'REPLACEMENT' ? '🔄 Free Replacement' : '💵 Cash/Ledger Refund'}
                      </div>
                    </td>

                    <td>
                      {c.claimStatus === 'IN_QUARANTINE' && (
                        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ⚠️ In Defective Store
                        </span>
                      )}
                      {c.claimStatus === 'SENT_TO_COMPANY' && (
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          🏢 Sent to Company
                        </span>
                      )}
                      {['RESOLVED_REPLACED', 'RESOLVED_RESTOCKED'].includes(c.claimStatus) && (
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ✅ Company Replaced
                        </span>
                      )}
                      {c.claimStatus === 'DUMPED_IN_DRUM' && (
                        <span style={{ backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          🛢️ Dumped in Drum
                        </span>
                      )}
                      {c.claimStatus === 'SCRAPPED_LOSS' && (
                        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                          🗑️ Scrapped Loss
                        </span>
                      )}
                    </td>

                    <td>
                      {c.lossAmount > 0 ? (
                        <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.85rem' }}>
                          - Rs. {Number(c.lossAmount).toLocaleString()}
                          <div style={{ fontSize: '0.7rem', color: '#dc2626' }}>Replacement Loss</div>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>
                          Rs. {Number(c.totalRefund || 0).toLocaleString()}
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Refund Value</div>
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {c.claimStatus === 'IN_QUARANTINE' && (
                          <>
                            {isOil ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClaimForDump(c);
                                  const totalLitres = c.items?.reduce((sum: number, it: any) => sum + (Number(it.quantity) * Number(it.conversionFactor || 1)), 0);
                                  setDumpLitersInput(String(totalLitres || ''));
                                }}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: '#ede9fe',
                                  color: '#6d28d9',
                                  border: '1px solid #ddd6fe',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  padding: '4px 8px'
                                }}
                              >
                                🛢️ Dump in Loose Drum
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActionModalClaim(c);
                                  setActionType('SENT_TO_COMPANY');
                                }}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  padding: '4px 8px'
                                }}
                              >
                                🏢 Send to Company
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActionModalClaim(c);
                                setActionType('SCRAP_LOSS');
                              }}
                              className="btn btn-sm btn-outline-danger"
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              🗑️ Scrap Loss
                            </button>
                          </>
                        )}

                        {c.claimStatus === 'SENT_TO_COMPANY' && (
                          <button
                            type="button"
                            onClick={() => handleClaimDisposition(c.id, 'COMPANY_REPLACED')}
                            className="btn btn-sm btn-success"
                            style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px' }}
                          >
                            ✅ Company Replaced (Restore Stock)
                          </button>
                        )}

                        {(c.claimStatus === 'DUMPED_IN_DRUM' || c.dumpVoucher) && (
                          <button
                            type="button"
                            onClick={() => {
                              const voucher = c.dumpVoucher || {
                                voucherNumber: `ROT-DRM-${c.returnNumber}`,
                                voucherDate: c.returnDate,
                                returnNumber: c.returnNumber,
                                originalInvoice: c.originalInvoice,
                                customerShop: c.customer?.shopName || 'Shop Customer',
                                customerOwner: c.customer?.ownerName,
                                customerPhone: c.customer?.phone,
                                customerArea: c.customer?.area,
                                litersDumped: c.items?.reduce((s: number, it: any) => s + (Number(it.quantity) * Number(it.conversionFactor || 1)), 0) || 0,
                                salvagedProducts: c.items,
                                notes: c.notes || 'Salvaged claimed engine oil into Reclaimed Drum',
                                operatorName: 'Admin / Store Incharge',
                              };
                              setViewVoucherModal(voucher);
                            }}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#ede9fe',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '4px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            📄 View Voucher (ڈرم رسید)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DUMP IN LOOSE OIL DRUM MODAL */}
      {selectedClaimForDump && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplet size={22} color="#d97706" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Dump Claimed Oil into Drum
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaimForDump(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '14px' }}>
              Yeh claimed engine oil <b>Reclaimed Loose Oil Drum (ڈرم کا کھلا آئل)</b> me shamil kar diya jaye ga aur POS screen par sab se upar frokht ke liye mojood hoga.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                Liters to Dump into Drum (کتنے لیٹر ڈرم میں ڈالے؟):
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  value={dumpLitersInput}
                  onChange={(e) => setDumpLitersInput(e.target.value)}
                  placeholder="e.g. 4.0"
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                  autoFocus
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>
                  Ltr
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedClaimForDump(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ltrs = parseFloat(dumpLitersInput) || undefined;
                  handleClaimDisposition(selectedClaimForDump.id, 'DUMP_IN_DRUM', ltrs);
                }}
                className="btn btn-warning"
                style={{
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  borderColor: '#b45309',
                  fontWeight: 800
                }}
              >
                🛢️ Confirm Dump in Drum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPOSITION ACTION MODAL */}
      {actionModalClaim && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {actionType === 'SENT_TO_COMPANY' ? '🏢 Send Defective Stock to Company' : '🗑️ Scrap Defective Stock as Loss'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModalClaim(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
              {actionType === 'SENT_TO_COMPANY'
                ? 'Vendor / Company ko warranty replacement ya repair ke liye dispatch karne ke details darj karein.'
                : 'Yeh defective stock mukammal zaya / scrap kar diya jaye ga aur quarantine store se nikaal diya jaye ga.'}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                Notes / Dispatch Details (تفصیل / رسید نمبر):
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Sent via courier to Atlas Honda workshop, Gate pass #102..."
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setActionModalClaim(null)}
                className="btn btn-secondary"
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={() => handleClaimDisposition(actionModalClaim.id, actionType, undefined, actionNotes)}
                className={`btn ${actionType === 'SENT_TO_COMPANY' ? 'btn-primary' : 'btn-danger'}`}
                style={{ fontWeight: 800 }}
              >
                {processingAction ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🛢️ RECLAIMED DRUM INWARD VOUCHER / INVOICE MODAL */}
      {viewVoucherModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '2px solid #cbd5e1'
          }}>
            {/* Printable Voucher Section */}
            <div id="reclaimed-drum-voucher-print">
              {/* Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #0f172a', paddingBottom: '12px', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  RAFIQ AUTO & OIL TRADERS
                </h2>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706' }}>
                  رفیق آٹو اینڈ آئل ٹریڈرز — اوکاڑہ
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  54-Stop Near MCB Bank, Dipalpur Road, Okara | Tel: 0306-9258573
                </div>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  marginTop: '6px'
                }}>
                  🛢️ LOOSE OIL DRUM INWARD VOUCHER (ڈرم انورڈ رسید)
                </div>
              </div>

              {/* Meta details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', marginBottom: '12px', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Voucher #: </span>
                  <b className="font-mono" style={{ color: '#0f172a' }}>{viewVoucherModal.voucherNumber}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Date: </span>
                  <b>{new Date(viewVoucherModal.voucherDate).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Claim/Return #: </span>
                  <b className="font-mono">{viewVoucherModal.returnNumber}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Original Bill: </span>
                  <b className="font-mono">{viewVoucherModal.originalInvoice}</b>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b' }}>Customer Shop: </span>
                  <b style={{ color: '#0f172a' }}>{viewVoucherModal.customerShop}</b>
                  {viewVoucherModal.customerPhone ? ` (${viewVoucherModal.customerPhone})` : ''}
                </div>
              </div>

              {/* Salvaged Items List */}
              {viewVoucherModal.salvagedProducts && viewVoucherModal.salvagedProducts.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                    📦 Claimed Stock Details:
                  </div>
                  <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>Item Name</th>
                        <th style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>Claim Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewVoucherModal.salvagedProducts.map((p: any, pIdx: number) => (
                        <tr key={pIdx}>
                          <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{p.name || p.productName}</td>
                          <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700 }}>
                            {p.quantity} {p.unitSymbol || 'Pcs'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Drum Transfer Metric Highlight */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #93c5fd',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e40af' }}>
                    🛢️ Oil Inward to Reclaimed Drum:
                  </span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1d4ed8' }}>
                    {viewVoucherModal.litersDumped} Liters
                  </span>
                </div>
                {viewVoucherModal.previousStock !== undefined && viewVoucherModal.newStock !== undefined && (
                  <div style={{ fontSize: '0.75rem', color: '#1e3a8a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Previous Drum Stock: <b>{Number(viewVoucherModal.previousStock).toFixed(1)} Ltr</b></span>
                    <span>New Drum Stock: <b>{Number(viewVoucherModal.newStock).toFixed(1)} Ltr</b></span>
                  </div>
                )}
                {viewVoucherModal.drumRate > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #bfdbfe', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Salvage Rate: Rs. {viewVoucherModal.drumRate} / Ltr</span>
                    <span>Total Salvage Value: <b>Rs. {Number(viewVoucherModal.salvageValue || (viewVoucherModal.litersDumped * viewVoucherModal.drumRate)).toLocaleString()}</b></span>
                  </div>
                )}
              </div>

              {/* Remarks */}
              {viewVoucherModal.notes && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '14px', fontStyle: 'italic' }}>
                  Note: {viewVoucherModal.notes}
                </div>
              )}

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.74rem', color: '#64748b' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ minWidth: '120px', borderBottom: '1px solid #94a3b8', height: '24px' }}></div>
                  <span style={{ marginTop: '4px', display: 'block', fontWeight: 700 }}>Store Incharge / Operator</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ minWidth: '120px', borderBottom: '1px solid #94a3b8', height: '24px' }}></div>
                  <span style={{ marginTop: '4px', display: 'block', fontWeight: 700 }}>Dump Verified Stamp</span>
                </div>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }} className="no-print">
              <button
                type="button"
                onClick={() => setViewVoucherModal(null)}
                className="btn btn-secondary"
              >
                Close (بند کریں)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{
                  backgroundColor: '#7c3aed',
                  borderColor: '#6d28d9',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🖨️ Print Voucher (پرنٹ رسید)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
