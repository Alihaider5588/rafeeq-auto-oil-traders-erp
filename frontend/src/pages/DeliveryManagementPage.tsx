import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Vehicle, DailyDelivery, Product, User, RouteSchedule } from '../types';
import {
  Truck,
  Plus,
  Calendar,
  FileText,
  Printer,
  Trash2,
  Edit2,
  CheckCircle,
  MapPin,
  Clock,
  Package,
  AlertCircle,
  UserCheck,
  Shield,
  Phone,
  RefreshCw,
  Search
} from 'lucide-react';
import { SearchableProductSelect } from '../components/SearchableProductSelect';

const DAYS_OF_WEEK = [
  { key: 'MONDAY', label: 'Monday (پیر)' },
  { key: 'TUESDAY', label: 'Tuesday (منگل)' },
  { key: 'WEDNESDAY', label: 'Wednesday (بدھ)' },
  { key: 'THURSDAY', label: 'Thursday (جمعرات)' },
  { key: 'FRIDAY', label: 'Friday (جمعہ)' },
  { key: 'SATURDAY', label: 'Saturday (ہفتہ)' },
  { key: 'SUNDAY', label: 'Sunday (اتوار)' },
] as const;

import { useAuth } from '../context/AuthContext';

export const DeliveryManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const hasCustomPerms = Boolean(user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0);
  const canEditDelivery = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:edit_delivery')) : user?.role === 'OPERATOR');
  const canDeleteDelivery = isAdmin || (hasCustomPerms ? Boolean(user?.permissions?.includes('action:delete_delivery')) : false);
  const [activeTab, setActiveTab] = useState<'DISPATCHES' | 'WEEKLY_SCHEDULES' | 'VEHICLES'>('DISPATCHES');
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');

  const [deliveries, setDeliveries] = useState<DailyDelivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [schedules, setSchedules] = useState<RouteSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDispatches, setSearchDispatches] = useState('');
  const [searchVehicles, setSearchVehicles] = useState('');

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyDelivery | null>(null);
  const [reconData, setReconData] = useState<any>(null);
  const [loadingRecon, setLoadingRecon] = useState<boolean>(false);

  const handleOpenReconciliation = async (del: DailyDelivery) => {
    setSelectedReport(del);
    setReconData(null);
    setLoadingRecon(true);
    try {
      const res = await api.get(`/logistics/reconciliation/${del.id}`);
      if (res.data?.success && res.data.reconciliation) {
        setReconData(res.data.reconciliation);
      }
    } catch (e) {
      console.error('Failed to load dynamic reconciliation', e);
    } finally {
      setLoadingRecon(false);
    }
  };

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<RouteSchedule | null>(null);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [supplyManName, setSupplyManName] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');

  const [schedVehicleId, setSchedVehicleId] = useState('');
  const [schedDay, setSchedDay] = useState<string>('MONDAY');
  const [schedRouteName, setSchedRouteName] = useState('');
  const [schedTargetAreas, setSchedTargetAreas] = useState('');
  const [schedDriverOverride, setSchedDriverOverride] = useState('');
  const [schedNotes, setSchedNotes] = useState('');

  const [dispatchVehicleId, setDispatchVehicleId] = useState('');
  const [dispatchRouteArea, setDispatchRouteArea] = useState('');
  const [dispatchSalesmanId, setDispatchSalesmanId] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [paymentReceived, setPaymentReceived] = useState<number | string>(0);
  const [creditAmount, setCreditAmount] = useState<number | string>(0);
  const [returnedGoods, setReturnedGoods] = useState<number | string>(0);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchItems, setDispatchItems] = useState<Array<{
    productId: string;
    quantity: number | string;
    unitPrice: number | string;
    isAdditional: boolean;
    notes: string;
  }>>([{ productId: '', quantity: 1, unitPrice: 0, isAdditional: false, notes: '' }]);

  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadDeliveries(),
        loadVehicles(),
        loadSchedules(),
        loadMeta()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    try {
      const params: any = {};
      if (filterVehicleId) params.vehicleId = filterVehicleId;
      if (filterDate) params.date = filterDate;
      const res = await api.get('/logistics/deliveries', { params });
      setDeliveries(res.data.deliveries || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await api.get('/logistics/vehicles');
      setVehicles(res.data.vehicles || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSchedules = async () => {
    try {
      const res = await api.get('/logistics/route-schedules');
      setSchedules(res.data.schedules || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMeta = async () => {
    try {
      const now = Date.now();
      const CACHE_TTL = 15 * 60 * 1000;
      let cachedProds: any[] | null = null;
      const cachedProdStr = sessionStorage.getItem('rot_cached_products');
      if (cachedProdStr) {
        try {
          const parsed = JSON.parse(cachedProdStr);
          if (now - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
            cachedProds = parsed.data;
            setProducts(parsed.data);
          }
        } catch (e) {}
      }

      const [pRes, uRes] = await Promise.all([
        cachedProds ? Promise.resolve(null) : api.get('/products'),
        api.get('/auth/users'),
      ]);
      if (pRes?.data?.data) {
        setProducts(pRes.data.data);
        try {
          sessionStorage.setItem('rot_cached_products', JSON.stringify({ data: pRes.data.data, timestamp: now }));
        } catch (e) {}
      }
      setSalesmen((uRes.data.users || []).filter((u: any) => u.role === 'SALESMAN'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatchVehicleChange = (vId: string) => {
    setDispatchVehicleId(vId);
    if (!vId) return;

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDay = days[new Date().getDay()];

    const matchedSchedule = schedules.find(
      (s) => s.vehicleId === vId && s.dayOfWeek === currentDay && s.isActive
    );

    if (matchedSchedule) {
      setDispatchRouteArea(`${matchedSchedule.routeName}${matchedSchedule.targetAreas ? ' (' + matchedSchedule.targetAreas + ')' : ''}`);
    } else {
      const anySched = schedules.find((s) => s.vehicleId === vId);
      if (anySched) {
        setDispatchRouteArea(anySched.routeName);
      }
    }
  };

  const openNewVehicleModal = () => {
    if (!canEditDelivery) {
      alert('Aapke pas vehicle register karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    setEditingVehicle(null);
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setSupplyManName('');
    setVehicleNotes('');
    setShowVehicleModal(true);
  };

  const openEditVehicleModal = (v: Vehicle) => {
    if (!canEditDelivery) {
      alert('Aapke pas vehicle edit karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    setEditingVehicle(v);
    setVehicleNumber(v.vehicleNumber);
    setDriverName(v.driverName);
    setDriverPhone(v.driverPhone);
    setSupplyManName(v.supplyManName);
    setVehicleNotes(v.notes || '');
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        vehicleNumber,
        driverName,
        driverPhone,
        supplyManName,
        notes: vehicleNotes,
      };

      if (editingVehicle) {
        await api.put(`/logistics/vehicles/${editingVehicle.id}`, payload);
      } else {
        await api.post('/logistics/vehicles', payload);
      }

      setShowVehicleModal(false);
      setOperationSuccess(editingVehicle ? `Vehicle ${vehicleNumber} updated successfully!` : `Vehicle ${vehicleNumber} registered successfully!`);
      loadVehicles();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to save vehicle');
    }
  };

  const handleDeleteVehicle = async (id: string, number: string) => {
    if (!canDeleteDelivery) {
      alert('Aapke pas delivery vehicle delete karne ki ijazat nahi hai (No Delete Permission).');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove delivery vehicle '${number}'? All attached schedules will also be removed.`)) {
      return;
    }
    try {
      await api.delete(`/logistics/vehicles/${id}`);
      setOperationSuccess(`Vehicle ${number} was deleted successfully.`);
      loadVehicles();
      loadSchedules();
    } catch (err: any) {
      setOperationError(err.response?.data?.message || 'Failed to delete vehicle');
    }
  };

  const openNewScheduleModal = (prefillVehicleId?: string, prefillDay?: string) => {
    if (!canEditDelivery) {
      alert('Aapke pas route schedule add karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    setEditingSchedule(null);
    setSchedVehicleId(prefillVehicleId || (vehicles[0]?.id || ''));
    setSchedDay(prefillDay || 'MONDAY');
    setSchedRouteName('');
    setSchedTargetAreas('');
    setSchedDriverOverride('');
    setSchedNotes('');
    setShowScheduleModal(true);
  };

  const openEditScheduleModal = (s: RouteSchedule) => {
    if (!canEditDelivery) {
      alert('Aapke pas route schedule edit karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    setEditingSchedule(s);
    setSchedVehicleId(s.vehicleId);
    setSchedDay(s.dayOfWeek);
    setSchedRouteName(s.routeName);
    setSchedTargetAreas(s.targetAreas || '');
    setSchedDriverOverride(s.driverName || '');
    setSchedNotes(s.notes || '');
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditDelivery) {
      alert('Aapke pas schedule save karne ki ijazat nahi hai.');
      return;
    }
    try {
      const payload = {
        vehicleId: schedVehicleId,
        dayOfWeek: schedDay,
        routeName: schedRouteName,
        targetAreas: schedTargetAreas,
        driverName: schedDriverOverride || undefined,
        notes: schedNotes,
        isActive: true,
      };

      await api.post('/logistics/route-schedules', payload);
      setShowScheduleModal(false);
      loadSchedules();
      loadVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save route schedule');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!canDeleteDelivery) {
      alert('Aapke pas route schedule delete karne ki ijazat nahi hai.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this weekly route assignment?')) return;
    try {
      await api.delete(`/logistics/route-schedules/${id}`);
      loadSchedules();
      loadVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete route schedule');
    }
  };

  const openNewDispatchModal = () => {
    if (!canEditDelivery) {
      alert('Aapke pas new dispatch create karne ki ijazat nahi hai (No Edit Permission).');
      return;
    }
    const firstVehicle = vehicles[0]?.id || '';
    setDispatchVehicleId(firstVehicle);
    handleDispatchVehicleChange(firstVehicle);
    setDispatchSalesmanId(salesmen[0]?.id || '');
    setTotalCustomers(0);
    setPaymentReceived(0);
    setCreditAmount(0);
    setReturnedGoods(0);
    setDispatchNotes('');
    setDispatchItems([
      { productId: '', quantity: 1, unitPrice: 0, isAdditional: false, notes: '' },
    ]);
    setShowDispatchModal(true);
  };

  const addDispatchItemRow = (isAdditional = false) => {
    setDispatchItems([
      ...dispatchItems,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        isAdditional,
        notes: isAdditional ? 'Extra stock on van' : '',
      },
    ]);
  };

  const updateDispatchItem = (index: number, field: string, value: any) => {
    const updated = [...dispatchItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === value);
      updated[index].productId = value;
      if (prod) updated[index].unitPrice = Number(prod.salePrice);
    } else {
      (updated[index] as any)[field] = value;
    }
    setDispatchItems(updated);
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchVehicleId) {
      alert('Please select a delivery vehicle');
      return;
    }

    const validItems = dispatchItems.filter((it) => it.productId);
    if (validItems.length === 0) {
      alert('Please add at least one product loaded onto the van');
      return;
    }

    try {
      const payload = {
        vehicleId: dispatchVehicleId,
        routeArea: dispatchRouteArea || 'Standard Route',
        salesmanId: dispatchSalesmanId || undefined,
        totalCustomers: Number(totalCustomers),
        paymentReceived: Number(paymentReceived),
        creditAmount: Number(creditAmount),
        returnedGoods: Number(returnedGoods),
        notes: dispatchNotes,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          isAdditional: Boolean(it.isAdditional),
          notes: it.notes,
        })),
      };

      const res = await api.post('/logistics/deliveries', payload);
      if (res.data.success) {
        setShowDispatchModal(false);
        loadDeliveries();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save delivery dispatch');
    }
  };

  const handleDeleteDelivery = async (id: string, deliveryNum: string) => {
    if (!canDeleteDelivery) {
      alert('Aapke pas dispatch delete karne ki ijazat nahi hai (No Delete Permission).');
      return;
    }
    if (!window.confirm(`Are you sure you want to cancel and delete dispatch run #${deliveryNum}?`)) {
      return;
    }
    try {
      await api.delete(`/logistics/deliveries/${id}`);
      loadDeliveries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete delivery');
    }
  };

  const regularItemsTotal = dispatchItems
    .filter((it) => !it.isAdditional && it.productId)
    .reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const additionalItemsTotal = dispatchItems
    .filter((it) => it.isAdditional && it.productId)
    .reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const grandDispatchTotal = regularItemsTotal + additionalItemsTotal;

  const filteredDeliveries = deliveries.filter((del) => {
    if (!searchDispatches.trim()) return true;
    const q = searchDispatches.toLowerCase();
    return (
      del.deliveryNumber?.toLowerCase().includes(q) ||
      del.routeArea?.toLowerCase().includes(q) ||
      del.vehicle?.vehicleNumber?.toLowerCase().includes(q) ||
      del.vehicle?.driverName?.toLowerCase().includes(q) ||
      del.vehicle?.supplyManName?.toLowerCase().includes(q)
    );
  });

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchVehicles.trim()) return true;
    const q = searchVehicles.toLowerCase();
    return (
      v.vehicleNumber?.toLowerCase().includes(q) ||
      v.driverName?.toLowerCase().includes(q) ||
      v.supplyManName?.toLowerCase().includes(q) ||
      v.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <Truck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Van Delivery & Route Management
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Weekly recurring van schedules (e.g. Monday Okara, Tuesday Renala), dispatch items, and extra load tracking
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadAllData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Delivery & Schedule Data"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {canEditDelivery && (
            <>
              <button
                type="button"
                onClick={openNewDispatchModal}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
              >
                <Plus size={18} /> New Daily Van Dispatch
              </button>
              <button
                type="button"
                onClick={openNewVehicleModal}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <Truck size={16} /> + Add Delivery Van & Driver
              </button>
            </>
          )}
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

      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        gap: '8px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('DISPATCHES')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'DISPATCHES' ? '#fffbeb' : 'transparent',
            fontWeight: 800,
            fontSize: '0.92rem',
            color: activeTab === 'DISPATCHES' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'DISPATCHES' ? '3px solid #d97706' : '3px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Package size={18} /> Daily Dispatch & Evening Sheets ({deliveries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WEEKLY_SCHEDULES')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'WEEKLY_SCHEDULES' ? '#fffbeb' : 'transparent',
            fontWeight: 800,
            fontSize: '0.92rem',
            color: activeTab === 'WEEKLY_SCHEDULES' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'WEEKLY_SCHEDULES' ? '3px solid #d97706' : '3px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Calendar size={18} /> Weekly Recurring Routes ({schedules.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('VEHICLES')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'VEHICLES' ? '#fffbeb' : 'transparent',
            fontWeight: 800,
            fontSize: '0.92rem',
            color: activeTab === 'VEHICLES' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'VEHICLES' ? '3px solid #d97706' : '3px solid transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={18} /> Vehicles & Drivers List ({vehicles.length})
        </button>
      </div>

      {activeTab === 'DISPATCHES' && (
        <div>
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '18px',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search dispatch #, route, driver, van..."
                className="form-control"
                style={{ paddingLeft: '32px', width: '100%', fontSize: '0.85rem' }}
                value={searchDispatches}
                onChange={(e) => setSearchDispatches(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Filter:</div>
            <select
              className="form-control"
              style={{ maxWidth: '200px' }}
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
            >
              <option value="">All Delivery Vans</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} ({v.driverName})
                </option>
              ))}
            </select>

            <input
              type="date"
              className="form-control"
              style={{ maxWidth: '160px' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />

            <button
              onClick={loadDeliveries}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dispatch #</th>
                  <th>Date</th>
                  <th>Van Number</th>
                  <th>Driver & Supply Man</th>
                  <th>Assigned Route</th>
                  <th style={{ textAlign: 'right' }}>Goods Dispatched</th>
                  <th style={{ textAlign: 'right' }}>Cash Collected</th>
                  <th style={{ textAlign: 'right' }}>Net Sales</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Loading van delivery runs...
                    </td>
                  </tr>
                ) : filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No daily delivery runs found matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((del) => {
                    const additionalItemsCount = (del.items || []).filter((it) => it.isAdditional).length;
                    return (
                      <tr key={del.id}>
                        <td className="font-mono" style={{ fontWeight: 800, color: '#d97706' }}>
                          {del.deliveryNumber}
                        </td>
                        <td>{new Date(del.date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 800 }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                            {del.vehicle?.vehicleNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{del.vehicle?.driverName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Supply: {del.vehicle?.supplyManName}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{del.routeArea}</span>
                          {additionalItemsCount > 0 && (
                            <span style={{
                              marginLeft: '6px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontWeight: 800
                            }}>
                              +{additionalItemsCount} Extra Items
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          Rs. {Number(del.totalDelivered).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 800 }}>
                          Rs. {Number(del.paymentReceived).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900 }}>
                          Rs. {Number(del.netSales).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenReconciliation(del)}
                              className="btn btn-primary btn-sm"
                              style={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#d97706', borderColor: '#b45309' }}
                              title="Raat Ka Hisab / Evening Return & Reconciliation"
                            >
                              <Clock size={13} /> 🌙 Raat Ka Hisab
                            </button>
                            {canDeleteDelivery && (
                              <button
                                onClick={() => handleDeleteDelivery(del.id, del.deliveryNumber)}
                                className="btn btn-outline btn-sm"
                                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                title="Delete Run"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {activeTab === 'WEEKLY_SCHEDULES' && (
        <div>
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={18} /> Owner's Repeating Weekly Van Route Planner
              </div>
              <div style={{ fontSize: '0.84rem', color: '#b45309', marginTop: '2px' }}>
                Aik martaba route entry kar dein (maslan Monday ko Okara, Tuesday ko Renala Khurd wagaira). Rozana dispatch par ye route automatically load ho ga. Aap jab chahein edit ya remove kar saktay hain.
              </div>
            </div>

            {canEditDelivery && (
              <button
                onClick={() => openNewScheduleModal()}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 800 }}
              >
                <Plus size={16} /> Assign New Weekly Route
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {vehicles.map((v) => {
              const vehicleSchedules = schedules.filter((s) => s.vehicleId === v.id);

              return (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '12px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>
                        🚐 {v.vehicleNumber}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Driver: <b>{v.driverName}</b> | Supply: <b>{v.supplyManName}</b>
                      </div>
                    </div>
                    {canEditDelivery && (
                      <button
                        onClick={() => openNewScheduleModal(v.id)}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        <Plus size={14} /> Add Day
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {DAYS_OF_WEEK.map((d) => {
                      const daySched = vehicleSchedules.find((s) => s.dayOfWeek === d.key);

                      return (
                        <div
                          key={d.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: daySched ? '#f8fafc' : '#fafafa',
                            border: daySched ? '1px solid #cbd5e1' : '1px dashed #e2e8f0',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: daySched ? '#0f172a' : '#94a3b8' }}>
                              {d.label}
                            </div>
                            {daySched ? (
                              <div style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 700, marginTop: '2px' }}>
                                📍 {daySched.routeName}
                                {daySched.targetAreas && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                                    ({daySched.targetAreas})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No fixed route assigned (Rest or Local)</div>
                            )}
                          </div>

                          <div>
                            {daySched ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {canEditDelivery && (
                                  <button
                                    onClick={() => openEditScheduleModal(daySched)}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 8px' }}
                                    title="Edit Day Route"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {canDeleteDelivery && (
                                  <button
                                    onClick={() => handleDeleteSchedule(daySched.id)}
                                    className="btn btn-outline btn-sm"
                                    style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                                    title="Remove Day Route"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              canEditDelivery && (
                                <button
                                  onClick={() => openNewScheduleModal(v.id, d.key)}
                                  style={{
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#0284c7',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  + Set Route
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'VEHICLES' && (
        <div>
          {/* Vehicles & Drivers Tab Action Banner */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1.5px solid #bae6fd',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="#0284c7" /> Register Delivery Van & Driver Fleet
              </div>
              <div style={{ fontSize: '0.84rem', color: '#0369a1', marginTop: '2px' }}>
                Van ka registration number (e.g. OKR-786-LHR), Driver ka naam, phone number, aur helper / supply man add karein.
              </div>
            </div>

            {canEditDelivery && (
              <button
                type="button"
                onClick={openNewVehicleModal}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  backgroundColor: '#0284c7',
                  borderColor: '#0284c7',
                  padding: '9px 18px',
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
                }}
              >
                <Plus size={18} /> + Add New Delivery Van & Driver
              </button>
            )}
          </div>

          <div style={{ marginBottom: '14px', position: 'relative', maxWidth: '360px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search vehicles, driver, phone, supply man..."
              className="form-control"
              style={{ paddingLeft: '32px', width: '100%', fontSize: '0.85rem' }}
              value={searchVehicles}
              onChange={(e) => setSearchVehicles(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Number</th>
                  <th>Assigned Driver</th>
                  <th>Driver Contact</th>
                  <th>Supply Man</th>
                  <th>Scheduled Route Days</th>
                  <th>Notes / Description</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        No delivery vehicles found matching search.
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
                        Field billing aur rozana orders deliver karne ke liye nayi van aur driver register karein.
                      </p>
                      {canEditDelivery && (
                        <button
                          type="button"
                          onClick={openNewVehicleModal}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
                        >
                          <Plus size={16} /> + Register New Delivery Van & Driver
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const countSchedules = (schedules || []).filter((s) => s.vehicleId === v.id).length;
                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 800, fontSize: '0.95rem' }}>{v.vehicleNumber}</td>
                        <td style={{ fontWeight: 700 }}>{v.driverName}</td>
                        <td>
                          <a href={`tel:${v.driverPhone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                            {v.driverPhone}
                          </a>
                        </td>
                        <td>{v.supplyManName}</td>
                        <td>
                          <span style={{
                            backgroundColor: countSchedules > 0 ? '#dcfce7' : '#fee2e2',
                            color: countSchedules > 0 ? '#15803d' : '#991b1b',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}>
                            {countSchedules} Days Assigned
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{v.notes || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canEditDelivery && (
                              <button
                                onClick={() => openEditVehicleModal(v)}
                                className="btn btn-outline btn-sm"
                                title="Edit Vehicle & Driver"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDeleteDelivery && (
                              <button
                                onClick={() => handleDeleteVehicle(v.id, v.vehicleNumber)}
                                className="btn btn-outline btn-sm"
                                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                title="Delete Vehicle"
                              >
                                <Trash2 size={14} />
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
        </div>
      )}

      {showVehicleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '20px', color: '#0f172a' }}>
              {editingVehicle ? 'Edit Delivery Vehicle & Driver' : 'Register New Delivery Van'}
            </h3>

            <form onSubmit={handleSaveVehicle}>
              <div className="form-group">
                <label className="form-label">Vehicle Registration Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. OKR-786-LHR, MN-54-A"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Driver Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Muhammad Ali"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Phone *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 03049988776"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Supply Man / Helper Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ahmed Raza"
                  value={supplyManName}
                  onChange={(e) => setSupplyManName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Vehicle Details</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Shehzore White Van #1, Local Okara Delivery Fleet"
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  {editingVehicle ? 'Update Vehicle' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '18px', color: '#0f172a' }}>
              {editingSchedule ? 'Edit Repeating Route Schedule' : 'Assign Repeating Day Route'}
            </h3>

            <form onSubmit={handleSaveSchedule}>
              <div className="form-group">
                <label className="form-label">Delivery Van *</label>
                <select
                  className="form-control"
                  value={schedVehicleId}
                  onChange={(e) => setSchedVehicleId(e.target.value)}
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.driverName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Day of Week (Din) *</label>
                <select
                  className="form-control"
                  value={schedDay}
                  onChange={(e) => setSchedDay(e.target.value)}
                  required
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Route / Sector Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Okara City Center, Renala Khurd, Dipalpur Road"
                  value={schedRouteName}
                  onChange={(e) => setSchedRouteName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Areas & Stops</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chowk Kumharanwala, GT Road workshops, Petrol pumps"
                  value={schedTargetAreas}
                  onChange={(e) => setSchedTargetAreas(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Driver Override (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Leave empty to use default vehicle driver"
                  value={schedDriverOverride}
                  onChange={(e) => setSchedDriverOverride(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Save Weekly Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDispatchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  New Daily Van Dispatch Sheet
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Orders & Additional Goods loaded into van for today's sector run
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="btn btn-outline btn-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Delivery Van *</label>
                  <select
                    className="form-control"
                    value={dispatchVehicleId}
                    onChange={(e) => handleDispatchVehicleChange(e.target.value)}
                    required
                  >
                    <option value="">Select Delivery Van</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} (Driver: {v.driverName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assigned Route / Sector *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Okara City Center, Renala Khurd"
                    value={dispatchRouteArea}
                    onChange={(e) => setDispatchRouteArea(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Field Salesman / Incharge</label>
                  <select
                    className="form-control"
                    value={dispatchSalesmanId}
                    onChange={(e) => setDispatchSalesmanId(e.target.value)}
                  >
                    <option value="">None / Self Dispatch</option>
                    {salesmen.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Est. Target Shops / Customers</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={totalCustomers}
                    onChange={(e) => setTotalCustomers(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '18px',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      Products Loaded Into Van (آج وین میں گیا سامان)
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Booked Orders aur Additional / Extra stock jo van mein rakha gaya
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => addDispatchItemRow(false)}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.78rem' }}
                    >
                      + Add Order Item
                    </button>
                    <button
                      type="button"
                      onClick={() => addDispatchItemRow(true)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.78rem', backgroundColor: '#d97706', borderColor: '#d97706' }}
                    >
                      + Add Additional Extra Stock
                    </button>
                  </div>
                </div>

                {dispatchItems.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr 1.2fr 1.5fr auto',
                      gap: '10px',
                      marginBottom: '10px',
                      alignItems: 'center',
                      backgroundColor: it.isAdditional ? '#fffbeb' : '#ffffff',
                      border: it.isAdditional ? '1px solid #fde68a' : '1px solid #e2e8f0',
                      padding: '10px',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <SearchableProductSelect
                        products={products}
                        value={it.productId}
                        onChange={(val) => updateDispatchItem(idx, 'productId', val)}
                        required
                        placeholder="Type to search oil / item..."
                      />
                      {it.isAdditional && (
                        <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 800 }}>
                          ★ Extra Stock (For On-Spot Counter Sale)
                        </span>
                      )}
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => updateDispatchItem(idx, 'quantity', e.target.value)}
                        required
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        placeholder="Rate (Rs.)"
                        value={it.unitPrice}
                        onChange={(e) => updateDispatchItem(idx, 'unitPrice', e.target.value)}
                        required
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Notes / Customer Name"
                        value={it.notes}
                        onChange={(e) => updateDispatchItem(idx, 'notes', e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => dispatchItems.length > 1 && setDispatchItems(dispatchItems.filter((_, i) => i !== idx))}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        title="Remove row"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '10px',
                  fontSize: '0.88rem'
                }}>
                  <div>
                    Regular Booked: <b>Rs. {regularItemsTotal.toLocaleString()}</b> | Additional Stock: <b style={{ color: '#d97706' }}>Rs. {additionalItemsTotal.toLocaleString()}</b>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    Total Van Load Value: Rs. {grandDispatchTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                marginBottom: '18px'
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#16a34a', fontWeight: 800 }}>Cash Collected (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-control"
                    value={paymentReceived}
                    onChange={(e) => setPaymentReceived(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#ea580c', fontWeight: 800 }}>Credit / Udhar (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-control"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#dc2626', fontWeight: 800 }}>Returned / Unsold (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-control"
                    value={returnedGoods}
                    onChange={(e) => setReturnedGoods(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Special promotion cartons added, returning by 6:00 PM"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Confirm & Save Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 120,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '780px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '28px'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#d97706" />
                <span>🌙 Van Daily Closing & Evening Reconciliation (شام کا حساب)</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => window.print()} className="btn btn-primary btn-sm" style={{ fontWeight: 800, backgroundColor: '#d97706', borderColor: '#b45309' }}>
                  <Printer size={16} /> Print Hisab Sheet
                </button>
                <button onClick={() => { setSelectedReport(null); setReconData(null); }} className="btn btn-outline btn-sm">
                  Close
                </button>
              </div>
            </div>

            {loadingRecon && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontWeight: 700 }}>
                Loading dynamic sales & van reconciliation hisab...
              </div>
            )}

            <div className="printable-area" style={{ border: '2px solid #0f172a', padding: '24px', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '6px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>RAFIQ AUTO & OIL TRADERS</h2>
                    <span style={{ fontSize: '1rem', color: '#d97706', fontWeight: 800 }}>رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  54-Stop Near MCB Bank, Dipalpur Road, Okara | 0306-9258573 / 0327-7497457
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706', marginTop: '8px' }}>
                  Van Delivery Closing & Return Reconciliation Sheet (شام کی واپسی رپورٹ)
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Date: {new Date(selectedReport.date).toLocaleDateString()} | Run #{selectedReport.deliveryNumber}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.875rem', marginBottom: '20px' }}>
                <div><b>Van Number:</b> {selectedReport.vehicle?.vehicleNumber}</div>
                <div><b>Route / Sector:</b> {selectedReport.routeArea}</div>
                <div><b>Driver:</b> {selectedReport.vehicle?.driverName} ({selectedReport.vehicle?.driverPhone})</div>
                <div><b>Supply Man:</b> {selectedReport.vehicle?.supplyManName}</div>
                <div><b>Field Salesman:</b> {reconData?.salesmanName || selectedReport.salesman?.fullName || 'General Route Sales'}</div>
                <div><b>Route Invoices Created:</b> {reconData ? `${reconData.totalInvoicesCreated} Bills` : `${selectedReport.totalCustomers} Customers`}</div>
              </div>

              {/* Dynamic Loaded vs Sold vs Wapsi Table */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📦 Maal Hisab (Loaded vs Sold vs Wapsi):</span>
                  {reconData && (
                    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                      ✓ Auto-Calculated from Live Invoices
                    </span>
                  )}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Product</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px' }}>Subah Loaded</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', color: '#16a34a' }}>Bika (Sold)</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', color: '#b45309' }}>Wapsi (Baqi)</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Rate</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px' }}>Wapsi Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconData?.items ? (
                      reconData.items.map((it: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                            {it.productName}
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>({it.sku})</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: '#334155' }}>
                            {it.loadedQty} {it.unitSymbol}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 800, color: '#16a34a' }}>
                            {it.soldQty}
                          </td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                            <span style={{
                              backgroundColor: it.returnedQty > 0 ? '#fef3c7' : '#f1f5f9',
                              color: it.returnedQty > 0 ? '#b45309' : '#64748b',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 800
                            }}>
                              {it.returnedQty} {it.unitSymbol}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '6px 8px' }}>Rs. {Number(it.loadedRate).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, color: '#b45309' }}>
                            Rs. {Number(it.returnedValue).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      (selectedReport.items || []).map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{it.product?.name || 'Item'}</td>
                          <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>{Number(it.quantity)}</td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>-</td>
                          <td style={{ textAlign: 'center', padding: '6px 8px' }}>{Number(it.quantity)}</td>
                          <td style={{ textAlign: 'right', padding: '6px 8px' }}>Rs. {Number(it.unitPrice).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '6px 8px' }}>Rs. {Number(it.totalPrice).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#0f172a' }}>
                  💵 Financial Summary (Mali Hisab Kitab):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Subah Ka Total Loaded Maal:</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      Rs. {Number(reconData?.financials?.totalLoadedValue ?? selectedReport.totalDelivered).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Din Bhar Ki Total Sales:</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7' }}>
                      Rs. {Number(reconData?.financials?.totalSalesAmount ?? selectedReport.netSales).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 700 }}>💵 Cash Wasooli (Jama Shuda):</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#16a34a' }}>
                      Rs. {Number(reconData?.financials?.totalCashCollected ?? selectedReport.paymentReceived).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                    <div style={{ fontSize: '0.74rem', color: '#9a3412', fontWeight: 700 }}>📝 Udhar (Baqaya Credit):</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ea580c' }}>
                      Rs. {Number(reconData?.financials?.totalCreditGiven ?? selectedReport.creditAmount).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                    <div style={{ fontSize: '0.74rem', color: '#9f1239', fontWeight: 700 }}>📦 Wapsi Maal Ki Value:</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e11d48' }}>
                      Rs. {Number(reconData?.financials?.totalReturnedValue ?? selectedReport.returnedGoods).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices List on this Route */}
              {reconData?.salesInvoices && reconData.salesInvoices.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px', color: '#0f172a' }}>
                    🧾 Route Invoices Cut Today ({reconData.salesInvoices.length} Bills):
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Inv #</th>
                        <th style={{ textAlign: 'left', padding: '4px 6px' }}>Customer / Shop</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px' }}>Total Bill</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: '#16a34a' }}>Cash Paid</th>
                        <th style={{ textAlign: 'right', padding: '4px 6px', color: '#ea580c' }}>Udhar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconData.salesInvoices.map((inv: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 700 }}>{inv.invoiceNumber}</td>
                          <td style={{ padding: '4px 6px' }}>{inv.customerName}</td>
                          <td style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 700 }}>Rs. {inv.netAmount.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '4px 6px', color: '#16a34a', fontWeight: 700 }}>Rs. {inv.receivedCash.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', padding: '4px 6px', color: '#ea580c', fontWeight: 700 }}>Rs. {inv.creditAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px', textAlign: 'center', fontSize: '0.8rem' }}>
                <div>
                  <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px' }}>Driver / Supply Man Signature</div>
                </div>
                <div>
                  <div style={{ borderTop: '1px dashed #64748b', paddingTop: '6px' }}>Owner / Manager Verification</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                Rafiq Auto & Oil Traders ERP | Developed by <a href="https://nexuradigi.site/" target="_blank" rel="noopener noreferrer" style={{ color: '#000', fontWeight: 800, textDecoration: 'underline' }}>Nexura Digital</a> | Contact: <a href="tel:03147816393" style={{ color: '#000', fontWeight: 800, textDecoration: 'none' }}>03147816393</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
