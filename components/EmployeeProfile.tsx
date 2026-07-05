import React, { useState, useEffect, useMemo } from 'react';
import type { Employee, SalaryRecord } from '../types';
import { supabase } from '../supabaseClient';
import SalaryCalculator from './SalaryCalculator';
import SalaryHistory from './SalaryHistory';
import './components.css';

interface EmployeeProfileProps {
  employee: Employee;
  onBack: () => void;
}

type ActiveTab = 'calculator' | 'history';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function cardTypeIcon(cardType: string): string {
  switch (cardType) {
    case 'FETS Money':
      return 'fa-money-bill-wave';
    case 'FETS Card':
      return 'fa-credit-card';
    case 'FETS Currency':
      return 'fa-coins';
    case 'FETS Premier':
      return 'fa-crown';
    default:
      return 'fa-id-card';
  }
}

function cardTypeGradient(cardType: string): string {
  switch (cardType) {
    case 'FETS Money':
      return 'linear-gradient(135deg, #0f1a14 0%, #1a2e1a 50%, #0f1a14 100%)';
    case 'FETS Card':
      return 'linear-gradient(135deg, #0f1a14 0%, #1a2a1a 50%, #0f1a14 100%)';
    case 'FETS Currency':
      return 'linear-gradient(135deg, #0f1a14 0%, #1a2e23 50%, #0f1a14 100%)';
    case 'FETS Premier':
      return 'linear-gradient(135deg, #0f1a14 0%, #2e2514 50%, #0f1a14 100%)';
    default:
      return 'linear-gradient(135deg, #0f1a14, #15221b)';
  }
}

export default function EmployeeProfile({ employee, onBack }: EmployeeProfileProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('salary_records')
        .select('*')
        .eq('employee_id', employee.id)
        .order('month', { ascending: false });
      if (dbError) throw dbError;
      setRecords(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const statusColor = employee.status === 'active' ? '#85bb65' : '#8ba696';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080f0c',
        padding: '20px',
      }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          color: '#8ba696',
          background: 'transparent',
          border: '1px solid rgba(133, 187, 101, 0.1)',
          borderRadius: 10,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#e8f5e9';
          e.currentTarget.style.borderColor = 'rgba(133, 187, 101, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#8ba696';
          e.currentTarget.style.borderColor = 'rgba(133, 187, 101, 0.1)';
        }}
      >
        <i className="fa-solid fa-arrow-left" />
        Back to Employees
      </button>

      {/* Credit Card Header */}
      <div
        className="card-glow"
        style={{
          position: 'relative',
          background: cardTypeGradient(employee.card_type),
          padding: '28px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {/* Photo placeholder */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #15221b, #0f1a14)',
              border: '2px solid rgba(133, 187, 101, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: '#85bb65',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            {initials(employee.name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#e8f5e9',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {employee.name}
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: statusColor,
                  background: `${statusColor}15`,
                  border: `1px solid ${statusColor}30`,
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                {employee.status}
              </span>
            </div>

            <p
              style={{
                margin: '0 0 12px',
                fontSize: 14,
                color: '#8ba696',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fa-solid fa-envelope" style={{ fontSize: 12 }} />
              {employee.email}
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 20px',
              }}
            >
              {employee.designation && (
                <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-briefcase" style={{ fontSize: 11, color: '#85bb65' }} />
                  {employee.designation}
                </span>
              )}
              {employee.department && (
                <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-building" style={{ fontSize: 11, color: '#85bb65' }} />
                  {employee.department}
                </span>
              )}
              {employee.location && (
                <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-location-dot" style={{ fontSize: 11, color: '#85bb65' }} />
                  {employee.location}
                </span>
              )}
              <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`fa-solid ${cardTypeIcon(employee.card_type)}`} style={{ fontSize: 11, color: '#d4af37' }} />
                {employee.card_type}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: '#d4af37',
                  fontFamily: "'Courier New', monospace",
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <i className="fa-solid fa-hashtag" style={{ fontSize: 11 }} />
                {employee.card_number}
              </span>
              {employee.phone && (
                <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-phone" style={{ fontSize: 11, color: '#85bb65' }} />
                  {employee.phone}
                </span>
              )}
              {employee.join_date && (
                <span style={{ fontSize: 13, color: '#8ba696', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-calendar-day" style={{ fontSize: 11, color: '#85bb65' }} />
                  Joined {new Date(employee.join_date).toLocaleDateString('en-GB')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card decorative elements */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(133,187,101,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            right: 60,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tab Navigation */}
      <div className="tab-pill" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={`tab-pill__item ${activeTab === 'calculator' ? 'tab-pill__item--active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          <i className="fa-solid fa-calculator" style={{ marginRight: 6 }} />
          Calculator
        </button>
        <button
          type="button"
          className={`tab-pill__item ${activeTab === 'history' ? 'tab-pill__item--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: 6 }} />
          History
          {records.length > 0 && (
            <span
              style={{
                marginLeft: 6,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                background: activeTab === 'history' ? 'rgba(8,15,12,0.3)' : 'rgba(133,187,101,0.12)',
                color: activeTab === 'history' ? '#080f0c' : '#85bb65',
                borderRadius: 10,
              }}
            >
              {records.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <i
            className="fa-solid fa-circle-notch fa-spin"
            style={{ fontSize: 28, color: '#85bb65', marginBottom: 16, display: 'block' }}
          />
          <p style={{ color: '#8ba696', fontSize: 14, margin: 0 }}>Loading salary records...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <i
            className="fa-solid fa-triangle-exclamation"
            style={{ fontSize: 28, color: '#e57373', marginBottom: 16, display: 'block' }}
          />
          <p style={{ color: '#e57373', fontSize: 14, margin: '0 0 16px' }}>{error}</p>
          <button type="button" className="neo-btn" onClick={fetchRecords}>
            <i className="fa-solid fa-rotate-right" />
            Retry
          </button>
        </div>
      ) : activeTab === 'calculator' ? (
        <SalaryCalculator employee={employee} existingRecords={records} onSave={fetchRecords} />
      ) : (
        <SalaryHistory employee={employee} records={records} />
      )}
    </div>
  );
}
