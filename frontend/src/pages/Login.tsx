import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Droplet, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { identifier, password });
      const { token, user } = response.data;

      login(token, user);

      // Automatic redirection based on role
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'CASHIER':
          navigate('/cashier');
          break;
        case 'OPERATOR':
          navigate('/operator');
          break;
        case 'SALESMAN':
          navigate('/salesman');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Brand Banner */}
        <div style={{
          backgroundColor: '#1e293b',
          padding: '30px 24px',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <img
            src="/logo.png"
            alt="Rafiq Auto & Oil Traders"
            style={{
              width: '84px',
              height: '84px',
              objectFit: 'contain',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              padding: '4px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
              marginBottom: '12px'
            }}
          />
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '0.02em', color: '#f8fafc', lineHeight: 1.2 }}>
            RAFIQ AUTO & OIL TRADERS
          </h1>
          <div style={{ fontSize: '1.05rem', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>
            رفیق آٹو اینڈ آئل ٹریڈرز
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
            All Kinds of Lubricants & Filters • 54-Stop Dipalpur Road, Okara
          </p>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
            📞 0306-9258573 | 0327-7497457
          </div>
        </div>

        {/* Login Form Body */}
        <div style={{ padding: '32px 30px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="#64748b" /> Username or Mobile Number
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. admin or 03069258573"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={15} color="#64748b" /> Password
              </label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              {loading ? 'Authenticating...' : (
                <>
                  Secure Login <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
