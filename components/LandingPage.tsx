import { useState, useMemo } from 'react';
import type { Employee } from '../types';
import EmployeeCard from './EmployeeCard';

interface LandingPageProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  loading?: boolean;
}

export default function LandingPage({ employees, onSelectEmployee, loading }: LandingPageProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        e.card_number.includes(term) ||
        (e.department?.toLowerCase().includes(term) ?? false) ||
        (e.designation?.toLowerCase().includes(term) ?? false)
    );
  }, [employees, searchTerm]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'active').length;
    const cochin = employees.filter((e) => e.location === 'Cochin').length;
    const calicut = employees.filter((e) => e.location === 'Calicut').length;
    return { total, active, cochin, calicut };
  }, [employees]);

  return (
    <div className="flex-1 min-h-0 flex flex-col p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-money-gold tracking-tight">
          FETS Cash
          <span className="text-white/40 mx-2">·</span>
          <span className="text-white/70 text-2xl lg:text-3xl font-light">
            Staff Portal
          </span>
        </h1>
        <p className="text-text-secondary mt-1 text-sm tracking-wide">
          Employee Salary Management
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-panel rounded-xl p-4">
          <p className="text-text-tertiary text-[10px] uppercase tracking-[0.15em] font-semibold">
            Total Employees
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="text-text-tertiary text-[10px] uppercase tracking-[0.15em] font-semibold">
            Active Staff
          </p>
          <p className="text-2xl font-bold text-money-green mt-1">{stats.active}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="text-text-tertiary text-[10px] uppercase tracking-[0.15em] font-semibold">
            Cochin
          </p>
          <p className="text-2xl font-bold text-money-paper mt-1">{stats.cochin}</p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="text-text-tertiary text-[10px] uppercase tracking-[0.15em] font-semibold">
            Calicut
          </p>
          <p className="text-2xl font-bold text-money-paper mt-1">{stats.calicut}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary text-sm" />
          <input
            type="text"
            placeholder="Search employees by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neo-input w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="neo-btn flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap">
            <i className="fa-solid fa-file-invoice" />
            Generate All Payslips
          </button>
          <button className="neo-btn flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap">
            <i className="fa-solid fa-download" />
            Export Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-money-green border-t-transparent" />
          <span className="ml-3 text-text-secondary text-sm">Loading employees...</span>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
          <i className="fa-solid fa-users-slash text-4xl mb-3" />
          <p className="text-sm">
            {searchTerm ? 'No employees match your search' : 'No employees found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onSelect={onSelectEmployee}
            />
          ))}
        </div>
      )}
    </div>
  );
}
