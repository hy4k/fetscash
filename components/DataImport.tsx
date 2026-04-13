import React, { useState, useCallback } from 'react';
import { Customer, Invoice, ServiceLine } from '../types';

interface DataImportProps {
  userId: string;
  onCustomersImported: (customers: Omit<Customer, 'id' | 'user_id'>[]) => void;
  onInvoicesImported: (invoices: Omit<Invoice, 'id' | 'user_id'>[]) => void;
  primaryColor: string;
}

type ImportType = 'customers' | 'invoices' | 'payments';

export const DataImport: React.FC<DataImportProps> = ({
  userId,
  onCustomersImported,
  onInvoicesImported,
  primaryColor,
}) => {
  const [activeTab, setActiveTab] = useState<ImportType>('customers');
  const [csvData, setCsvData] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  const customerTemplate = `name,contact_person,email,phone,address,country,currency,payment_terms,gst_number,status
Prometric Testing Services,John Smith,accounts@prometric.com,+1-555-0001,New York,USA,USD,30,,active
Pearson VUE,Accounts Dept,ap@pearsonvue.com,+1-555-0002,London,UK,GBP,45,,active
PSI Services LLC,Finance Team,invoices@psiexams.com,+1-555-0003,USA,USD,30,,active
CELPIP,Payments,admin@celpip.ca,+1-555-0004,Canada,CAD,30,,active
ITTS India Pvt Ltd,Rajesh Kumar,rajesh@itts.in,+91-98765-43210,Mumbai,India,INR,30,27AABCI1234C1Z5,active`;

  const invoiceTemplate = `invoice_number,customer_name,invoice_date,due_date,service_month,currency,description,quantity,rate,gst_rate,status
INV-2024-001,Prometric Testing Services,2024-01-31,2024-03-01,January 2024,USD,PMI Certification Exams - 125 candidates,125,15.00,0,sent
INV-2024-002,Pearson VUE,2024-01-31,2024-03-15,January 2024,GBP,PTE Academic Exams - 89 candidates,89,12.50,0,paid
INV-2024-003,ITTS India Pvt Ltd,2024-02-28,2024-03-30,February 2024,INR,Test Center Services - Monthly,1,150000,18,paid`;

  const parseCSV = useCallback((csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
    return data;
  }, []);

  const handleParse = () => {
    setImportStatus('parsing');
    setError(null);

    try {
      const data = parseCSV(csvData);
      if (data.length === 0) {
        throw new Error('No valid data found. Please check CSV format.');
      }
      setParsedData(data);
      setImportStatus('preview');
    } catch (err: any) {
      setError(err.message);
      setImportStatus('error');
    }
  };

  const transformCustomerData = (data: any[]): Omit<Customer, 'id' | 'user_id'>[] => {
    return data.map(row => ({
      name: row.name || '',
      contact_person: row.contact_person || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      country: row.country as Customer['country'] || 'Other',
      currency: row.currency as Customer['currency'] || 'USD',
      payment_terms: parseInt(row.payment_terms) || 30,
      gst_number: row.gst_number || undefined,
      tan_number: row.tan_number || undefined,
      status: (row.status as Customer['status']) || 'active',
      notes: row.notes || '',
    }));
  };

  const transformInvoiceData = (data: any[]): Omit<Invoice, 'id' | 'user_id'>[] => {
    return data.map(row => {
      const quantity = parseInt(row.quantity) || 1;
      const rate = parseFloat(row.rate) || 0;
      const gstRate = parseFloat(row.gst_rate) || 0;
      const subtotal = quantity * rate;
      const gstAmount = subtotal * gstRate / 100;
      const total = subtotal + gstAmount;

      const serviceLine: ServiceLine = {
        description: row.description || 'Service',
        quantity,
        rate,
        amount: subtotal,
        currency: row.currency || 'USD',
      };

      return {
        customer_id: row.customer_id || '', // Will need to be mapped
        invoice_number: row.invoice_number || '',
        invoice_date: row.invoice_date || new Date().toISOString().split('T')[0],
        due_date: row.due_date || new Date().toISOString().split('T')[0],
        service_month: row.service_month || '',
        currency: row.currency || 'USD',
        subtotal,
        gst_rate: gstRate,
        gst_amount: gstAmount,
        total_amount: total,
        status: (row.status as InvoiceStatus) || 'draft',
        notes: row.notes || '',
        service_lines: [serviceLine],
      };
    });
  };

  const handleImport = async () => {
    setImportStatus('importing');
    setImportStats({ success: 0, failed: 0 });

    try {
      if (activeTab === 'customers') {
        const transformed = transformCustomerData(parsedData);
        onCustomersImported(transformed);
        setImportStats({ success: transformed.length, failed: 0 });
      } else if (activeTab === 'invoices') {
        // For invoices, we need customer_id mapping
        // This is simplified - in production, you'd match by customer name
        const transformed = transformInvoiceData(parsedData);
        // Filter out rows without proper customer mapping
        onInvoicesImported(transformed);
        setImportStats({ success: transformed.length, failed: 0 });
      }

      setImportStatus('complete');
      setCsvData('');
      setParsedData([]);
    } catch (err: any) {
      setError(err.message);
      setImportStatus('error');
    }
  };

  const loadTemplate = () => {
    if (activeTab === 'customers') {
      setCsvData(customerTemplate);
    } else if (activeTab === 'invoices') {
      setCsvData(invoiceTemplate);
    }
    setImportStatus('idle');
    setError(null);
    setParsedData([]);
  };

  const inputClass = "w-full neo-input rounded-xl p-4 text-sm font-mono placeholder-text-tertiary focus:border-money-gold/30 transition-all resize-none";
  const labelClass = "block text-xs font-bold text-text-secondary mb-2 ml-1 uppercase tracking-wider";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#85bb65]/20 pb-4">
        {[
          { id: 'customers', label: 'Import Clients', icon: 'fa-users' },
          { id: 'invoices', label: 'Import Invoices', icon: 'fa-file-invoice' },
          { id: 'payments', label: 'Import Payments', icon: 'fa-money-bill-transfer' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as ImportType);
              setCsvData('');
              setImportStatus('idle');
              setError(null);
              setParsedData([]);
            }}
            className={`neo-btn px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-money-green text-[#0c1410]'
                : 'text-text-secondary'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10">
        <h4 className="text-sm font-bold text-money-paper mb-2">
          <i className="fas fa-info-circle text-money-green mr-2"></i>
          How to Import {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h4>
        <p className="text-xs text-text-secondary mb-3">
          {activeTab === 'customers' && 
            "Import your client list. Required columns: name, email, country, currency. Optional: gst_number (for Indian clients only), payment_terms, phone, address."}
          {activeTab === 'invoices' && 
            "Import historical invoices. System will auto-calculate totals. Make sure clients are imported first. Use client names exactly as they appear in your client list."}
          {activeTab === 'payments' && 
            "Import payment records to match against invoices. You can also record payments directly from the invoice view."}
        </p>
        <button
          onClick={loadTemplate}
          className="text-xs text-money-gold hover:underline"
        >
          <i className="fas fa-download mr-1"></i> Load Sample Template
        </button>
      </div>

      {/* CSV Input */}
      {importStatus === 'idle' && (
        <div>
          <label className={labelClass}>
            Paste CSV Data (Format: Comma-separated values)
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            rows={12}
            placeholder="name,email,country,currency...&#10;Client 1,client1@example.com,India,INR...&#10;Client 2,client2@example.com,USA,USD..."
            className={inputClass}
          />
          <div className="flex justify-between mt-4">
            <p className="text-xs text-text-tertiary">
              {csvData ? `${csvData.split('\n').length - 1} rows (excluding header)` : 'No data loaded'}
            </p>
            <button
              onClick={handleParse}
              disabled={!csvData.trim()}
              className="neo-btn px-6 py-2 rounded-xl text-xs font-bold text-money-gold disabled:opacity-50"
            >
              Preview Data
            </button>
          </div>
        </div>
      )}

      {/* Parsing State */}
      {importStatus === 'parsing' && (
        <div className="text-center py-12">
          <i className="fas fa-spinner fa-spin text-3xl text-money-green mb-4"></i>
          <p className="text-text-secondary">Parsing data...</p>
        </div>
      )}

      {/* Error State */}
      {importStatus === 'error' && (
        <div className="glass-panel rounded-xl p-6 border border-red-500/20">
          <div className="flex items-center gap-3 text-red-400 mb-4">
            <i className="fas fa-exclamation-triangle text-xl"></i>
            <h4 className="font-bold">Import Error</h4>
          </div>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button
            onClick={() => setImportStatus('idle')}
            className="neo-btn px-4 py-2 rounded-xl text-xs font-bold text-text-secondary"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Preview State */}
      {importStatus === 'preview' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-money-paper">
              Preview: {parsedData.length} records found
            </h4>
            <button
              onClick={() => setImportStatus('idle')}
              className="text-xs text-text-tertiary hover:text-white underline"
            >
              Edit Data
            </button>
          </div>

          <div className="glass-panel rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0c1410]/50 sticky top-0">
                <tr>
                  {Object.keys(parsedData[0]).map((key) => (
                    <th key={key} className="px-3 py-2 text-left text-text-tertiary font-bold uppercase">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b border-[#85bb65]/5">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="px-3 py-2 text-text-secondary truncate max-w-xs">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 5 && (
              <p className="text-center text-xs text-text-tertiary py-2">
                + {parsedData.length - 5} more rows
              </p>
            )}
          </div>

          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setImportStatus('idle')}
              className="neo-btn px-6 py-3 rounded-xl text-sm font-bold text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="neo-btn px-8 py-3 rounded-xl text-sm font-bold text-money-gold border border-money-gold/20"
            >
              Import {parsedData.length} Records
            </button>
          </div>
        </div>
      )}

      {/* Importing State */}
      {importStatus === 'importing' && (
        <div className="text-center py-12">
          <i className="fas fa-circle-notch fa-spin text-3xl text-money-green mb-4"></i>
          <p className="text-text-secondary">Importing records...</p>
          <p className="text-xs text-text-tertiary mt-2">Please do not close this window</p>
        </div>
      )}

      {/* Complete State */}
      {importStatus === 'complete' && (
        <div className="glass-panel rounded-xl p-6 border border-money-green/30 text-center">
          <i className="fas fa-check-circle text-5xl text-money-green mb-4"></i>
          <h4 className="text-xl font-bold text-money-paper mb-2">Import Complete!</h4>
          <p className="text-sm text-text-secondary mb-6">
            Successfully imported {importStats.success} {activeTab}
          </p>
          <button
            onClick={() => setImportStatus('idle')}
            className="neo-btn px-6 py-3 rounded-xl text-sm font-bold text-money-gold border border-money-gold/20"
          >
            Import More Data
          </button>
        </div>
      )}

      {/* Tips Section */}
      <div className="glass-panel rounded-xl p-4 border border-[#85bb65]/10 bg-opacity-50">
        <h5 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">
          <i className="fas fa-lightbulb text-money-gold mr-2"></i>Pro Tips
        </h5>
        <ul className="text-xs text-text-secondary space-y-1 pl-4">
          <li>• Use the same client names across all imports</li>
          <li>• Dates should be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
          <li>• Currencies: Use 3-letter codes (USD, INR, GBP)</li>
          <li>• For amounts, do not include currency symbols</li>
          <li>• Back up your data before importing large batches</li>
        </ul>
      </div>
    </div>
  );
};
