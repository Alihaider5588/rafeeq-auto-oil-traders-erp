import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  AlertCircle,
  UserCheck,
  ChevronRight,
  Printer
} from 'lucide-react';

interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  designation: string;
  joiningDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  salaryType: 'MONTHLY' | 'DAILY';
  basicSalary: number;
  allowances: number;
  workSchedule?: string;
  notes?: string;
}

interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'WEEKLY_OFF';
  overtimeHours: number;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    designation: string;
  };
}

interface Payroll {
  id: string;
  payrollNumber: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  overtimeAmount: number;
  allowances: number;
  netPayable: number;
  paidAmount: number;
  balanceDue: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
  paymentMethod: string;
  paymentDate?: string;
  notes?: string;
  employee: Employee;
}

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canEditEmployee = isAdmin || Boolean(user?.permissions?.includes('action:edit_employee'));
  const canDeleteEmployee = isAdmin || Boolean(user?.permissions?.includes('action:delete_employee'));

  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll'>('employees');

  // Employee State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [empForm, setEmpForm] = useState({
    employeeCode: '',
    fullName: '',
    phone: '',
    designation: 'Field Salesman',
    salaryType: 'MONTHLY' as 'MONTHLY' | 'DAILY',
    basicSalary: 30000,
    allowances: 0,
    workSchedule: '6 Days / Week (9am - 8pm)',
    notes: '',
  });

  // Attendance State
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Payroll State
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loadingPayroll, setLoadingPayroll] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [disburseAmount, setDisburseAmount] = useState<number>(0);
  const [disburseMethod, setDisburseMethod] = useState<'CASH' | 'BANK'>('CASH');

  // Monthly Attendance History & Proof State
  const [attendanceViewMode, setAttendanceViewMode] = useState<'DAILY' | 'MONTHLY_PROOF'>('DAILY');
  const [selectedProofEmployee, setSelectedProofEmployee] = useState<string>('');
  const [proofMonth, setProofMonth] = useState<number>(new Date().getMonth() + 1);
  const [proofYear, setProofYear] = useState<number>(new Date().getFullYear());
  const [monthlyAttendances, setMonthlyAttendances] = useState<Attendance[]>([]);
  const [loadingMonthlyProof, setLoadingMonthlyProof] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      if (attendanceViewMode === 'DAILY') {
        fetchAttendance();
      } else {
        fetchMonthlyProof();
      }
    } else if (activeTab === 'payroll') {
      fetchPayrolls();
    }
  }, [activeTab, attendanceDate, selectedMonth, selectedYear, attendanceViewMode, selectedProofEmployee, proofMonth, proofYear]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await api.get('/hr/employees');
      if (res.data?.success) setEmployees(res.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to completely remove "${emp.fullName}" (${emp.employeeCode}) from the system?`)) {
      return;
    }
    try {
      const res = await api.delete(`/hr/employees/${emp.id}`);
      if (res.data?.success) {
        alert(res.data.message || 'Employee removed successfully');
        fetchEmployees();
        if (selectedProofEmployee === emp.id) {
          setSelectedProofEmployee('');
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove employee');
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/hr/employees', {
        ...empForm,
        basicSalary: parseFloat(String(empForm.basicSalary)) || 0,
      });
      if (res.data?.success) {
        setShowEmployeeModal(false);
        setEmpForm({
          employeeCode: '',
          fullName: '',
          phone: '',
          designation: 'Field Salesman',
          salaryType: 'MONTHLY',
          basicSalary: 30000,
          allowances: 0,
          workSchedule: '6 Days / Week (9am - 8pm)',
          notes: '',
        });
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add employee');
    }
  };

  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/hr/attendance?date=${attendanceDate}`);
      if (res.data?.success) setAttendances(res.data.attendances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchMonthlyProof = async () => {
    setLoadingMonthlyProof(true);
    try {
      const params = new URLSearchParams();
      params.append('month', String(proofMonth));
      params.append('year', String(proofYear));
      if (selectedProofEmployee) {
        params.append('employeeId', selectedProofEmployee);
      }
      const res = await api.get(`/hr/attendance?${params.toString()}`);
      if (res.data?.success) setMonthlyAttendances(res.data.attendances);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMonthlyProof(false);
    }
  };

  const handleDeleteAttendanceRecord = async (attId: string) => {
    if (!window.confirm('Delete this attendance entry?')) return;
    try {
      await api.delete(`/hr/attendance/${attId}`);
      if (attendanceViewMode === 'DAILY') fetchAttendance();
      else fetchMonthlyProof();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete attendance record');
    }
  };

  const handleMarkAttendance = async (employeeId: string, status: string) => {
    try {
      await api.post('/hr/attendance', {
        employeeId,
        date: attendanceDate,
        status,
        overtimeHours: 0,
      });
      fetchAttendance();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  const fetchPayrolls = async () => {
    setLoadingPayroll(true);
    try {
      const res = await api.get(`/hr/payroll?month=${selectedMonth}&year=${selectedYear}`);
      if (res.data?.success) setPayrolls(res.data.payrolls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayroll(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!window.confirm(`Generate payroll for all active staff for ${selectedMonth}/${selectedYear}?`)) return;
    try {
      const res = await api.post('/hr/payroll/generate', {
        month: selectedMonth,
        year: selectedYear,
      });
      if (res.data?.success) {
        alert(res.data.message);
        fetchPayrolls();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate payroll');
    }
  };

  const handleSettlePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;
    try {
      const res = await api.post(`/hr/payroll/${selectedPayroll.id}/pay`, {
        paidAmount: parseFloat(String(disburseAmount)) || 0,
        paymentMethod: disburseMethod,
        notes: `Disbursed on ${new Date().toLocaleDateString()}`,
      });
      if (res.data?.success) {
        setShowPayModal(false);
        setSelectedPayroll(null);
        fetchPayrolls();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to settle payroll');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Employees, Daily Attendance & Payroll
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Manage staff profiles, daily attendance logs, wage calculations, salary slips, and disbursement reconciliation.
          </p>
        </div>

        {activeTab === 'employees' && (
          <button
            onClick={() => setShowEmployeeModal(true)}
            style={{
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
            }}
          >
            <Plus size={16} /> Add Employee Record
          </button>
        )}

        {activeTab === 'payroll' && (
          <button
            onClick={handleGeneratePayroll}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <DollarSign size={16} color="#38bdf8" /> Calculate Monthly Payroll
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'employees' ? '#fffbeb' : 'transparent',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'employees' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'employees' ? '3px solid #d97706' : '3px solid transparent',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          Staff Directory ({employees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'attendance' ? '#fffbeb' : 'transparent',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'attendance' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'attendance' ? '3px solid #d97706' : '3px solid transparent',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          Daily Attendance Sheet
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: activeTab === 'payroll' ? '#fffbeb' : 'transparent',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            color: activeTab === 'payroll' ? '#d97706' : '#64748b',
            borderBottom: activeTab === 'payroll' ? '3px solid #d97706' : '3px solid transparent',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          Salary & Monthly Payroll
        </button>
      </div>

      {/* TAB 1: EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Full Name</th>
                <th>Phone</th>
                <th>Designation</th>
                <th>Wage Type</th>
                <th>Basic Wage / Salary</th>
                <th>Allowances</th>
                <th>Work Schedule</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingEmployees ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading employee records...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No employee records registered yet.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong style={{ color: '#d97706' }}>{emp.employeeCode}</strong></td>
                    <td><strong>{emp.fullName}</strong></td>
                    <td>{emp.phone}</td>
                    <td>{emp.designation}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: emp.salaryType === 'MONTHLY' ? '#e0f2fe' : '#fef3c7',
                        color: emp.salaryType === 'MONTHLY' ? '#0369a1' : '#b45309',
                      }}>
                        {emp.salaryType}
                      </span>
                    </td>
                    <td>Rs. {Number(emp.basicSalary).toLocaleString()}</td>
                    <td>Rs. {Number(emp.allowances).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.workSchedule}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: emp.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: emp.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {canDeleteEmployee && (
                        <button
                          onClick={() => handleDeleteEmployee(emp)}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Remove Employee"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ATTENDANCE SHEET & MONTHLY ATTENDANCE PROOF */}
      {activeTab === 'attendance' && (
        <div>
          {/* Sub Navigation: Daily vs Monthly Proof */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setAttendanceViewMode('DAILY')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: attendanceViewMode === 'DAILY' ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: attendanceViewMode === 'DAILY' ? '#fef3c7' : '#ffffff',
                color: attendanceViewMode === 'DAILY' ? '#b45309' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              📅 Daily Attendance Logger
            </button>
            <button
              onClick={() => setAttendanceViewMode('MONTHLY_PROOF')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: attendanceViewMode === 'MONTHLY_PROOF' ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: attendanceViewMode === 'MONTHLY_PROOF' ? '#fef3c7' : '#ffffff',
                color: attendanceViewMode === 'MONTHLY_PROOF' ? '#b45309' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              📑 Monthly Attendance & Offs Proof (ماہانہ حاضری و چھٹیاں ریکارڈ)
            </button>
          </div>

          {attendanceViewMode === 'DAILY' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <Calendar size={18} color="#d97706" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Attendance Date:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Designation</th>
                      <th>Current Marked Status</th>
                      <th>Quick Action (Mark for {attendanceDate})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const marked = attendances.find((a) => a.employeeId === emp.id);
                      return (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.fullName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.employeeCode}</div>
                          </td>
                          <td>{emp.designation}</td>
                          <td>
                            {marked ? (
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                backgroundColor:
                                  marked.status === 'PRESENT' ? '#dcfce7' :
                                  marked.status === 'ABSENT' ? '#fee2e2' :
                                  marked.status === 'HALF_DAY' ? '#fef3c7' : '#e0f2fe',
                                color:
                                  marked.status === 'PRESENT' ? '#15803d' :
                                  marked.status === 'ABSENT' ? '#b91c1c' :
                                  marked.status === 'HALF_DAY' ? '#b45309' : '#0369a1',
                              }}>
                                ● {marked.status}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not Recorded</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => handleMarkAttendance(emp.id, 'PRESENT')}
                                style={{
                                  backgroundColor: marked?.status === 'PRESENT' ? '#15803d' : '#f1f5f9',
                                  color: marked?.status === 'PRESENT' ? '#fff' : '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp.id, 'ABSENT')}
                                style={{
                                  backgroundColor: marked?.status === 'ABSENT' ? '#b91c1c' : '#f1f5f9',
                                  color: marked?.status === 'ABSENT' ? '#fff' : '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp.id, 'HALF_DAY')}
                                style={{
                                  backgroundColor: marked?.status === 'HALF_DAY' ? '#b45309' : '#f1f5f9',
                                  color: marked?.status === 'HALF_DAY' ? '#fff' : '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Half Day
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp.id, 'LEAVE')}
                                style={{
                                  backgroundColor: marked?.status === 'LEAVE' ? '#0369a1' : '#f1f5f9',
                                  color: marked?.status === 'LEAVE' ? '#fff' : '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Paid Leave
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* MONTHLY PROOF & OFFS REGISTER */
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
                backgroundColor: '#ffffff',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                flexWrap: 'wrap'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Select Staff Member:
                  </label>
                  <select
                    value={selectedProofEmployee}
                    onChange={(e) => setSelectedProofEmployee(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', minWidth: '220px' }}
                  >
                    <option value="">-- All Employees --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Month:
                  </label>
                  <select
                    value={proofMonth}
                    onChange={(e) => setProofMonth(Number(e.target.value))}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>Month {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Year:
                  </label>
                  <input
                    type="number"
                    value={proofYear}
                    onChange={(e) => setProofYear(Number(e.target.value))}
                    style={{ width: '90px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => window.print()}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px' }}
                  >
                    <Printer size={16} /> Print Monthly Proof Sheet
                  </button>
                </div>
              </div>

              {/* Monthly Summary Statistics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div className="card" style={{ padding: '14px', textAlign: 'center', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>Present Days</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                    {monthlyAttendances.filter((a) => a.status === 'PRESENT').length}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>Absent Days (Offs)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b91c1c', marginTop: '2px' }}>
                    {monthlyAttendances.filter((a) => a.status === 'ABSENT').length}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center', backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>Half Days</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309', marginTop: '2px' }}>
                    {monthlyAttendances.filter((a) => a.status === 'HALF_DAY').length}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px', textAlign: 'center', backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#075985' }}>Approved Leaves</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0369a1', marginTop: '2px' }}>
                    {monthlyAttendances.filter((a) => a.status === 'LEAVE').length}
                  </div>
                </div>
              </div>

              {/* Monthly Date-by-Date Proof Table */}
              <div className="table-container printable-area">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Attendance Status</th>
                      <th>Proof Status (Off / Duty)</th>
                      <th>Notes / Reason</th>
                      <th className="no-print" style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMonthlyProof ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          Loading monthly attendance logs...
                        </td>
                      </tr>
                    ) : monthlyAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No attendance records found for this period.
                        </td>
                      </tr>
                    ) : (
                      monthlyAttendances.map((att) => {
                        const dateObj = new Date(att.date);
                        const isOff = att.status === 'ABSENT' || att.status === 'HALF_DAY' || att.status === 'LEAVE';
                        return (
                          <tr key={att.id} style={{ backgroundColor: isOff ? '#fffbfb' : 'transparent' }}>
                            <td><strong>{dateObj.toLocaleDateString()}</strong></td>
                            <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                              {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                            </td>
                            <td>
                              <strong>{att.employee?.fullName || 'N/A'}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{att.employee?.employeeCode}</div>
                            </td>
                            <td>{att.employee?.designation}</td>
                            <td>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                backgroundColor:
                                  att.status === 'PRESENT' ? '#dcfce7' :
                                  att.status === 'ABSENT' ? '#fee2e2' :
                                  att.status === 'HALF_DAY' ? '#fef3c7' : '#e0f2fe',
                                color:
                                  att.status === 'PRESENT' ? '#15803d' :
                                  att.status === 'ABSENT' ? '#b91c1c' :
                                  att.status === 'HALF_DAY' ? '#b45309' : '#0369a1',
                              }}>
                                ● {att.status}
                              </span>
                            </td>
                            <td>
                              {att.status === 'ABSENT' ? (
                                <strong style={{ color: '#b91c1c', fontSize: '0.82rem' }}>❌ OFF DAY (چھٹی کا ثبوت)</strong>
                              ) : att.status === 'HALF_DAY' ? (
                                <strong style={{ color: '#b45309', fontSize: '0.82rem' }}>⚠️ HALF DAY OFF</strong>
                              ) : att.status === 'LEAVE' ? (
                                <strong style={{ color: '#0369a1', fontSize: '0.82rem' }}>📋 APPROVED LEAVE</strong>
                              ) : (
                                <span style={{ color: '#15803d', fontSize: '0.82rem' }}>✔️ ON DUTY</span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                              {att.notes || '-'}
                            </td>
                            <td className="no-print" style={{ textAlign: 'center' }}>
                              {canDeleteEmployee && (
                                <button
                                  onClick={() => handleDeleteAttendanceRecord(att.id)}
                                  style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Delete Attendance Entry"
                                >
                                  Delete
                                </button>
                              )}
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
        </div>
      )}

      {/* TAB 3: SALARY & MONTHLY PAYROLL */}
      {activeTab === 'payroll' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>Month {m}</option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ width: '90px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payroll #</th>
                  <th>Employee</th>
                  <th>Days (P / A / H)</th>
                  <th>Basic Salary</th>
                  <th>Overtime / Allowances</th>
                  <th>Net Payable</th>
                  <th>Disbursed</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingPayroll ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Loading payroll calculation...
                    </td>
                  </tr>
                ) : payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No payroll generated for {selectedMonth}/{selectedYear}. Click "Calculate Monthly Payroll" above.
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ color: '#d97706' }}>{p.payrollNumber}</strong></td>
                      <td>
                        <strong>{p.employee.fullName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.employee.designation}</div>
                      </td>
                      <td>
                        <span style={{ color: '#15803d', fontWeight: 700 }}>{p.presentDays}P</span> /{' '}
                        <span style={{ color: '#b91c1c', fontWeight: 700 }}>{p.absentDays}A</span> /{' '}
                        <span style={{ color: '#b45309' }}>{p.halfDays}H</span>
                      </td>
                      <td>Rs. {Number(p.basicSalary).toLocaleString()}</td>
                      <td>
                        Rs. {(Number(p.overtimeAmount) + Number(p.allowances)).toLocaleString()}
                      </td>
                      <td><strong style={{ color: '#0f172a' }}>Rs. {Number(p.netPayable).toLocaleString()}</strong></td>
                      <td>Rs. {Number(p.paidAmount).toLocaleString()}</td>
                      <td>
                        <strong style={{ color: Number(p.balanceDue) > 0 ? '#b91c1c' : '#15803d' }}>
                          Rs. {Number(p.balanceDue).toLocaleString()}
                        </strong>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor:
                            p.status === 'PAID' ? '#dcfce7' :
                            p.status === 'PARTIALLY_PAID' ? '#fef3c7' : '#fee2e2',
                          color:
                            p.status === 'PAID' ? '#15803d' :
                            p.status === 'PARTIALLY_PAID' ? '#b45309' : '#b91c1c',
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {Number(p.balanceDue) > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedPayroll(p);
                              setDisburseAmount(Number(p.balanceDue));
                              setShowPayModal(true);
                            }}
                            style={{
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Disburse Cash
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>Fully Paid ✓</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD EMPLOYEE */}
      {showEmployeeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a' }}>
              Add New Staff / Employee Record
            </h2>

            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-01"
                    value={empForm.employeeCode}
                    onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Employee name"
                    value={empForm.fullName}
                    onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300-1234567"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Delivery Driver / Field Salesman"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Wage Type
                  </label>
                  <select
                    value={empForm.salaryType}
                    onChange={(e) => setEmpForm({ ...empForm, salaryType: e.target.value as any })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  >
                    <option value="MONTHLY">Monthly Fixed Salary</option>
                    <option value="DAILY">Daily Wage Rate</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Basic Wage / Salary (PKR) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={empForm.basicSalary}
                    onChange={(e) => setEmpForm({ ...empForm, basicSalary: e.target.value as any })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISBURSE SALARY */}
      {showPayModal && selectedPayroll && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
              Disburse Salary Payment
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Employee: <strong>{selectedPayroll.employee.fullName}</strong> ({selectedPayroll.payrollNumber})
            </div>

            <form onSubmit={handleSettlePayroll} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Amount to Disburse (PKR) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={disburseAmount}
                  onChange={(e) => setDisburseAmount(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <select
                  value={disburseMethod}
                  onChange={(e) => setDisburseMethod(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="CASH">Counter Cash Register</option>
                  <option value="BANK">Bank Transfer / Cheque</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
