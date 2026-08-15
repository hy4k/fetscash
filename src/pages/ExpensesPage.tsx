import React, { useMemo, useState } from 'react';
import { Receipt, Plus, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import { useFilterStore } from '@/stores/useFilterStore';
import {
  useExpenses,
  useCategories,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingPage } from '@/components/error/LoadingPage';
import { DataTable, Column } from '@/components/data/DataTable';
import { SearchBar } from '@/components/data/SearchBar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ExpenseModal } from '@/components/modals/ExpenseModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { Expense } from '@/types';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export default function ExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const location = useAppStore((s) => s.location);
  const { data: expenses, isLoading: queryLoading } = useExpenses();
  const { data: categories } = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const searchQuery = useFilterStore((s) => s.searchQuery);
  const categoryFilter = useFilterStore((s) => s.categoryFilter);
  const dateRange = useFilterStore((s) => s.dateRange);
  const setSearchQuery = useFilterStore((s) => s.setSearchQuery);
  const setCategoryFilter = useFilterStore((s) => s.setCategoryFilter);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const nextId = useMemo(() => Date.now().toString(), []);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((exp) => {
      const matchesSearch =
        !searchQuery ||
        exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.paid_by?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || exp.category === categoryFilter;
      const matchesDateRange =
        (!dateRange.start || exp.date >= dateRange.start) &&
        (!dateRange.end || exp.date <= dateRange.end);
      return matchesSearch && matchesCategory && matchesDateRange;
    });
  }, [expenses, searchQuery, categoryFilter, dateRange]);

  const columns = useMemo<Column<Expense>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        accessor: (exp) => formatDate(exp.date),
      },
      {
        key: 'id',
        header: 'ID',
        accessor: (exp) => (
          <span className="font-bold text-money-green">{exp.paid_by}</span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        accessor: (exp) => <Badge variant="default">{exp.category}</Badge>,
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (exp) => (
          <span className="max-w-[200px] truncate block">{exp.description}</span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        accessor: (exp) => (
          <span className="font-bold text-money-gold">
            {formatCurrency(exp.amount, 'INR')}
          </span>
        ),
      },
    ],
    []
  );

  if (authLoading || queryLoading) return <LoadingPage />;
  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Receipt size={48} className="mx-auto text-text-muted" />
          <h2 className="text-xl font-semibold text-money-paper">
            Connection Required
          </h2>
          <p className="text-text-secondary">
            Please sign in to view the expense register.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Expense Register"
        actions={
          <Button onClick={() => setIsModalOpen(true)} variant="default">
            <Plus size={16} className="mr-2" />
            Add Expense
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search expenses..."
          className="flex-1"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dateRange.start}
          onChange={(e) =>
            setDateRange({ ...dateRange, start: e.target.value })
          }
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={dateRange.end}
          onChange={(e) =>
            setDateRange({ ...dateRange, end: e.target.value })
          }
          className="w-full sm:w-40"
        />
        <Button variant="outline" onClick={resetFilters} className="shrink-0">
          <RotateCcw size={14} className="mr-2" />
          Reset
        </Button>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredExpenses}
            onEdit={(exp) => {
              setEditingExpense(exp);
              setIsModalOpen(true);
            }}
            onDelete={(exp) => {
              setDeletingExpense(exp);
              setIsConfirmOpen(true);
            }}
            emptyMessage="No expenses found"
            emptyIcon={<Receipt size={32} className="text-text-muted" />}
          />
        </CardContent>
      </Card>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        categories={categories || []}
        nextId={nextId}
        location={location}
        onSave={(expense) => {
          if (editingExpense) {
            updateExpense.mutate({
              id: editingExpense.id!,
              updates: expense,
            });
          } else {
            const { id, created_at, ...payload } = expense;
            createExpense.mutate(
              payload as Omit<Expense, 'id' | 'created_at'>
            );
          }
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense${
          deletingExpense?.description
            ? `: "${deletingExpense.description}"`
            : ''
        }? This action cannot be undone.`}
        onConfirm={() => {
          if (deletingExpense?.id) {
            deleteExpense.mutate(deletingExpense.id);
          }
          setIsConfirmOpen(false);
          setDeletingExpense(null);
        }}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingExpense(null);
        }}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}
