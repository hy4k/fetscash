import React, { useState, useMemo, useCallback } from 'react';
import type { Employee, SalaryRecord } from '../types';
import { computeSalaryBreakdown } from '../utils/paybookSalary';
import { downloadPayslipPdf } from '../utils/paybookPayslip';
import { canonicalMonthFromDate, rollingCanonicalMonths } from '../utils/paybookMonth';
import { supabase } from '../supabaseClient';
import DigitalSignature from './DigitalSignature';

interface SalaryCalculatorProps {
  employee: Employee;
  existingRecords: SalaryRecord[];
  onSave: () => void;
}

function inr(n: number): string {
  return `\u20b9${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SalaryCalculator({ employee, existingRecords, onSave }: SalaryCalculatorProps) {
  const monthOptions = useMemo(() => rollingCanonicalMonths(24), []);

  const [selectedMonth, setSelectedMonth] = useState(canonicalMonthFromDate());
  const [workingDays, setWorkingDays] = useState<number | ''>(26);
  const [fullDays, setFullDays] = useState<number | ''>(22);
  const [halfDays, setHalfDays] = useState<number | ''>(0);
  const [leaveDays, setLeaveDays] = useState<number | ''>(0);
  const [otHours, setOtHours] = useState<number | ''>(0);
  const [extraOtHours, setExtraOtHours] = useState<number | ''>(0);
  const [toilHours, setToilHours] = useState<number | ''>(0);
  const [monthlySalary, setMonthlySalary] = useState<number | ''>('');
  const [dailyRate, setDailyRate] = useState<number | ''>('');

  const [saving, setSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    return computeSalaryBreakdown({
      monthly_salary: monthlySalary === '' ? null : Number(monthlySalary),
      daily_rate: dailyRate === '' ? null : Number(dailyRate),
      working_days_in_month: workingDays === '' ? null : Number(workingDays),
      full_days: fullDays === '' ? null : Number(fullDays),
      half_days: halfDays === '' ? null : Number(halfDays),
      leave_days: leaveDays === '' ? null : Number(leaveDays),
      ot_hours: otHours === '' ? null : Number(otHours),
      extra_ot_hours: extraOtHours === '' ? null : Number(extraOtHours),
      toil_hours: toilHours === '' ? null : Number(toilHours),
      month: selectedMonth,
      name: employee.name,
    });
  }, [
    monthlySalary,
    dailyRate,
    workingDays,
    fullDays,
    halfDays,
    leaveDays,
    otHours,
    extraOtHours,
    toilHours,
    selectedMonth,
    employee.name,
  ]);

  const isDuplicateMonth = useMemo(() => {
    return existingRecords.some((r) => r.month === selectedMonth);
  }, [existingRecords, selectedMonth]);

  const handleNumChange = (setter: React.Dispatch<React.SetStateAction<number | ''>>) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === '') {
        setter('');
        return;
      }
      const n = parseFloat(v);
      setter(Number.isFinite(n) ? n : '');
    };
  };

  const buildRecord = useCallback((): SalaryRecord => {
    return {
      employee_id: employee.id,
      month: selectedMonth,
      working_days_in_month: workingDays === '' ? null : Number(workingDays),
      full_days: fullDays === '' ? null : Number(fullDays),
      half_days: halfDays === '' ? null : Number(halfDays),
      leave_days: leaveDays === '' ? null : Number(leaveDays),
      ot_hours: otHours === '' ? null : Number(otHours),
      extra_ot_hours: extraOtHours === '' ? null : Number(extraOtHours),
      toil_hours: toilHours === '' ? null : Number(toilHours),
      monthly_salary: monthlySalary === '' ? null : Number(monthlySalary),
      daily_rate: dailyRate === '' ? null : Number(dailyRate),
      gross_salary: breakdown.grossSalary,
      deductions: breakdown.deductions,
      net_salary: breakdown.netSalary,
      basis: breakdown.basis,
    };
  }, [
    employee.id,
    selectedMonth,
    workingDays,
    fullDays,
    halfDays,
    leaveDays,
    otHours,
    extraOtHours,
    toilHours,
    monthlySalary,
    dailyRate,
    breakdown,
  ]);

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const record = buildRecord();
      const { error } = await supabase.from('salary_records').insert(record);
      if (error) throw error;
      onSave();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = () => {
    const record = buildRecord();
    downloadPayslipPdf(employee, record, breakdown, signatureData);
  };

  const handleSignatureSave = (data: string) => {
    setSignatureData(data);
    setShowSignature(false);
  };

  return (
    <div className="animate-fade-in">
      {showSignature ? (
        <DigitalSignature onSave={handleSignatureSave} onCancel={() => setShowSignature(false)} />
      ) : (
        <>
          {/* Form */}
          <div className="glass-panel" style={{ padding: 24, marginBottom: 20 }}>
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: 15,
                fontWeight: 700,
                color: '#e8f5e9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="fa-solid fa-calculator" style={{ color: '#85bb65' }} />
              Salary Calculator
            </h3>

            <div style={{ display: 'grid', gap: 16 }}>
              {/* Month */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8ba696',
                    marginBottom: 6,
                  }}
                >
                  Pay Month
                </label>
                <select
                  className="neo-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                {isDuplicateMonth && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: '#d4af37' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                    A record already exists for {selectedMonth}. Saving will create a duplicate.
                  </p>
                )}
              </div>

              {/* Working days */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8ba696',
                    marginBottom: 6,
                  }}
                >
                  Working Days in Month
                </label>
                <input
                  type="number"
                  className="neo-input"
                  value={workingDays}
                  onChange={handleNumChange(setWorkingDays)}
                  min={0}
                  max={31}
                  step={1}
                />
              </div>

              {/* Full / Half side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    Full Days
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={fullDays}
                    onChange={handleNumChange(setFullDays)}
                    min={0}
                    step={1}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    Half Days
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={halfDays}
                    onChange={handleNumChange(setHalfDays)}
                    min={0}
                    step={1}
                  />
                </div>
              </div>

              {/* Leave */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8ba696',
                    marginBottom: 6,
                  }}
                >
                  Leave Days
                </label>
                <input
                  type="number"
                  className="neo-input"
                  value={leaveDays}
                  onChange={handleNumChange(setLeaveDays)}
                  min={0}
                  step={1}
                />
              </div>

              {/* OT / Extra OT side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    OT Hours
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={otHours}
                    onChange={handleNumChange(setOtHours)}
                    min={0}
                    step={0.5}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    Extra OT Hours
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={extraOtHours}
                    onChange={handleNumChange(setExtraOtHours)}
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>

              {/* TOIL */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#8ba696',
                    marginBottom: 6,
                  }}
                >
                  TOIL Hours <span style={{ fontWeight: 400, color: '#4a6354' }}>(Time Off In Lieu)</span>
                </label>
                <input
                  type="number"
                  className="neo-input"
                  value={toilHours}
                  onChange={handleNumChange(setToilHours)}
                  min={0}
                  step={0.5}
                />
              </div>

              {/* Monthly Salary / Daily Rate side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    Monthly Salary (\u20b9)
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={monthlySalary}
                    onChange={handleNumChange(setMonthlySalary)}
                    min={0}
                    step={100}
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8ba696',
                      marginBottom: 6,
                    }}
                  >
                    Daily Rate (\u20b9)
                  </label>
                  <input
                    type="number"
                    className="neo-input"
                    value={dailyRate}
                    onChange={handleNumChange(setDailyRate)}
                    min={0}
                    step={50}
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="glass-panel" style={{ padding: 24, marginBottom: 20 }}>
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 15,
                fontWeight: 700,
                color: '#e8f5e9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="fa-solid fa-eye" style={{ color: '#85bb65' }} />
              Live Preview
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div className="money-stat">
                <div className="money-stat__label">Gross Salary</div>
                <div className="money-stat__value" style={{ color: '#85bb65' }}>
                  {inr(breakdown.grossSalary)}
                </div>
              </div>
              <div className="money-stat money-stat--gold">
                <div className="money-stat__label">Deductions</div>
                <div className="money-stat__value" style={{ color: '#e57373' }}>
                  {inr(breakdown.deductions)}
                </div>
              </div>
              <div className="money-stat money-stat--gold">
                <div className="money-stat__label">Net Salary</div>
                <div className="money-stat__value" style={{ color: '#d4af37' }}>
                  {inr(breakdown.netSalary)}
                </div>
              </div>
              <div className="money-stat">
                <div className="money-stat__label">Worked Units</div>
                <div className="money-stat__value">{breakdown.workedUnits}</div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(133, 187, 101, 0.04)',
                borderRadius: 10,
                border: '1px solid rgba(133, 187, 101, 0.06)',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8ba696', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Calculation Basis
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#e8f5e9', lineHeight: 1.5 }}>
                {breakdown.basis}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="neo-btn"
                onClick={handleSave}
                disabled={saving}
              >
                <i className="fa-solid fa-floppy-disk" />
                {saving ? 'Saving\u2026' : 'Save to Records'}
              </button>

              <button
                type="button"
                className="neo-btn neo-btn--gold"
                onClick={handleGeneratePdf}
              >
                <i className="fa-solid fa-file-pdf" />
                Generate PDF
              </button>

              <button
                type="button"
                className="neo-btn"
                onClick={() => setShowSignature(true)}
                style={{
                  borderColor: signatureData
                    ? 'rgba(133, 187, 101, 0.4)'
                    : 'rgba(133, 187, 101, 0.18)',
                }}
              >
                <i
                  className={signatureData ? 'fa-solid fa-check-circle' : 'fa-solid fa-pen-nib'}
                  style={{ color: signatureData ? '#85bb65' : undefined }}
                />
                {signatureData ? 'Signature Added' : 'Add Digital Signature'}
              </button>

              {signatureData && (
                <button
                  type="button"
                  className="neo-btn neo-btn--danger"
                  style={{ padding: '10px 12px' }}
                  onClick={() => setSignatureData(null)}
                  title="Remove signature"
                >
                  <i className="fa-solid fa-trash" />
                </button>
              )}
            </div>

            {saveError && (
              <p style={{ margin: '12px 0 0', fontSize: 13, color: '#e57373' }}>
                <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />
                {saveError}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
