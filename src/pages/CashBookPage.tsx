import React, { useMemo, useState } from 'react';
import { Wallet, Plus, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import {
  useCashTransactions,
  useCreateCashTransaction,
  useUpdateCashTransaction,
  useDeleteCashTransaction,
  useCategories,
} from '@/hooks';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingPage } from '@/components/error/LoadingPage';
import { DataTable, Column } from '@/components/data/DataTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { CashModal } from '@/components/modals/CashModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { FetsTransaction } from '@/types';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/lib/utils';

export default function CashBookPage() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const location = useAppStore((s) => s.location);
  const { data: transactions, isLoading: queryLoading } = useCashTransactions();
  const { data: categories } = useCategories();
  const createCashTransaction = useCreateCashTransaction();
  const updateCashTransaction = useUpdateCashTransaction();
  const deleteCashTransaction = useDeleteCashTransaction();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FetsTransaction | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<FetsTransaction | null>(null);

  const nextId = useMemo(() => Date.now().toString(), []);

  const cashBalance = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const columns = useMemo<Column<FetsTransaction>[]>(
    () => [
      {
        key: 'date',
        header: 'Date',
        accessor: (tx) => formatDate(tx.date),
      },
      {
        key: 'refId',
        header: 'Ref ID',
        accessor: (tx) => (
          <span className="font-bold text-money-green">
            {tx.custom_id || tx.id || '-'}
          </span>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        accessor: (tx) => (
          <Badge variant="default">{tx.category || 'Uncategorized'}</Badge>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (tx) => (
          <span className="max-w-[200px] truncate block">
            {tx.clean_description || tx.description}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        accessor: (tx) => (
          <span
            className={cn(
              'font-bold',
              tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
            )}
          >
            {tx.amount >= 0 ? '+' : ''}₹
            {Math.abs(tx.amount).toLocaleString()}
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
          <Wallet size={48} className="mx-auto text-text-muted" />
          <h2 className="text-xl font-semibold text-money-paper">
            Connection Required
          </h2>
          <p className="text-text-secondary">
            Please sign in to view the cash book.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Cash Book" />

      <div
        className="rounded-2xl p-6 border border-divider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, #0f2418 0%, #080f0c 100%)',
        }}
      >
        <div>
          <p className="text-sm text-text-secondary mb-1">Cash Balance</p>
          <p className="text-3xl font-bold text-money-gold">
            ₹{cashBalance.toLocaleString('en-IN')}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="default">
          <Plus size={16} className="mr-2" />
          New Transaction
        </Button>
      </div>

      <Card className="glass-panel">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={transactions || []}
            onEdit={(tx) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            onDelete={(tx) => {
              setDeletingTransaction(tx);
              setIsConfirmOpen(true);
            }}
            emptyMessage="No cash transactions yet"
            emptyIcon={<BookOpen size={32} className="text-text-muted" />}
          />
        </CardContent>
      </Card>

      <CashModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        categories={categories || []}
        nextId={nextId}
        location={location}
        onSave={(transaction) => {
          if (editingTransaction) {
            updateCashTransaction.mutate({
              id: editingTransaction.id!,
              updates: transaction,
            });
          } else {
            const { id, created_at, ...payload } = transaction;
            createCashTransaction.mutate(
              payload as Omit<FetsTransaction, 'id' | 'created_at'>
            );
          }
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Cash Transaction"
        message={`Are you sure you want to delete this transaction${
          deletingTransaction?.description
            ? `: "${deletingTransaction.description}"`
            : ''
        }? This action cannot be undone.`}
        onConfirm={() => {
          if (deletingTransaction?.id) {
            deleteCashTransaction.mutate(deletingTransaction.id);
          }
          setIsConfirmOpen(false);
          setDeletingTransaction(null);
        }}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingTransaction(null);
        }}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}
