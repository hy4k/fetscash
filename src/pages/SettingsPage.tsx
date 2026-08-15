import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import {
  useGlobalCounts,
  useInvoices,
  useCustomers,
  useExpenses,
  useCashTransactions,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { DataTable } from '@/components/data';
import { LoadingPage } from '@/components/error';
import { PageHeader } from '@/components/layout/PageHeader';
import { COMPANY_INFO } from '@/constants';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Users,
  Wallet,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();

  useGlobalCounts();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: cashTxns, isLoading: cashLoading } = useCashTransactions();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: products, isLoading: productsLoading } = useProducts();

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const location = useAppStore((s) => s.location);
  const setLocation = useAppStore((s) => s.setLocation);

  const [newCategory, setNewCategory] = useState('');
  const [productForm, setProductForm] = useState<ProductFormData | null>(null);

  const isLoading =
    isAuthLoading ||
    invoicesLoading ||
    customersLoading ||
    expensesLoading ||
    cashLoading ||
    categoriesLoading ||
    productsLoading;

  const totalIncome = useMemo(() => {
    if (!invoices) return 0;
    return invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [invoices]);

  const stats = useMemo(
    () => [
      {
        title: 'Total Income',
        value: formatCurrency(totalIncome, 'INR'),
        icon: TrendingUp,
        color: '#85bb65',
      },
      {
        title: 'Invoices',
        value: String(invoices?.length || 0),
        icon: FileText,
        color: '#d4af37',
      },
      {
        title: 'Clients',
        value: String(customers?.length || 0),
        icon: Users,
        color: '#3b82f6',
      },
      {
        title: 'Expenses',
        value: String(expenses?.length || 0),
        icon: CreditCard,
        color: '#ef4444',
      },
      {
        title: 'Cash Txns',
        value: String(cashTxns?.length || 0),
        icon: Wallet,
        color: '#a78bfa',
      },
    ],
    [totalIncome, invoices, customers, expenses, cashTxns]
  );

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    createCategory.mutate(newCategory.trim());
    setNewCategory('');
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategory.mutate(id);
  };

  const openAddProduct = () => {
    setProductForm({ name: '', description: '', price: '', stock: '', category: '' });
  };

  const openEditProduct = (product: any) => {
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: String(product.price || 0),
      stock: String(product.stock ?? 0),
      category: product.category || '',
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm) return;
    const payload = {
      name: productForm.name,
      description: productForm.description,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      category: productForm.category,
    };
    if (productForm.id) {
      updateProduct.mutate({ id: productForm.id, updates: payload });
    } else {
      createProduct.mutate(payload as any);
    }
    setProductForm(null);
  };

  const productColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (p: any) => p.name,
      },
      {
        key: 'description',
        header: 'Description',
        accessor: (p: any) => p.description || '-',
      },
      {
        key: 'price',
        header: 'Price',
        accessor: (p: any) => formatCurrency(p.price || 0, 'INR'),
        align: 'right' as const,
      },
      {
        key: 'stock',
        header: 'Stock',
        accessor: (p: any) => p.stock ?? 0,
        align: 'right' as const,
      },
      {
        key: 'category',
        header: 'Category',
        accessor: (p: any) => (
          <Badge variant="outline" className="border-divider text-text-secondary">
            {p.category || 'Uncategorized'}
          </Badge>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return (
      <div className="page-enter flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-money-gold">Connection Required</h2>
          <p className="text-text-secondary">Please sign in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-8">
      <PageHeader title="Settings" subtitle="Manage your business preferences" />

      <Card className="bg-surface border-divider">
        <CardHeader>
          <CardTitle className="text-money-gold">Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-text-secondary">
          <p className="font-semibold text-money-paper">{COMPANY_INFO.name}</p>
          <p>{COMPANY_INFO.gstNumber}</p>
          <p>{COMPANY_INFO.address}</p>
          {COMPANY_INFO.phone && <p>{COMPANY_INFO.phone}</p>}
          {COMPANY_INFO.email && <p>{COMPANY_INFO.email}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.title} className="glass-panel border-divider">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}30` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">
                  {s.title}
                </p>
                <p className="text-lg font-extrabold text-money-paper font-sans tracking-tight">
                  {s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-surface border-divider">
        <CardHeader>
          <CardTitle className="text-money-gold">Location</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {['Cochin', 'Calicut'].map((loc) => (
            <Button
              key={loc}
              variant={location === loc ? 'default' : 'outline'}
              className={cn(
                location === loc && 'bg-money-gold text-background hover:bg-money-gold/90',
                'border-divider'
              )}
              onClick={() => setLocation(loc as any)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              {loc}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface border-divider">
          <CardHeader>
            <CardTitle className="text-money-gold">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-background border-divider text-money-paper"
              />
              <Button type="submit" className="bg-money-gold text-background hover:bg-money-gold/90">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
            <div className="space-y-2">
              {(categories || []).map((cat: any) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-divider"
                >
                  <span className="text-sm text-money-paper">{cat.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-divider">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-money-gold">Products</CardTitle>
            <Button
              size="sm"
              className="bg-money-gold text-background hover:bg-money-gold/90"
              onClick={openAddProduct}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </CardHeader>
          <CardContent>
            {productForm && (
              <form onSubmit={handleSaveProduct} className="mb-4 space-y-2 p-4 bg-background border border-divider rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="bg-surface border-divider text-money-paper"
                  />
                  <Input
                    placeholder="Price"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="bg-surface border-divider text-money-paper"
                  />
                  <Input
                    placeholder="Stock"
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="bg-surface border-divider text-money-paper"
                  />
                  <Input
                    placeholder="Category"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="bg-surface border-divider text-money-paper"
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="bg-surface border-divider text-money-paper"
                />
                <div className="flex gap-2">
                  <Button type="submit" className="bg-money-gold text-background hover:bg-money-gold/90">
                    Save
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setProductForm(null)} className="border-divider">
                    Cancel
                  </Button>
                </div>
              </form>
            )}
            <DataTable
              columns={productColumns}
              data={products || []}
              onEdit={openEditProduct}
              onDelete={(p: any) => deleteProduct.mutate(p.id)}
              emptyMessage="No products found"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface border-divider">
        <CardHeader>
          <CardTitle className="text-money-gold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/invoices/new')}>
            <FileText className="w-4 h-4 mr-2" /> New Invoice
          </Button>
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/expenses/new')}>
            <CreditCard className="w-4 h-4 mr-2" /> Add Expense
          </Button>
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/customers/new')}>
            <Users className="w-4 h-4 mr-2" /> Add Client
          </Button>
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/cash')}>
            <Wallet className="w-4 h-4 mr-2" /> Cash Book
          </Button>
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/reports/revenue')}>
            <BarChart3 className="w-4 h-4 mr-2" /> Monthly Revenue
          </Button>
          <Button variant="outline" className="border-divider text-money-paper hover:bg-surface-elevated" onClick={() => navigate('/customers')}>
            <Users className="w-4 h-4 mr-2" /> Clients
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
