import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import type { Employee, Expense, LocationType } from './types';

import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import EmployeeProfile from './components/EmployeeProfile';
import ExpenseTracker from './components/ExpenseTracker';
import ReconciliationView from './components/ReconciliationView';

type ViewType = 'employees' | 'expenses' | 'reconciliation';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('employees');
  const [location, setLocation] = useState<LocationType>('Cochin');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeesError(null);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      setEmployeesError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data) {
      setExpenses(data as Expense[]);
    }
    setExpensesLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchExpenses();
  }, [fetchEmployees, fetchExpenses]);

  useEffect(() => {
    const empChannel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();

    const expChannel = supabase
      .channel('expenses-changes-app')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(empChannel);
      supabase.removeChannel(expChannel);
    };
  }, [fetchEmployees, fetchExpenses]);

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
  };

  const handleChangeView = (view: string) => {
    setCurrentView(view as ViewType);
    setSelectedEmployee(null);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-money-paper">
      <Sidebar
        currentView={currentView}
        onChangeView={handleChangeView}
        location={location}
        onLocationChange={setLocation}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {selectedEmployee ? (
          <EmployeeProfile
            employee={selectedEmployee}
            onBack={handleBackToEmployees}
          />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scroll">
            {currentView === 'employees' && (
              <LandingPage
                employees={employees}
                onSelectEmployee={handleSelectEmployee}
                loading={employeesLoading}
              />
            )}

            {currentView === 'expenses' && (
              <div className="p-6 lg:p-8">
                <ExpenseTracker location={location} />
              </div>
            )}

            {currentView === 'reconciliation' && (
              <div className="p-6 lg:p-8">
                {expensesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-money-green border-t-transparent" />
                    <span className="ml-3 text-text-secondary text-sm">Loading expenses…</span>
                  </div>
                ) : (
                  <ReconciliationView expenses={expenses} />
                )}
              </div>
            )}
          </div>
        )}

        {employeesError && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="glass-panel rounded-xl px-5 py-3 flex items-center gap-3 border border-red-500/30">
              <i className="fa-solid fa-triangle-exclamation text-red-400" />
              <span className="text-sm text-red-200">{employeesError}</span>
              <button
                onClick={fetchEmployees}
                className="text-xs text-money-green hover:text-money-paper ml-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
