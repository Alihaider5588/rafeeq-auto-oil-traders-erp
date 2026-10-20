import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ShieldCheck,
  Truck,
  Building2,
  Award,
  Users,
  MapPin,
  CheckCircle2,
  Phone,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [company, setCompany] = useState<any>({
    address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
    proprietorNames: 'M. Shafiq & Haji Muhammad Rafiq',
    operationalAreas: 'Okara, Sahiwal, Kasur',
    email: 'rafiqtreders003@gmail.com',
    phone: '0306-9258573 / 0327-7497457',
  });

  useEffect(() => {
    api.get('/public/company')
      .then(res => {
        if (res.data?.success && res.data.company) {
          setCompany(res.data.company);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 20px' }}>
      {/* Breadcrumb Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>
          <Link to="/website" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#0f172a', fontWeight: 600 }}>About Us</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
          About Rafiq Auto & Oil Traders
        </h1>
        <div style={{ fontSize: '1rem', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
          رفیق آٹو اینڈ آئل ٹریڈرز - اوکاڑہ
        </div>
      </div>

      {/* Hero Story Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        marginBottom: '40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px',
        alignItems: 'center',
      }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 16px 0' }}>
            Punjab’s Reliable Partner in Wholesale Engine Oils & Lubrication Logistics
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 16px 0' }}>
            Operating from our central commercial depot at <strong>{company.address}</strong>, <strong>Rafiq Auto & Oil Traders</strong> is managed by proprietors <strong>{company.proprietorNames}</strong>. We serve as a trusted wholesale distribution hub covering <strong>{company.operationalAreas}</strong> and surrounding regions for authorized lubricants, high-grade motor oils, industrial greases, and filtration systems.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 24px 0' }}>
            We understand the automotive aftermarket inside out: counterfeit oils cost vehicle owners their engines and repair shops their hard-earned reputation. That is why every single carton leaving our warehouse comes directly from authorized brand sources with verified batch codes.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/website/products"
              style={{
                backgroundColor: '#d97706',
                color: '#ffffff',
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Explore Products
            </Link>
            <Link
              to="/website/contact"
              style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                padding: '11px 22px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              Contact Our Depot
            </Link>
          </div>
        </div>

        {/* Highlight Stats Card with Warehouse background */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(9, 13, 22, 0.94) 0%, rgba(15, 23, 42, 0.92) 100%), url("/hero-warehouse.jpg") center/cover no-repeat',
          backgroundBlendMode: 'multiply',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '36px',
          border: '1px solid #334155',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#f59e0b" /> Key Operations & Depot Capabilities
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8' }}>100%</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>Genuine Brand Stock</div>
            </div>

            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#22c55e' }}>20+</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>Years Trade Legacy</div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b' }}>Daily</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>Van Distribution Fleet</div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ec4899' }}>500+</div>
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '2px' }}>Active Retail Partners</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Values Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginBottom: '24px' }}>
          Our Wholesale Commitments
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <ShieldCheck size={26} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Zero Counterfeit Guarantee</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              All lubricants are sourced through documented supply chains directly from brand refineries and official national depots.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Truck size={26} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Doorstep Workshop Delivery</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Our dedicated supply vans service designated sectors regularly so workshops never run dry on key engine oil grades.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Award size={26} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Competitive Dealership Rates</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              We offer volume carton discounts, transparent receipts, and double-entry accounts reconciliation for trusted customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
